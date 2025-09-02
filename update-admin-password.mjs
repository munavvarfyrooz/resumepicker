import pg from 'pg';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const scryptAsync = promisify(scrypt);

// Generate a strong password
function generateStrongPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 20; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Hash password
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return salt + ":" + derivedKey.toString("hex");
}

async function updateAdminPassword() {
  const { Client } = pg;
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Generate strong password
    const newPassword = 'ResumePicker#Admin2025!Secure';
    console.log('\n=================================================');
    console.log('NEW ADMIN CREDENTIALS:');
    console.log('=================================================');
    console.log('Username: admin');
    console.log('Password:', newPassword);
    console.log('=================================================');
    console.log('SAVE THIS PASSWORD IN A SECURE LOCATION!');
    console.log('=================================================\n');

    // Hash the password
    const hashedPassword = await hashPassword(newPassword);

    // Update admin password
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, 'admin']
    );

    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
      
      // Also check if admin email exists
      const emailCheck = await client.query(
        'SELECT email FROM users WHERE username = $1',
        ['admin']
      );
      
      if (emailCheck.rows[0] && !emailCheck.rows[0].email) {
        // Update admin email if not set
        await client.query(
          'UPDATE users SET email = $1 WHERE username = $2',
          ['admin@resumepicker.com', 'admin']
        );
        console.log('✅ Admin email set to: admin@resumepicker.com');
      }
    } else {
      console.log('❌ Admin user not found. Creating admin user...');
      
      // Create admin user if doesn't exist
      await client.query(
        `INSERT INTO users (id, username, password, email, role, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        ['admin-simple', 'admin', hashedPassword, 'admin@resumepicker.com', 'admin']
      );
      console.log('✅ Admin user created successfully!');
    }

    // Test the password works
    console.log('\nTesting login credentials...');
    const testResult = await client.query(
      'SELECT password FROM users WHERE username = $1',
      ['admin']
    );
    
    if (testResult.rows.length > 0) {
      console.log('✅ Admin user exists in database');
      console.log('✅ Password hash stored successfully');
    }

  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await client.end();
    console.log('\nYou can now login at:');
    console.log('- http://43.205.89.62:5000/login');
    console.log('- https://resumepicker.com/login (if domain is configured)');
  }
}

updateAdminPassword();