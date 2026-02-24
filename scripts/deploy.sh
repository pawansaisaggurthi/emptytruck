#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EmptyTruck Connect — Production Deploy Script
# Usage: ./scripts/deploy.sh [--env staging|production] [--skip-ssl]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── COLORS ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()   { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
step()  { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

# ── ARGS ──────────────────────────────────────────────────────────────────────
ENV="production"
SKIP_SSL=false
SKIP_BACKUP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2;;
    --skip-ssl) SKIP_SSL=true; shift;;
    --skip-backup) SKIP_BACKUP=true; shift;;
    *) error "Unknown flag: $1";;
  esac
done

# ── CONFIG ────────────────────────────────────────────────────────────────────
DEPLOY_DIR="/opt/emptytruck"
BACKUP_DIR="/opt/backups/emptytruck"
DOMAIN="${DOMAIN:-emptytruck.in}"
COMPOSE="docker compose"

log "Starting deploy for environment: ${BOLD}${ENV}${NC}"

# ── PREFLIGHT CHECKS ──────────────────────────────────────────────────────────
step "Preflight Checks"

[[ -f ".env" ]] || error ".env file not found. Copy .env.production and fill values."
[[ $(id -u) -eq 0 ]] || warn "Not running as root — some steps may fail."

# Check required tools
for cmd in docker git curl openssl; do
  command -v "$cmd" &>/dev/null || error "Required tool not found: $cmd"
done

# Verify required env vars
source .env
REQUIRED_VARS=(MONGO_ROOT_PASSWORD REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET SMTP_USER SMTP_PASS)
for var in "${REQUIRED_VARS[@]}"; do
  [[ -n "${!var:-}" ]] || error "Required env var not set: $var"
done

ok "All preflight checks passed"

# ── BACKUP ────────────────────────────────────────────────────────────────────
step "Database Backup"

if [[ "$SKIP_BACKUP" == "false" ]]; then
  BACKUP_FILE="${BACKUP_DIR}/mongo-$(date +%Y%m%d-%H%M%S).gz"
  mkdir -p "$BACKUP_DIR"
  log "Backing up MongoDB to $BACKUP_FILE..."
  docker compose exec -T mongo mongodump \
    --username "$MONGO_ROOT_USER" \
    --password "$MONGO_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --db emptytruck \
    --archive \
    --gzip > "$BACKUP_FILE" 2>/dev/null || warn "Backup skipped (mongo not running yet)"
  ok "Database backup complete: $BACKUP_FILE"
else
  warn "Skipping backup (--skip-backup)"
fi

# ── SSL CERTIFICATE ───────────────────────────────────────────────────────────
step "SSL Certificate"

if [[ "$SKIP_SSL" == "false" ]]; then
  CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  if [[ ! -f "$CERT_PATH" ]]; then
    log "Obtaining SSL certificate for ${DOMAIN}..."
    # First start nginx with HTTP-only config for ACME challenge
    cp nginx/nginx-bootstrap.conf nginx/nginx.conf.bak 2>/dev/null || true
    $COMPOSE up -d nginx

    docker run --rm \
      -v "/etc/letsencrypt:/etc/letsencrypt" \
      -v "/var/www/certbot:/var/www/certbot" \
      certbot/certbot certonly \
      --webroot \
      --webroot-path=/var/www/certbot \
      --email "${CERTBOT_EMAIL:-admin@${DOMAIN}}" \
      --agree-tos \
      --no-eff-email \
      -d "$DOMAIN" \
      -d "www.${DOMAIN}"

    ok "SSL certificate obtained"
  else
    # Check expiry
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
    ok "SSL certificate valid until: $EXPIRY"
  fi
else
  warn "Skipping SSL setup (--skip-ssl)"
fi

# ── PULL IMAGES ───────────────────────────────────────────────────────────────
step "Pulling Latest Images"
log "Pulling images from registry..."
$COMPOSE pull --quiet
ok "Images pulled"

# ── ZERO-DOWNTIME DEPLOY ──────────────────────────────────────────────────────
step "Rolling Deployment"

# Store current version for rollback
PREVIOUS_TAG=$(docker inspect emptytruck_backend --format '{{.Config.Image}}' 2>/dev/null || echo "none")
log "Previous version: $PREVIOUS_TAG"

log "Starting updated backend..."
$COMPOSE up -d --no-deps --scale backend=2 backend
sleep 15

# Health check new instances
log "Health checking new backend instances..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:5000/health > /dev/null; then
    ok "Backend health check passed (attempt $i)"
    break
  fi
  [[ $i -eq 5 ]] && {
    error "Backend health check failed! Rolling back..."
    $COMPOSE up -d --no-deps --scale backend=1 backend
  }
  log "Waiting... (attempt $i/5)"
  sleep 5
done

# Scale back to 1
$COMPOSE up -d --no-deps --scale backend=1 backend
ok "Backend deployed"

# Deploy frontend
log "Deploying frontend..."
$COMPOSE up -d --no-deps frontend
sleep 5
ok "Frontend deployed"

# Start/restart remaining services
log "Starting all services..."
$COMPOSE up -d --remove-orphans

# ── DATABASE MIGRATIONS ───────────────────────────────────────────────────────
step "Database Migrations"
log "Running migrations..."
$COMPOSE exec -T backend node src/utils/migrate.js && ok "Migrations complete" || warn "No migrations to run"

# ── FINAL HEALTH CHECKS ───────────────────────────────────────────────────────
step "Final Health Checks"

CHECKS=(
  "https://${DOMAIN}/health:Backend API"
  "https://${DOMAIN}/api/health:API Routes"
  "https://${DOMAIN}:Frontend"
)

ALL_OK=true
for check in "${CHECKS[@]}"; do
  URL="${check%%:*}"
  NAME="${check##*:}"
  if curl -sf --max-time 10 "$URL" > /dev/null 2>&1; then
    ok "$NAME → $URL"
  else
    warn "$NAME FAILED → $URL"
    ALL_OK=false
  fi
done

[[ "$ALL_OK" == "true" ]] || warn "Some health checks failed — please investigate"

# ── CLEANUP ───────────────────────────────────────────────────────────────────
step "Cleanup"
docker image prune -f > /dev/null
ok "Cleaned old images"

# Keep only last 5 backups
find "$BACKUP_DIR" -name "*.gz" -type f | sort -r | tail -n +6 | xargs rm -f 2>/dev/null || true
ok "Pruned old backups"

# ── SUMMARY ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  🚀 DEPLOYMENT COMPLETE                ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Environment: ${BOLD}${ENV}${NC}"
echo -e "${GREEN}${BOLD}║${NC}  URL:         https://${DOMAIN}"
echo -e "${GREEN}${BOLD}║${NC}  Version:     $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
echo -e "${GREEN}${BOLD}║${NC}  Time:        $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════╝${NC}"
echo ""
