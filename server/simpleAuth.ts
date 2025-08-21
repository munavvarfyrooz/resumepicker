import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";

const scryptAsync = promisify(scrypt);

// Simple password hashing
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return salt + ":" + derivedKey.toString("hex");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Check if hash is valid
    if (!hash || typeof hash !== 'string') {
      console.error('[AUTH] Invalid password hash provided');
      return false;
    }

    // Check if it's a bcrypt hash (starts with $2b$, $2a$, or $2y$)
    if (hash.startsWith('$2b$') || hash.startsWith('$2a$') || hash.startsWith('$2y$')) {
      return await bcrypt.compare(password, hash);
    }

    // Handle legacy scrypt hashes - both old format (dot separator) and new format (colon separator)
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
    tableName: 'sessions'
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
        return res.status(401).json({ message: "Incorrect username or password" });
      }

      console.log(`[AUTH] User found, checking password...`);
      
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        console.log(`[AUTH] Invalid password for: ${username}`);
        return res.status(401).json({ message: "Incorrect username or password" });
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

  // Registration endpoint
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate unique user ID and verification token
      const userId = randomBytes(16).toString("hex");
      const verificationToken = randomBytes(32).toString("hex");

      // Create user
      const newUser = await storage.createUser({
        id: userId,
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: "user",
        isActive: true,
        emailVerified: false,
        emailVerificationToken: verificationToken,
      });

      // Log user action (resourceId is not needed for user registration)
      await storage.logUserAction({
        userId: newUser.id,
        action: "user_registered",
        resourceType: "user",
        metadata: { username, email }
      });

      // Store user in session (auto-login after registration)
      (req.session as any).userId = newUser.id;
      (req.session as any).user = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      };

      console.log(`[AUTH] Registration successful for: ${username}`);
      
      // Send emails asynchronously (don't wait for them)
      Promise.all([
        // Send welcome email with verification link
        import('./services/emailService').then(({ emailService }) => 
          emailService.sendWelcomeEmail(newUser, verificationToken)
        ),
        // Send admin notification
        import('./services/emailService').then(({ emailService }) =>
          emailService.sendNewUserNotification(newUser)
        )
      ]).catch(error => {
        console.error("[EMAIL] Failed to send registration emails:", error);
      });
      
      res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        emailVerified: false,
        message: "Registration successful. Please check your email to verify your account."
      });
    } catch (error) {
      console.error("[AUTH] Registration error:", error);
      res.status(500).json({ message: "Internal server error during registration" });
    }
  });

  // Email verification endpoint
  app.get("/api/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Verification token is required" });
      }

      // Find user with this verification token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.emailVerificationToken === token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Update user to verified
      await storage.updateUserEmailVerified(user.id, true);

      // Send confirmation email
      import('./services/emailService').then(({ emailService }) =>
        emailService.sendEmailVerifiedConfirmation(user)
      ).catch(error => {
        console.error("[EMAIL] Failed to send verification confirmation:", error);
      });

      console.log(`[AUTH] Email verified for user: ${user.username}`);
      
      // Redirect to dashboard with success message
      res.redirect('/?verified=true');
    } catch (error) {
      console.error("[AUTH] Email verification error:", error);
      res.status(500).json({ message: "Internal server error during email verification" });
    }
  });

  // Forgot password endpoint - sends reset email
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log(`[AUTH] Password reset requested for non-existent email: ${email}`);
        return res.json({ message: "If the email exists, a password reset link has been sent" });
      }

      // Generate reset token and expiry (1 hour)
      const resetToken = randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token
      await storage.updateUserPasswordResetToken(user.id, resetToken, resetExpires);

      // Send reset email
      import('./services/emailService').then(({ emailService }) =>
        emailService.sendPasswordResetEmail(user, resetToken)
      ).catch(error => {
        console.error("[EMAIL] Failed to send password reset email:", error);
      });

      console.log(`[AUTH] Password reset email sent to: ${user.username}`);
      
      res.json({ message: "If the email exists, a password reset link has been sent" });
    } catch (error) {
      console.error("[AUTH] Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset password endpoint - actually changes the password
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user with this reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => {
        if (!u.passwordResetToken || !u.passwordResetExpires) return false;
        return u.passwordResetToken === token && u.passwordResetExpires > new Date();
      });

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.updateUserPasswordResetToken(user.id, null, null);

      // Send confirmation email
      import('./services/emailService').then(({ emailService }) =>
        emailService.sendPasswordChangedNotification(user)
      ).catch(error => {
        console.error("[EMAIL] Failed to send password change notification:", error);
      });

      console.log(`[AUTH] Password reset successful for: ${user.username}`);
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("[AUTH] Reset password error:", error);
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