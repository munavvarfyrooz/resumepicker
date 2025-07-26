-- Update admin account with strong password
-- Strong Password: )%yK[NRt6!)+kP<Q{dWu
-- This script updates the admin password to use a cryptographically strong password

UPDATE users 
SET password = '6a8f8eacdcfeed8ee75fa8baf9a85d1399a1f7581cd2335e85e5d16f47ee3bf4:e9f02652695902a5e038bf865f4dbf83e53d19219688e67be196466706e6220520e3d16e556fea8e2940d19608e4fc571bb005a65d692542adf1588cd796fc13', 
    updated_at = NOW()
WHERE username = 'admin';

-- Verify the update
SELECT 'Admin password updated to strong password' as status;
SELECT username, role, updated_at, LENGTH(password) as password_length 
FROM users 
WHERE username = 'admin';