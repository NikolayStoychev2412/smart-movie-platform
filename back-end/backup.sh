#!/usr/bin/env bash
# Daily PostgreSQL backup — keeps last 7 days.
#
# Add to crontab (runs at 03:00 every night):
#   0 3 * * * /opt/moviemaze/backup.sh >> /opt/moviemaze/backups/backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/opt/moviemaze/backups"
COMPOSE_DIR="/opt/moviemaze"
FILENAME="moviemaze_$(date +%Y%m%d_%H%M%S).sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup → $FILENAME"

docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U moviemaze moviemaze | gzip > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] Backup saved: $BACKUP_DIR/$FILENAME"

# Remove backups older than 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "[$(date)] Old backups pruned. Done."
