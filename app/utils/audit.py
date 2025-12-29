"""
Security audit logging
"""
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

logger = logging.getLogger("security_audit")


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


def log_security_event(
    event_type: SecurityEventType,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
):
    """
    Log a security event.
    
    Args:
        event_type: Type of security event
        user_id: ID of user involved
        user_email: Email of user involved
        ip_address: IP address of request
        details: Additional details about the event
        success: Whether the action succeeded
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type.value,
        "user_id": user_id,
        "user_email": user_email,
        "ip_address": ip_address,
        "success": success,
        "details": details or {}
    }
    
    # Log at appropriate level
    if not success or event_type in [
        SecurityEventType.LOGIN_FAILED,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        SecurityEventType.SUSPICIOUS_ACTIVITY
    ]:
        logger.warning(f"SECURITY_EVENT: {event_type.value}", extra=log_entry)
    else:
        logger.info(f"SECURITY_EVENT: {event_type.value}", extra=log_entry)