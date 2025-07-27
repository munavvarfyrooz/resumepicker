-- Change Admin User Password
-- Replace 'NEW_PASSWORD_HASH_HERE' with the actual bcrypt hash

-- Step 1: Generate password hash using Node.js
-- Run this in your terminal first:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_PASSWORD', 10).then(hash => console.log('Hash:', hash));"

-- Step 2: Update the admin user password
-- Replace 'NEW_PASSWORD_HASH_HERE' with the hash from step 1
UPDATE users 
SET password = 'NEW_PASSWORD_HASH_HERE', 
    updated_at = NOW() 
WHERE username = 'admin';

-- Step 3: Verify the update
SELECT id, username, email, updated_at 
FROM users 
WHERE username = 'admin';