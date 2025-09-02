# Manual SSL Setup Guide for ResumePicker

## Prerequisites
1. Domain names `resumepicker.com` and `www.resumepicker.com` pointing to your server's IP
2. Root or sudo access on the server
3. Node.js app running on port 5000

## Step-by-Step Setup

### 1. Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Initial Setup (HTTP only for certificate generation)
```bash
# Copy the HTTP-only config first
sudo cp /home/ubuntu/resumepicker/TaskTrackerPro/nginx/resumepicker-http-only.conf /etc/nginx/sites-available/resumepicker

# Enable the site
sudo ln -s /etc/nginx/sites-available/resumepicker /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Create certbot directory
sudo mkdir -p /var/www/certbot

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Obtain SSL Certificates
```bash
# Get certificates for both domains
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d resumepicker.com \
  -d www.resumepicker.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive
```

### 4. Switch to Full HTTPS Configuration
```bash
# Copy the full HTTPS config
sudo cp /home/ubuntu/resumepicker/TaskTrackerPro/nginx/resumepicker.conf /etc/nginx/sites-available/resumepicker

# Uncomment the SSL certificate lines in the config
sudo nano /etc/nginx/sites-available/resumepicker
# Uncomment these lines:
# ssl_certificate /etc/letsencrypt/live/resumepicker.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/resumepicker.com/privkey.pem;

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Set Up Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add this line:
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 6. Create Systemd Service for Node.js App
```bash
sudo nano /etc/systemd/system/resumepicker.service
```

Add this content:
```ini
[Unit]
Description=ResumePicker Node.js Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/resumepicker/TaskTrackerPro
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable resumepicker
sudo systemctl start resumepicker
```

### 7. Configure Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### 8. Verify Setup
```bash
# Check services
sudo systemctl status nginx
sudo systemctl status resumepicker

# Test SSL
curl https://resumepicker.com

# Check SSL configuration
echo | openssl s_client -connect resumepicker.com:443 -servername resumepicker.com
```

## Troubleshooting

### If SSL certificates fail:
```bash
# Check DNS
dig resumepicker.com
dig www.resumepicker.com

# Check if port 80 is accessible
sudo netstat -tlnp | grep :80

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Try standalone mode
sudo certbot certonly --standalone -d resumepicker.com -d www.resumepicker.com
```

### If Node.js app won't start:
```bash
# Check logs
sudo journalctl -u resumepicker -f

# Check if port 5000 is in use
sudo lsof -i :5000

# Run manually to see errors
cd /home/ubuntu/resumepicker/TaskTrackerPro
npm start
```

### If Nginx won't start:
```bash
# Check configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check if ports are in use
sudo netstat -tlnp | grep -E ':80|:443'
```

## Security Checklist
- [ ] SSL certificates installed and working
- [ ] HTTP redirects to HTTPS
- [ ] Security headers configured
- [ ] Firewall enabled
- [ ] Auto-renewal configured
- [ ] Rate limiting enabled
- [ ] File upload size limited
- [ ] Hidden files blocked

## Monitoring
- SSL Certificate: https://www.ssllabs.com/ssltest/analyze.html?d=resumepicker.com
- Uptime: Set up monitoring with UptimeRobot or similar
- Logs: `/var/log/nginx/` and `journalctl -u resumepicker`

## Maintenance Commands
```bash
# Restart services
sudo systemctl restart nginx
sudo systemctl restart resumepicker

# View logs
sudo tail -f /var/log/nginx/resumepicker_access.log
sudo tail -f /var/log/nginx/resumepicker_error.log
sudo journalctl -u resumepicker -f

# Renew SSL manually
sudo certbot renew

# Update app
cd /home/ubuntu/resumepicker/TaskTrackerPro
git pull
npm install
npm run build
sudo systemctl restart resumepicker
```