import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';

// Strong production password
const STRONG_ADMIN_PASSWORD = 'Rp9#kX8mQ2@vN5wT';
const PRODUCTION_HASH = '$2b$12$/bC7xGRUZZhHU6lPijlquOXEErAKR/9Ui2Des5z6qLRLuP/QivwrO';

async function updateAdminPassword() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔐 Updating admin password in production database...');
    
    // Update admin user password
    const result = await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE username = $2',
      [PRODUCTION_HASH, 'admin']
    );

    if (result.rowCount === 0) {
      console.error('❌ Admin user not found in database');
      process.exit(1);
    }

    console.log('✅ Admin password updated successfully!');
    console.log('📋 Production Credentials:');
    console.log('   Username: admin');
    console.log('   Password:', STRONG_ADMIN_PASSWORD);
    console.log('');
    console.log('⚠️  IMPORTANT: Store this password securely!');
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Verify password generation
async function verifyPasswordGeneration() {
  console.log('🔍 Verifying password hash...');
  const isValid = await bcrypt.compare(STRONG_ADMIN_PASSWORD, PRODUCTION_HASH);
  console.log('Hash verification:', isValid ? '✅ Valid' : '❌ Invalid');
  return isValid;
}

async function main() {
  console.log('🚀 ResumePicker Production Password Update');
  console.log('==========================================');
  
  const verified = await verifyPasswordGeneration();
  if (!verified) {
    console.error('❌ Password hash verification failed');
    process.exit(1);
  }
  
  await updateAdminPassword();
}

main().catch(console.error);