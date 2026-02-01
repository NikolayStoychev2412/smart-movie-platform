"""
Security audit logging with persistent storage.

Events are:
1. Logged to Python logger (for server output / log aggregators)
2. Appended to a JSON-lines file (for the admin audit-log endpoint)

The file backend is intentionally simple — no DB dependency, no migrations.
Each line is a self-contained JSON object.  get_recent_events() reads from
the tail of the file so it's fast even with thousands of entries.
"""
import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from pathlib import Path

logger = logging.getLogger("security_audit")

# Where audit events are persisted.
# Default: data/audit_log.jsonl (relative to app root / CWD).
# Override with AUDIT_LOG_PATH env var.
AUDIT_LOG_PATH = os.environ.get(
    "AUDIT_LOG_PATH",
    os.path.join(os.getcwd(), "data", "audit_log.jsonl")
)


class SecurityEventType(str, Enum):
    """Types of security events to log"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    USER_CREATED = "user_created"
    USER_DELETED = "user_deleted"
    ADMIN_PROMOTED = "admin_promoted"
    PASSWORD_CHANGED = "password_changed"
    MOVIE_CREATED = "movie_created"
    MOVIE_DELETED = "movie_deleted"
    REVIEW_DELETED = "review_deleted"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ADMIN_ACTION = "admin_action"


def _ensure_log_dir():
    """Create the parent directory for the audit log file if it doesn't exist."""
    directory = os.path.dirname(AUDIT_LOG_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)


def log_security_event(
    event_type: SecurityEventType,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
):
    """
    Log a security event to both the Python logger and the audit file.

    Args:
        event_type: Type of security event
        user_id: ID of user who performed the action
        user_email: Email of user who performed the action
        ip_address: IP address of the request
        details: Additional context (action-specific)
        success: Whether the action succeeded
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": event_type.value,
        "user_id": user_id,
        "user_email": user_email,
        "ip_address": ip_address,
        "success": success,
        "details": details or {}
    }

    # 1. Python logger (server output)
    if not success or event_type in [
        SecurityEventType.LOGIN_FAILED,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventType.SUSPICIOUS_ACTIVITY,
    ]:
        logger.warning(f"SECURITY_EVENT: {event_type.value}", extra=log_entry)
    else:
        logger.info(f"SECURITY_EVENT: {event_type.value}", extra=log_entry)

    # 2. Persistent file (JSON lines)
    try:
        _ensure_log_dir()
        with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False, default=str) + "\n")
    except Exception as e:
        logger.error(f"Failed to write audit log to file: {e}")


def get_recent_events(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Read the most recent audit events from the log file.
    Returns newest-first, up to `limit` entries.

    Uses a tail-read approach: reads the last N lines instead of
    parsing the entire file, so it stays fast as the log grows.
    """
    if not os.path.exists(AUDIT_LOG_PATH):
        return []

    try:
        events = []

        # Read last `limit` lines efficiently
        with open(AUDIT_LOG_PATH, "rb") as f:
            # Seek to end
            f.seek(0, 2)
            file_size = f.tell()

            if file_size == 0:
                return []

            # Read chunks from the end until we have enough lines
            lines = []
            chunk_size = min(8192, file_size)
            pos = file_size

            while len(lines) <= limit and pos > 0:
                read_size = min(chunk_size, pos)
                pos -= read_size
                f.seek(pos)
                chunk = f.read(read_size)
                chunk_lines = chunk.split(b"\n")

                if lines:
                    # Merge the last partial line from previous chunk
                    chunk_lines[-1] += lines[0]
                    lines = chunk_lines + lines[1:]
                else:
                    lines = chunk_lines

            # Parse the last `limit` non-empty lines
            for raw_line in lines[-(limit + 5):]:  # slight buffer for safety
                line = raw_line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                    events.append(event)
                except json.JSONDecodeError:
                    continue

        # Return newest-first, capped at limit
        return events[-limit:][::-1]

    except Exception as e:
        logger.error(f"Failed to read audit log: {e}")
        return []