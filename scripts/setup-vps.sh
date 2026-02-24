#!/bin/bash
# EmptyTruck Connect — VPS Setup & Deployment Script
# Run as root on a fresh Ubuntu 22.04 server
# Usage: curl -fsSL https://raw.githubusercontent.com/your-org/emptytruck/main/scripts/setup-vps.sh | bash

set -euo pipefail

# ─── COLORS ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
DOMAIN="${DOMAIN:-emptytruck.in}"
APP_USER="${APP_USER:-emptytruck}"
APP_DIR="/opt/emptytruck"
REPO_URL="${REPO_URL:-https://github.com/your-org/emptytruck.git}"
EMAIL="${EMAIL:-admin@emptytruck.in}"

section "EmptyTruck VPS Setup"
echo "Domain:  $DOMAIN"
echo "User:    $APP_USER"
echo "Dir:     $APP_DIR"
echo ""

# ─── 1. SYSTEM UPDATE ─────────────────────────────────────────────────────────
section "1. System Update"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl wget git unzip jq htop ufw fail2ban
log "System updated"

# ─── 2. FIREWALL ──────────────────────────────────────────────────────────────
section "2. Firewall Setup"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
log "UFW firewall configured (SSH + HTTP + HTTPS)"

# ─── 3. FAIL2BAN ──────────────────────────────────────────────────────────────
section "3. Fail2Ban (Brute Force Protection)"
cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
action   = iptables-multiport[name=ReqLimit, port="http,https"]
logpath  = /var/log/nginx/error.log
findtime = 600
bantime  = 7200
maxretry = 10
F2B
systemctl enable fail2ban && systemctl restart fail2ban
log "Fail2Ban configured"

# ─── 4. APP USER ──────────────────────────────────────────────────────────────
section "4. App User"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  usermod -aG sudo "$APP_USER"
  log "Created user: $APP_USER"
else
  log "User $APP_USER already exists"
fi

# ─── 5. DOCKER ────────────────────────────────────────────────────────────────
section "5. Docker & Docker Compose"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$APP_USER"
  systemctl enable docker && systemctl start docker
  log "Docker installed"
else
  log "Docker already installed: $(docker --version)"
fi

# ─── 6. DEPLOY DIRECTORY ──────────────────────────────────────────────────────
section "6. App Directory"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Clone or pull repo
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
  log "Repository cloned"
else
  sudo -u "$APP_USER" git -C "$APP_DIR" pull origin main
  log "Repository updated"
fi

# ─── 7. ENVIRONMENT FILE ──────────────────────────────────────────────────────
section "7. Environment Configuration"
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  warn "Created .env from template — YOU MUST EDIT $APP_DIR/.env before continuing!"

  # Generate secure secrets automatically
  JWT_SECRET=$(openssl rand -hex 32)
  MONGO_ROOT_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
  REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)
  MONGO_APP_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 20)

  sed -i "s/your_super_secret_jwt_key_here_min_32_chars/$JWT_SECRET/" "$APP_DIR/.env"
  sed -i "s/NODE_ENV=development/NODE_ENV=production/" "$APP_DIR/.env"
  sed -i "s|CLIENT_URL=http://localhost:3000|CLIENT_URL=https://$DOMAIN|" "$APP_DIR/.env"

  # Write generated secrets to a safe file
  cat > /root/emptytruck-secrets.txt << SECRETS
EmptyTruck Generated Secrets — KEEP SAFE, DELETE AFTER SAVING
Generated: $(date)

MONGO_ROOT_PASS=$MONGO_ROOT_PASS
REDIS_PASSWORD=$REDIS_PASSWORD
MONGO_APP_PASSWORD=$MONGO_APP_PASSWORD
JWT_SECRET=$JWT_SECRET

Add these to $APP_DIR/.env
SECRETS
  chmod 600 /root/emptytruck-secrets.txt
  log "Secrets generated → /root/emptytruck-secrets.txt"
else
  log ".env file already exists"
fi

# ─── 8. SSL CERTIFICATE ───────────────────────────────────────────────────────
section "8. SSL Certificate (Let's Encrypt)"
mkdir -p "$APP_DIR/nginx/certbot/conf" "$APP_DIR/nginx/certbot/www"

# First, start nginx in HTTP-only mode to get the cert
cat > /tmp/nginx-certbot.conf << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / { return 200 'OK'; }
}
NGINXCONF

