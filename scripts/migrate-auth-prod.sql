-- Production Authentication Migration Script for SmartHire
-- This script completely recreates the authentication system in production

-- Step 1: Drop any conflicting old tables
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS session CASCADE;

-- Step 2: Clean up users table for fresh start
DELETE FROM users WHERE username IN ('admin', 'admin-prod');

-- Step 3: Insert admin users with current working passwords
-- These are the exact hashes that work in development
INSERT INTO users (id, username, email, password, first_name, last_name, role, is_active, created_at, updated_at) 
VALUES 
  -- Main admin account: username=admin, password=admin123
  ('admin-001', 'admin', 'admin@smarthire.com', '5054730a0d7365086c96be7350c3ea75df69573eb381a1cdaa418cab5299a642:60987d4376b61036ddcae7c16422323e6a16c74392714fd51a0f9b52532bdd642989d4ebccf52a5050d7260d47083c8a2baebf34e36121774d3795231475e1ac', 'Admin', 'User', 'admin', true, NOW(), NOW()),
  
  -- Production admin account: username=admin-prod, password=admin123
  ('admin-prod-001', 'admin-prod', 'admin-prod@smarthire.com', '9a579228abf0290984582cd4db64c4dee9070bc807072fd2a3e7bfb7ff3de4c2:c32ccb34c6b82a95a8b3400bc49dc6f5f61679a6add303f6112a276d20529ac646965810e2a6b51b86002436300816ed729153a6b3f0f97f81d36877f8058f82', 'Production', 'Admin', 'admin', true, NOW(), NOW())
  
ON CONFLICT (id) DO UPDATE SET 
  password = EXCLUDED.password,
  updated_at = NOW();

-- Step 4: Verify admin accounts are created
SELECT 'Admin users created successfully:' AS status;
SELECT username, role, is_active, email, created_at FROM users WHERE role = 'admin';

-- Step 5: Ensure sessions table exists with correct schema
-- This should match the sessions table from shared/schema.ts