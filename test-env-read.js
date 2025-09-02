import dotenv from 'dotenv';
import fs from 'fs';

// Load .env file
dotenv.config();

console.log('Environment variable test:');
console.log('==========================');
console.log('OPENAI_API_KEY from process.env length:', process.env.OPENAI_API_KEY?.length);
console.log('First 10 chars:', process.env.OPENAI_API_KEY?.substring(0, 10));
console.log('Last 5 chars:', process.env.OPENAI_API_KEY?.slice(-5));

// Read directly from file
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/OPENAI_API_KEY=(.+)/);
if (match) {
  const keyFromFile = match[1].trim();
  console.log('\nDirect file read:');
  console.log('Key length from file:', keyFromFile.length);
  console.log('Last 5 chars from file:', keyFromFile.slice(-5));
  console.log('Keys match?', keyFromFile === process.env.OPENAI_API_KEY);
}