# Run certbot
if [ ! -f "$APP_DIR/nginx/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
  docker run --rm \
    -v "$APP_DIR/nginx/certbot/conf:/etc/letsencrypt" \
    -v "$APP_DIR/nginx/certbot/www:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN" && log "SSL certificate obtained for $DOMAIN"
else
  log "SSL certificate already exists"
fi

# ─── 9. SYSTEMD SERVICE ───────────────────────────────────────────────────────
section "9. Systemd Service"
cat > /etc/systemd/system/emptytruck.service << SERVICE
[Unit]
Description=EmptyTruck Connect Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300
User=$APP_USER
Group=$APP_USER

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable emptytruck
log "Systemd service configured (auto-starts on boot)"

# ─── 10. DEPLOYMENT ──────────────────────────────────────────────────────────
section "10. Initial Deployment"
cd "$APP_DIR"
sudo -u "$APP_USER" docker compose pull 2>/dev/null || true
sudo -u "$APP_USER" docker compose build
sudo -u "$APP_USER" docker compose up -d

log "Containers started"

# ─── 11. SEED DATABASE ───────────────────────────────────────────────────────
section "11. Seed Database"
sleep 15  # Wait for DB to be ready
sudo -u "$APP_USER" docker compose exec -T backend node src/utils/seed.js && log "Database seeded" || warn "Seed failed — run manually later"

# ─── 12. HEALTH CHECK ────────────────────────────────────────────────────────
section "12. Health Check"
sleep 10
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "API health check passed (HTTP 200)"
else
  warn "API health check returned HTTP $HTTP_CODE — check logs with: docker compose logs backend"
fi

# ─── DEPLOY HELPER SCRIPT ────────────────────────────────────────────────────
cat > /usr/local/bin/emptytruck-deploy << 'DEPLOY'
#!/bin/bash
set -e
APP_DIR="/opt/emptytruck"
echo "🚀 Deploying EmptyTruck..."
cd "$APP_DIR"
git pull origin main
docker compose build --no-cache backend frontend
docker compose up -d --no-deps backend
sleep 5
docker compose up -d --no-deps frontend nginx
docker image prune -f
echo "✅ Deploy complete!"
curl -s http://localhost/api/health | python3 -m json.tool
DEPLOY
chmod +x /usr/local/bin/emptytruck-deploy

# ─── BACKUP SCRIPT ────────────────────────────────────────────────────────────
cat > /usr/local/bin/emptytruck-backup << 'BACKUP'
#!/bin/bash
set -e
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/emptytruck"
mkdir -p "$BACKUP_DIR"

echo "💾 Backing up MongoDB..."
docker compose -f /opt/emptytruck/docker-compose.yml exec -T mongo \
  mongodump --authenticationDatabase admin \
  --username "${MONGO_ROOT_USER:-admin}" \
  --password "${MONGO_ROOT_PASS}" \
  --db emptytruck \
  --archive | gzip > "$BACKUP_DIR/mongo_$DATE.gz"

echo "✅ Backup saved: $BACKUP_DIR/mongo_$DATE.gz"

# Keep last 7 backups
ls -tp "$BACKUP_DIR"/*.gz | grep -v '/$' | tail -n +8 | xargs -I {} rm -- {} 2>/dev/null || true
echo "🗑️  Old backups cleaned up"
BACKUP
chmod +x /usr/local/bin/emptytruck-backup

# Daily backup cron
echo "0 2 * * * root /usr/local/bin/emptytruck-backup >> /var/log/emptytruck-backup.log 2>&1" > /etc/cron.d/emptytruck-backup
log "Daily backup cron installed (2 AM)"

# ─── DONE ────────────────────────────────────────────────────────────────────
section "✅ Setup Complete!"
echo ""
echo "  🌐 App:     https://$DOMAIN"
echo "  📡 API:     https://api.$DOMAIN/api/health"
echo "  📁 App dir: $APP_DIR"
echo ""
echo "  Next steps:"
echo "  1. Edit $APP_DIR/.env with your API keys"
echo "  2. Run: emptytruck-deploy"
echo "  3. Check logs: docker compose -f $APP_DIR/docker-compose.yml logs -f"
echo ""
echo "  Useful commands:"
echo "  emptytruck-deploy   — pull + rebuild + rolling deploy"
echo "  emptytruck-backup   — backup MongoDB"
echo "  docker compose logs — view all logs"
echo ""
