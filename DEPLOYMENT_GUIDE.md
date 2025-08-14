# ResumePicker Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure these environment variables are configured in production:

```env
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
SESSION_SECRET=your_secure_session_secret_here
VITE_GA_MEASUREMENT_ID=your_google_analytics_id_here
```

### 2. Database Setup
Run the database schema migration:
```bash
npm run db:push
```

### 3. Admin Password Update
Update admin password to production-ready strong password:
```bash
node scripts/update-admin-production.js
```

**Production Admin Credentials:**
- Username: `admin`
- Password: `Rp9#kX8mQ2@vN5wT`

⚠️ **IMPORTANT**: Change this password after first login to production!

## Deployment Steps

### Option 1: Replit Deployment (Recommended)
1. Click the "Deploy" button in your Replit project
2. Configure environment variables in the deployment settings
3. Choose static site deployment for frontend + backend service

### Option 2: Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Post-Deployment Verification

### 1. Health Check
- ✅ Admin login works with new credentials
- ✅ Database connections are stable
- ✅ File uploads are working
- ✅ AI features are functional (if OpenAI key provided)

### 2. Security Verification
- ✅ Admin password is strong and unique
- ✅ Session store is using PostgreSQL
- ✅ HTTPS is enabled
- ✅ Environment variables are secure

### 3. Feature Testing
- ✅ Job creation and management
- ✅ Resume upload and parsing
- ✅ Candidate ranking algorithms
- ✅ Blog system functionality
- ✅ User authentication flow

## Production Maintenance

### Security Updates
- Regularly update admin passwords
- Monitor authentication logs
- Keep dependencies updated

### Monitoring
- Check database performance
- Monitor API response times
- Track user engagement through analytics

### Backups
- Regular database backups
- Environment variable backup
- Application code versioning

## Troubleshooting

### Common Issues
1. **Admin Login Failed**: Run password update script
2. **Database Connection**: Check DATABASE_URL format
3. **Session Issues**: Verify sessions table exists
4. **File Uploads**: Check disk space and permissions

### Emergency Recovery
If admin access is lost:
```bash
node scripts/reset-admin-password.js
```

## Contact & Support
For deployment issues, check the logs and verify all environment variables are correctly configured.