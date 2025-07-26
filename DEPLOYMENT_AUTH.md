# Authentication System Deployment Guide

## Overview
This document provides the complete setup instructions for deploying the SmartHire authentication system to production.

## Database Migration Steps

### 1. Run Database Schema Migration
```bash
npm run db:push
```
This will create all required tables based on the schema in `shared/schema.ts`.

### 2. Set Up Admin Users (if needed)
If admin users don't exist, run the migration script:
```bash
psql $DATABASE_URL -f scripts/migrate-auth-prod.sql
```

## Admin Credentials

### Main Admin Account
- **Username**: `admin`
- **Password**: `)%yK[NRt6!)+kP<Q{dWu`
- **Role**: admin
- **Email**: admin@smarthire.com
- **Security**: Strong 20-character password with special characters

### Production Admin Account  
- **Username**: `admin-prod`
- **Password**: `admin123`
- **Role**: admin
- **Email**: admin-prod@smarthire.com

## Production Issues & Solutions

### Problem: "Taking older password for admin"
**Solution**: Run the migration script to update password hashes:
```bash
psql $DATABASE_URL -f scripts/migrate-auth-prod.sql
```

### Problem: "Not routing to dashboard" 
**Solution**: Ensure:
1. Admin users have correct role assignments
2. Session table name is 'sessions' (not 'session')
3. Authentication endpoints return proper JSON responses

### Testing Production Authentication
```bash
# Test admin login with strong password
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":")%yK[NRt6!)+kP<Q{dWu"}' \
  https://yourapp.com/api/login

# Test admin-prod login  
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin-prod","password":"admin123"}' \
  https://yourapp.com/api/login
```

### Production Deployment Commands
```bash
# 1. Push database schema
npm run db:push

# 2. Update admin passwords in production
psql $DATABASE_URL -f scripts/update-prod-passwords.sql

# 3. Alternative: Run the complete migration script
psql $DATABASE_URL -f scripts/migrate-auth-prod.sql

# 4. Verify production admin accounts
psql $DATABASE_URL -c "SELECT username, role, updated_at FROM users WHERE role = 'admin';"
```

### Production Password Update Status
✅ **Admin passwords updated in production database**
- **admin** account now uses strong password: `)%yK[NRt6!)+kP<Q{dWu`
- **admin-prod** account uses password: `admin123`
- Password hashes updated with correct 193-character crypto format
- Production database synchronized with development environment

### Security Enhancement
The admin account now uses a cryptographically strong 20-character password with:
- Uppercase and lowercase letters
- Numbers and special characters
- Random generation for maximum security

⚠️ **Security Note**: Change these passwords immediately after first login in production.

## Environment Variables Required

Make sure these environment variables are set in production:

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=your-strong-session-secret
NODE_ENV=production
```

## Authentication Features

✅ **Session-based authentication** with PostgreSQL storage
✅ **Secure password hashing** using scrypt with salt
✅ **Role-based access control** (user/admin)
✅ **Admin dashboard** with user management and analytics
✅ **Protected API routes** with authentication middleware
✅ **Logout functionality** with proper session cleanup

## Database Tables

The authentication system uses these tables:
- `users` - User accounts with roles and profile data
- `sessions` - Session storage for PostgreSQL
- `user_sessions` - Login tracking and analytics
- `user_actions` - Activity logging for analytics

## Verification

After deployment, verify the system works:

1. **Check database connection**: `curl https://yourapp.com/api/auth/user`
2. **Test admin login**: Login with admin credentials
3. **Verify admin dashboard**: Access `/admin` route
4. **Test logout**: Ensure logout redirects properly

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set
- Ensure database is accessible from production environment
- Check firewall and network settings

### Authentication Failures
- Verify session table exists and is accessible
- Check `SESSION_SECRET` is set
- Ensure password hashes are correct format

### Migration Issues
- Run `npm run db:push` to sync schema
- Check for table conflicts and resolve manually
- Verify all required columns exist in users table