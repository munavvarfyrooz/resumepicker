#!/bin/bash

# ResumePicker Nginx and SSL Setup Script
# This script sets up Nginx configuration and SSL certificates for resumepicker.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="resumepicker.com"
WWW_DOMAIN="www.resumepicker.com"
EMAIL="admin@resumepicker.com"  # Change this to your email
NGINX_CONF="/etc/nginx/sites-available/resumepicker"
NGINX_ENABLED="/etc/nginx/sites-enabled/resumepicker"
APP_DIR="/home/ubuntu/resumepicker/TaskTrackerPro"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ResumePicker Nginx & SSL Setup${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run this script with sudo${NC}"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Install required packages
echo -e "\n${YELLOW}Step 1: Installing required packages...${NC}"
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

# Step 2: Check if Nginx is installed
if ! command_exists nginx; then
    echo -e "${RED}Nginx installation failed${NC}"
    exit 1
fi

# Step 3: Stop Nginx temporarily
echo -e "\n${YELLOW}Step 2: Configuring Nginx...${NC}"
systemctl stop nginx 2>/dev/null || true

# Step 4: Copy Nginx configuration
echo -e "${YELLOW}Copying Nginx configuration...${NC}"
cp $APP_DIR/nginx/resumepicker.conf $NGINX_CONF

# Update email in the config if needed
read -p "Enter your email for SSL certificates (default: admin@resumepicker.com): " USER_EMAIL
USER_EMAIL=${USER_EMAIL:-admin@resumepicker.com}

# Step 5: Create symbolic link
echo -e "${YELLOW}Enabling site configuration...${NC}"
ln -sf $NGINX_CONF $NGINX_ENABLED

# Step 6: Remove default Nginx site if exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Step 7: Create certbot webroot directory
echo -e "${YELLOW}Creating certbot directories...${NC}"
mkdir -p /var/www/certbot

# Step 8: Test Nginx configuration
echo -e "\n${YELLOW}Step 3: Testing Nginx configuration...${NC}"
nginx -t

# Step 9: Start Nginx
echo -e "${YELLOW}Starting Nginx...${NC}"
systemctl start nginx
systemctl enable nginx

# Step 10: Obtain SSL certificates
echo -e "\n${YELLOW}Step 4: Obtaining SSL certificates...${NC}"
echo -e "${YELLOW}Make sure your domain points to this server's IP address!${NC}"
read -p "Is your domain $DOMAIN pointing to this server? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Get certificates for both domain and www subdomain
    certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email $USER_EMAIL --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}SSL certificates obtained successfully!${NC}"
    else
        echo -e "${RED}Failed to obtain SSL certificates${NC}"
        echo -e "${YELLOW}You can try again later with: sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN${NC}"
    fi
else
    echo -e "${YELLOW}Skipping SSL certificate generation${NC}"
    echo -e "${YELLOW}You can run this later with: sudo certbot --nginx -d $DOMAIN -d $WWW_DOMAIN${NC}"
fi

# Step 11: Set up auto-renewal
echo -e "\n${YELLOW}Step 5: Setting up SSL auto-renewal...${NC}"
# Test renewal
certbot renew --dry-run

# Add cron job for auto-renewal if it doesn't exist
CRON_JOB="0 0,12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -q "$CRON_JOB") || (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Step 12: Configure firewall
echo -e "\n${YELLOW}Step 6: Configuring firewall...${NC}"
if command_exists ufw; then
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not installed, skipping firewall configuration${NC}"
fi

# Step 13: Create systemd service for Node.js app
echo -e "\n${YELLOW}Step 7: Creating systemd service for Node.js app...${NC}"
cat > /etc/systemd/system/resumepicker.service << EOF
[Unit]
Description=ResumePicker Node.js Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/resumepicker/app.log
StandardError=append:/var/log/resumepicker/error.log
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
mkdir -p /var/log/resumepicker
chown ubuntu:ubuntu /var/log/resumepicker

# Enable and start the service
systemctl daemon-reload
systemctl enable resumepicker.service
systemctl restart resumepicker.service

# Step 14: Check service status
echo -e "\n${YELLOW}Step 8: Checking service status...${NC}"
systemctl status resumepicker.service --no-pager

# Step 15: Reload Nginx with final configuration
echo -e "\n${YELLOW}Step 9: Reloading Nginx...${NC}"
nginx -t && systemctl reload nginx

# Step 16: Display summary
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "\n${GREEN}Your ResumePicker app should now be accessible at:${NC}"
echo -e "  - https://$DOMAIN"
echo -e "  - https://$WWW_DOMAIN"
echo -e "\n${GREEN}Services Status:${NC}"
systemctl is-active nginx >/dev/null 2>&1 && echo -e "  - Nginx: ${GREEN}Active${NC}" || echo -e "  - Nginx: ${RED}Inactive${NC}"
systemctl is-active resumepicker >/dev/null 2>&1 && echo -e "  - ResumePicker: ${GREEN}Active${NC}" || echo -e "  - ResumePicker: ${RED}Inactive${NC}"

echo -e "\n${GREEN}Useful Commands:${NC}"
echo "  - Check Nginx status: sudo systemctl status nginx"
echo "  - Check app status: sudo systemctl status resumepicker"
echo "  - View app logs: sudo journalctl -u resumepicker -f"
echo "  - Restart app: sudo systemctl restart resumepicker"
echo "  - Renew SSL: sudo certbot renew"
echo "  - Test SSL: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"

echo -e "\n${YELLOW}Important Notes:${NC}"
echo "  1. Make sure your domain DNS A records point to this server's IP"
echo "  2. Update the email in the script for SSL notifications"
echo "  3. The app runs on port 5000 internally, Nginx proxies to it"
echo "  4. SSL certificates will auto-renew via cron job"
echo "  5. Check /var/log/nginx/ for Nginx logs"
echo "  6. Check /var/log/resumepicker/ for app logs"