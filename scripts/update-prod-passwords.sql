-- Update production admin passwords script
-- Use this script to update admin passwords in production database

-- Update main admin password to admin123
UPDATE users 
SET password = '5054730a0d7365086c96be7350c3ea75df69573eb381a1cdaa418cab5299a642:60987d4376b61036ddcae7c16422323e6a16c74392714fd51a0f9b52532bdd642989d4ebccf52a5050d7260d47083c8a2baebf34e36121774d3795231475e1ac',
    updated_at = NOW()
WHERE username = 'admin';

-- Update admin-prod password to admin123  
UPDATE users 
SET password = '9a579228abf0290984582cd4db64c4dee9070bc807072fd2a3e7bfb7ff3de4c2:c32ccb34c6b82a95a8b3400bc49dc6f5f61679a6add303f6112a276d20529ac646965810e2a6b51b86002436300816ed729153a6b3f0f97f81d36877f8058f82',
    updated_at = NOW()
WHERE username = 'admin-prod';

-- Verify updates
SELECT 'Password updates completed' as status;
SELECT username, role, updated_at, LENGTH(password) as password_length 
FROM users 
WHERE role = 'admin';