import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function changeAdminPassword() {
  const newPassword = process.argv[2];
  const username = process.argv[3] || 'admin';
  
  if (!newPassword) {
    console.log('❌ Usage: node scripts/change-admin-password.js <new_password> [username]');
    console.log('Example: node scripts/change-admin-password.js "myNewPassword123" admin');
    process.exit(1);
  }

  try {
    console.log(`🔄 Changing password for user: ${username}`);
    
    // Hash the new password
    console.log('🔒 Hashing new password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE username = $2 RETURNING id, username, email',
      [hashedPassword, username]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User '${username}' not found`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ Password updated successfully!');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error changing password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

changeAdminPassword();