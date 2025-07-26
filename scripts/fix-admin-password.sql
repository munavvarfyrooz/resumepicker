-- Quick fix for admin password in production
-- This updates the admin password to use 'admin123' instead of the complex password

-- Update admin password to use simple admin123
UPDATE users 
SET password = '5054730a0d7365086c96be7350c3ea75df69573eb381a1cdaa418cab5299a642:60987d4376b61036ddcae7c16422323e6a16c74392714fd51a0f9b52532bdd642989d4ebccf52a5050d7260d47083c8a2baebf34e36121774d3795231475e1ac',
    updated_at = NOW()
WHERE username = 'admin';

-- Verify the update
SELECT username, role, updated_at FROM users WHERE username = 'admin';