import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

const scryptAsync = promisify(scrypt);

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return salt + ":" + derivedKey.toString("hex");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Check if hash is valid
    if (!hash || typeof hash !== 'string') {
      console.error('[AUTH] Invalid password hash provided');
      return false;
    }

    // Handle both old format (dot separator) and new format (colon separator)
    let salt: string, key: string;
    
    if (hash.includes('.')) {
      // Old format: key.salt
      const parts = hash.split('.');
      if (parts.length !== 2) {
        console.error('[AUTH] Invalid old format password hash');
        return false;
      }
      [key, salt] = parts;
    } else if (hash.includes(':')) {
      // New format: salt:key
      const parts = hash.split(':');
      if (parts.length !== 2) {
        console.error('[AUTH] Invalid new format password hash');
        return false;
      }
      [salt, key] = parts;
    } else {
      console.error('[AUTH] Unrecognized password hash format');
      return false;
    }

    if (!salt || !key) {
      console.error('[AUTH] Missing salt or key in password hash');
      return false;
    }

    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
  } catch (error) {
    console.error('[AUTH] Password verification error:', error);
    return false;
  }
}

// Simple session management
export function setupSimpleAuth(app: Express) {
  // Session configuration
  const PostgresSessionStore = connectPg(session);
  const sessionStore = new PostgresSessionStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // Disable automatic table creation
    tableName: 'session'
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "fallback-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      console.log(`[AUTH] Login attempt for: ${username}`);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`[AUTH] User not found: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`[AUTH] User found, checking password...`);
      
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        console.log(`[AUTH] Invalid password for: ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Store user in session
      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };

      console.log(`[AUTH] Login successful for: ${username}`);
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("[AUTH] Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint - support both GET and POST
  const logoutHandler = (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[AUTH] Logout error:", err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie("connect.sid");
      
      // For GET requests (browser navigation), redirect to home
      if (req.method === 'GET') {
        res.redirect('/');
      } else {
        // For POST requests (API calls), return JSON
        res.json({ message: "Logged out successfully" });
      }
    });
  };
  
  app.post("/api/logout", logoutHandler);
  app.get("/api/logout", logoutHandler);

  // Get current user
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("[AUTH] Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).userId = userId;
  next();
}

// Admin authentication middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any)?.user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  (req as any).userId = user.id;
  next();
}

// Utility function to create admin user
export async function createAdminUser(): Promise<void> {
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    if (existingAdmin) {
      console.log("[AUTH] Admin user already exists");
      return;
    }

    const hashedPassword = await hashPassword("admin123");
    await storage.createUser({
      id: "admin-simple",
      username: "admin",
      email: "admin@smarthire.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: true,
    });

    console.log("[AUTH] Admin user created successfully");
  } catch (error) {
    console.error("[AUTH] Error creating admin user:", error);
  }
}