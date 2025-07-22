import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { Express, RequestHandler } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('comparePasswords: supplied length:', supplied.length, 'stored length:', stored.length);
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log('comparePasswords: invalid format');
      return false;
    }
    console.log('comparePasswords: hash length:', hashed.length, 'salt length:', salt.length);
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log('comparePasswords: result:', result);
    return result;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Always false for Replit environment
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export function setupCustomAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('LocalStrategy: looking up user:', username);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log('LocalStrategy: user not found');
          return done(null, false, { message: "Invalid credentials" });
        }
        
        console.log('LocalStrategy: user found, checking password');
        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          console.log('LocalStrategy: password mismatch');
          return done(null, false, { message: "Invalid credentials" });
        }
        
        console.log('LocalStrategy: authentication successful');
        return done(null, user);
      } catch (error) {
        console.error('LocalStrategy error:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Custom login page route
  app.get("/login", (req, res) => {
    res.redirect("/?redirect=login");
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log('Production login attempt:', req.body.username, 'NODE_ENV:', process.env.NODE_ENV);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        console.log('Auth failed in production:', info);
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ message: 'Login failed' });
        }
        
        console.log('Production login successful:', user.username);
        try {
          // Update last login time and create session record
          await storage.updateUserLastLogin(user.id);
          await storage.createUserSession(
            user.id, 
            req.ip, 
            req.get('User-Agent')
          );
          await storage.logUserAction({
            userId: user.id,
            action: 'login',
            resourceType: 'auth',
            metadata: { ip: req.ip, userAgent: req.get('User-Agent') }
          });
          
          res.status(200).json(user);
        } catch (error) {
          console.error('Login tracking error:', error);
          res.status(200).json(user); // Still return success even if tracking fails
        }
      });
    })(req, res, next);
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        id: randomBytes(16).toString('hex'), // Generate unique ID
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'user',
        isActive: true,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Logout endpoints (both GET and POST for flexibility)
  const handleLogout = (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      if (req.method === 'GET') {
        res.redirect('/auth');
      } else {
        res.sendStatus(200);
      }
    });
  };

  app.post("/api/logout", handleLogout);
  app.get("/api/logout", handleLogout);

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};