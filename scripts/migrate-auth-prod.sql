-- Migration script for production authentication system
-- This script ensures the authentication system is properly set up in production

-- Drop old conflicting tables if they exist
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS session CASCADE;

-- Ensure users table has correct structure (will be created by drizzle if not exists)
-- The main schema is defined in shared/schema.ts

-- Insert or update admin users with strong passwords
INSERT INTO users (id, username, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES 
  -- Main admin account with strong generated password
  ('admin-001', 'admin', 'admin@smarthire.com', '7f153ff0e8358a2500fc3a233c6118fdda20c751452f654dfccc1e7f8c5d508a:d66e10f72908429703c311ed4a0b2643bd19114eb878de29a33ad88837756d14c987203d8deaf1792ae51e2046002975f964d34ff9ac3a423e9d9beb7b3d8a75', 'Admin', 'User', 'admin', true, NOW(), NOW()),
  
  -- Production admin account  
  ('admin-prod-001', 'admin-prod', 'admin-prod@smarthire.com', '9a579228abf0290984582cd4db64c4dee9070bc807072fd2a3e7bfb7ff3de4c2:c32ccb34c6b82a95a8b3400bc49dc6f5f61679a6add303f6112a276d20529ac646965810e2a6b51b86002436300816ed729153a6b3f0f97f81d36877f8058f82', 'Production', 'Admin', 'admin', true, NOW(), NOW())
  
ON CONFLICT (id) DO UPDATE SET 
  password = EXCLUDED.password,
  updated_at = NOW();

-- Verify the setup
SELECT username, role, is_active, created_at FROM users WHERE role = 'admin';