#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# EmptyTruck — VPS Provisioning Script
# Tested on Ubuntu 22.04 LTS
# Run as root: curl -sL https://raw.githubusercontent.com/.../provision.sh | bash
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"; }
step() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}\n"; }

DEPLOY_USER="${DEPLOY_USER:-deployer}"
DEPLOY_DIR="/opt/emptytruck"
GITHUB_REPO="${GITHUB_REPO:-your-org/emptytruck}"

step "System Update"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw fail2ban htop unzip logrotate
ok "System updated"

step "Docker Installation"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | bash
  systemctl enable docker
  systemctl start docker
fi
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

step "Docker Compose Plugin"
apt-get install -y -qq docker-compose-plugin
ok "Docker Compose $(docker compose version --short)"

step "Deploy User"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  mkdir -p "/home/${DEPLOY_USER}/.ssh"
  # Copy authorized_keys from root
  cp ~/.ssh/authorized_keys "/home/${DEPLOY_USER}/.ssh/" 2>/dev/null || true
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  chmod 700 "/home/${DEPLOY_USER}/.ssh"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  ok "User $DEPLOY_USER created"
else
  ok "User $DEPLOY_USER already exists"
fi

step "App Directory"
mkdir -p "$DEPLOY_DIR" "/opt/backups/emptytruck"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DEPLOY_DIR" "/opt/backups"
ok "Directories created"

step "Firewall (UFW)"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall configured"

step "Fail2Ban"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable fail2ban
systemctl restart fail2ban
ok "Fail2Ban configured"

step "Log Rotation"
cat > /etc/logrotate.d/emptytruck << 'EOF'
/var/log/docker/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
}
EOF
ok "Log rotation configured"

step "Swap File (2GB)"
if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Tune swappiness for server workloads
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  sysctl -p
  ok "2GB swap configured"
else
  ok "Swap already configured"
fi

step "System Limits"
cat >> /etc/sysctl.conf << 'EOF'
# Network performance
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
# File descriptors
fs.file-max = 2097152
EOF
sysctl -p

cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF
ok "System limits tuned"

step "Clone Repository"
sudo -u "$DEPLOY_USER" git clone "https://github.com/${GITHUB_REPO}.git" "$DEPLOY_DIR" 2>/dev/null || {
  log "Repo already cloned, pulling latest..."
  sudo -u "$DEPLOY_USER" bash -c "cd $DEPLOY_DIR && git pull"
}
ok "Repository ready"

step "Systemd Service"
cat > /etc/systemd/system/emptytruck.service << EOF
[Unit]
Description=EmptyTruck Connect Application
Requires=docker.service
After=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${DEPLOY_DIR}
User=${DEPLOY_USER}
Group=docker
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable emptytruck
ok "Systemd service registered"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗"
echo -e "║  🖥️  SERVER PROVISIONED SUCCESSFULLY!    ║"
echo -e "╠══════════════════════════════════════════╣"
echo -e "║${NC}  Server IP:   $(curl -s ifconfig.me 2>/dev/null || echo 'unknown')${GREEN}${BOLD}"
echo -e "║  Deploy user: $DEPLOY_USER"
echo -e "║  App dir:     $DEPLOY_DIR"
echo -e "╠══════════════════════════════════════════╣"
echo -e "║  NEXT STEPS:                             ║"
echo -e "║  1. cp .env.production $DEPLOY_DIR/.env  ║"
echo -e "║  2. Fill in all required secrets         ║"
echo -e "║  3. ./scripts/deploy.sh                  ║"
echo -e "╚══════════════════════════════════════════╝${NC}"
