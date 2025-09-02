import * as fs from 'fs';
import * as path from 'path';

/**
 * Reads the OpenAI API key directly from the .env file
 * This bypasses any environment variable injection from Replit or other systems
 * @returns The OpenAI API key from .env file or undefined
 */
export function getOpenAIKeyFromEnvFile(): string | undefined {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    const key = match ? match[1].trim() : undefined;
    
    if (key) {
      console.log('[OpenAI] Successfully loaded API key from .env file');
    } else {
      console.error('[OpenAI] No OPENAI_API_KEY found in .env file');
    }
    
    return key;
  } catch (error) {
    console.error('[OpenAI] Failed to read .env file:', error);
    // Fallback to process.env only if file read fails
    return process.env.OPENAI_API_KEY;
  }
}

/**
 * Force removes any injected OPENAI_API_KEY from process.env
 * This ensures we always use the key from .env file
 */
export function forceRemoveInjectedKey(): void {
  if (process.env.OPENAI_API_KEY) {
    console.log('[OpenAI] Removing injected OPENAI_API_KEY from process.env');
    delete process.env.OPENAI_API_KEY;
  }
}

/**
 * Gets a clean OpenAI API key by removing any injected keys and reading from .env
 * Call this function whenever you need to initialize OpenAI
 */
export function getCleanOpenAIKey(): string | undefined {
  // First, remove any injected key
  forceRemoveInjectedKey();
  
  // Then read the key from .env file
  return getOpenAIKeyFromEnvFile();
}

/**
 * Creates a completely clean process.env without any injected values
 * This recreates process.env from scratch using only .env file
 */
export function recreateCleanEnvironment(): void {
  console.log('[OpenAI] Recreating clean environment from .env file');
  
  try {
    // Save original env (for non-OpenAI vars)
    const originalEnv = { ...process.env };
    
    // Clear OPENAI related keys
    delete originalEnv.OPENAI_API_KEY;
    delete originalEnv.OPENAI_ORG_ID;
    delete originalEnv.OPENAI_BASE_URL;
    
    // Read .env file
    const envPath = path.resolve(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Parse .env file and extract all variables
    const envVars: Record<string, string> = {};
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          envVars[key.trim()] = value;
        }
      }
    });
    
    // Recreate process.env with original vars + clean .env vars
    process.env = { ...originalEnv, ...envVars };
    
    console.log('[OpenAI] Environment recreated with clean values from .env');
  } catch (error) {
    console.error('[OpenAI] Failed to recreate environment:', error);
  }
}