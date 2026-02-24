#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — Full backup of MongoDB + uploads to S3/local
# Schedule with: crontab -e → 0 2 * * * /opt/emptytruck/scripts/backup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

source /opt/emptytruck/.env

BACKUP_DIR="/opt/backups/emptytruck"
DATE=$(date +%Y%m%d-%H%M%S)
MONGO_FILE="${BACKUP_DIR}/mongo-${DATE}.gz"
UPLOADS_FILE="${BACKUP_DIR}/uploads-${DATE}.tar.gz"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# ── MONGODB ───────────────────────────────────────────────────────────────────
echo "Backing up MongoDB..."
docker compose -f /opt/emptytruck/docker-compose.yml exec -T mongo \
  mongodump \
  --username "$MONGO_ROOT_USER" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db emptytruck \
  --archive \
  --gzip > "$MONGO_FILE"

echo "✅ MongoDB: $MONGO_FILE ($(du -sh "$MONGO_FILE" | cut -f1))"

# ── UPLOADS ───────────────────────────────────────────────────────────────────
echo "Backing up uploads volume..."
docker run --rm \
  -v emptytruck_uploads_data:/data \
  -v "${BACKUP_DIR}:/backup" \
  alpine tar czf "/backup/uploads-${DATE}.tar.gz" -C /data .

echo "✅ Uploads: $UPLOADS_FILE ($(du -sh "$UPLOADS_FILE" | cut -f1))"

# ── S3 UPLOAD (optional) ─────────────────────────────────────────────────────
if [[ -n "${AWS_S3_BUCKET:-}" ]]; then
  echo "Uploading to S3: s3://${AWS_S3_BUCKET}/backups/"
  aws s3 cp "$MONGO_FILE" "s3://${AWS_S3_BUCKET}/backups/"
  aws s3 cp "$UPLOADS_FILE" "s3://${AWS_S3_BUCKET}/backups/"
  echo "✅ Uploaded to S3"
fi

# ── CLEANUP OLD BACKUPS ────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name "*.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "✅ Cleaned up backups older than ${RETENTION_DAYS} days"

echo "[$(date)] Backup complete"
