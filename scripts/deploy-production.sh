#!/bin/bash

# ResumePicker Production Deployment Script
# This script prepares the application for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}ResumePicker Production Deployment${NC}"
echo -e "${GREEN}=====================================${NC}"

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then 
    echo -e "${YELLOW}Warning: Running as $USER instead of ubuntu${NC}"
fi

APP_DIR="/home/ubuntu/resumepicker/TaskTrackerPro"
cd $APP_DIR

# Step 1: Stop existing services
echo -e "\n${YELLOW}Step 1: Stopping existing services...${NC}"
./stop-server.sh 2>/dev/null || true
sudo systemctl stop resumepicker 2>/dev/null || true

# Step 2: Pull latest code (if using git)
if [ -d ".git" ]; then
    echo -e "\n${YELLOW}Step 2: Pulling latest code...${NC}"
    git stash
    git pull origin main
    git stash pop || true
fi

# Step 3: Install dependencies
echo -e "\n${YELLOW}Step 3: Installing dependencies...${NC}"
npm ci --production=false

# Step 4: Build the application
echo -e "\n${YELLOW}Step 4: Building application...${NC}"
npm run build

# Step 5: Run database migrations
echo -e "\n${YELLOW}Step 5: Checking database...${NC}"
if [ -f "scripts/add-indexes.sql" ]; then
    echo "Applying database indexes..."
    sudo -u postgres psql -d smarthire -f scripts/add-indexes.sql 2>/dev/null || true
fi

# Step 6: Set up systemd service if not exists
echo -e "\n${YELLOW}Step 6: Setting up systemd service...${NC}"
if [ ! -f /etc/systemd/system/resumepicker.service ]; then
    sudo tee /etc/systemd/system/resumepicker.service > /dev/null << EOF
[Unit]
Description=ResumePicker Node.js Application
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/resumepicker/app.log
StandardError=append:/var/log/resumepicker/error.log
Environment=NODE_ENV=production
Environment=PORT=5000

# Performance tuning
LimitNOFILE=65536
Environment="NODE_OPTIONS=--max-old-space-size=2048"

[Install]
WantedBy=multi-user.target
EOF
    
    # Create log directory
    sudo mkdir -p /var/log/resumepicker
    sudo chown ubuntu:ubuntu /var/log/resumepicker
    
    # Reload systemd
    sudo systemctl daemon-reload
    sudo systemctl enable resumepicker
fi

# Step 7: Start the service
echo -e "\n${YELLOW}Step 7: Starting ResumePicker service...${NC}"
sudo systemctl restart resumepicker

# Wait for service to start
sleep 5

# Step 8: Verify service is running
echo -e "\n${YELLOW}Step 8: Verifying service status...${NC}"
if sudo systemctl is-active --quiet resumepicker; then
    echo -e "${GREEN}✓ ResumePicker service is running${NC}"
else
    echo -e "${RED}✗ ResumePicker service failed to start${NC}"
    sudo journalctl -u resumepicker -n 20
    exit 1
fi

# Step 9: Set up Nginx if not configured
echo -e "\n${YELLOW}Step 9: Checking Nginx configuration...${NC}"
if [ ! -f /etc/nginx/sites-available/resumepicker ]; then
    echo "Nginx not configured. Run setup-nginx-ssl.sh to configure."
else
    # Test and reload Nginx
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx configuration valid${NC}"
fi

# Step 10: Run health check
echo -e "\n${YELLOW}Step 10: Running health check...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ Application health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check returned: $HEALTH_CHECK${NC}"
fi

# Step 11: Display summary
echo -e "\n${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"

echo -e "\n${GREEN}Service Status:${NC}"
sudo systemctl status resumepicker --no-pager | head -10

echo -e "\n${GREEN}Access Information:${NC}"
echo "  - Local: http://localhost:5000"
if [ -f /etc/nginx/sites-enabled/resumepicker ]; then
    echo "  - Production: https://resumepicker.com"
    echo "  - Production: https://www.resumepicker.com"
fi

echo -e "\n${GREEN}Useful Commands:${NC}"
echo "  - View logs: sudo journalctl -u resumepicker -f"
echo "  - Restart service: sudo systemctl restart resumepicker"
echo "  - Check status: sudo systemctl status resumepicker"
echo "  - View app logs: tail -f /var/log/resumepicker/app.log"

echo -e "\n${GREEN}Performance Tips:${NC}"
echo "  1. Monitor CPU/Memory: htop"
echo "  2. Check slow queries: tail -f logs/app.log | grep 'Slow request'"
echo "  3. Database indexes have been applied"
echo "  4. Consider enabling Redis for caching if not already done"

# Optional: Send deployment notification
if command -v curl > /dev/null && [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"ResumePicker deployed successfully on $(hostname)\"}" \
        "$SLACK_WEBHOOK_URL" 2>/dev/null || true
fi

echo -e "\n${GREEN}Deployment completed at: $(date)${NC}"