import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import { storage } from "./storage";
import crypto from "crypto";
import { promisify } from "util";
import pgSession from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { insertUserSchema } from "@shared/schema";

const scrypt = promisify(crypto.scrypt);
const PgStore = pgSession(session);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 authentication attempts
  message: { message: "Too many authentication requests, please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});


export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scrypt(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, hashed: string | null | undefined) {
  if (!hashed) return false;
  const [hash, salt] = hashed.split(".");
  if (!hash || !salt) return false;
  const buf = (await scrypt(supplied, salt, 64)) as Buffer;
  
  const hashBuf = Buffer.from(hash, "hex");
  if (buf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(buf, hashBuf);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required in production!");
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "market-scholar-session-secret-key-12345",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",    // Allow cookies on same-origin requests
    },
  };

  if (isProduction) {
    app.set("trust proxy", 1);  // Only needed behind HTTPS reverse proxy (nginx/caddy)
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value || null;
            const displayName = profile.displayName || profile.username || `user_${googleId.slice(-6)}`;

            let user = await storage.getUserByGoogleId(googleId);
            if (!user) {
              let username = displayName.replace(/\s+/g, "").toLowerCase();
              const existingByUsername = await storage.getUserByUsername(username);
              if (existingByUsername) {
                username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
              }

              const isAdmin = username.toLowerCase() === (process.env.ADMIN_USERNAME || "").toLowerCase();
              user = await storage.createUser({
                username,
                password: null, // No password for Google OAuth users
                googleId,
                email,
                isAdmin,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // API Endpoints
  app.post("/api/register", authLimiter, async (req, res, next) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.errors.map(e => e.message).join(". ");
        return res.status(400).json({ message: errorMsg });
      }

      const { username, password } = parsed.data;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        await storage.createAuthLog({
          userId: null,
          username,
          eventType: "REGISTER_FAILED_EXISTS",
          ipAddress: req.ip || null,
        });
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const isAdmin = username.toLowerCase() === (process.env.ADMIN_USERNAME || "").toLowerCase();
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        isAdmin,
      });

      await storage.createAuthLog({
        userId: user.id,
        username: user.username,
        eventType: "REGISTER_SUCCESS",
        ipAddress: req.ip || null,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error: any) {
      return next(error);
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    const { username } = req.body;
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        storage.createAuthLog({
          userId: null,
          username: typeof username === "string" ? username : "unknown",
          eventType: "LOGIN_FAILED",
          ipAddress: req.ip || null,
        }).catch(console.error);
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        storage.createAuthLog({
          userId: user.id,
          username: user.username,
          eventType: "LOGIN_SUCCESS",
          ipAddress: req.ip || null,
        }).catch(console.error);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const user = req.user as any;
    const username = user?.username || "unknown";
    const userId = user?.id || null;

    req.logout((err) => {
      if (err) return next(err);

      storage.createAuthLog({
        userId,
        username,
        eventType: "LOGOUT",
        ipAddress: req.ip || null,
      }).catch(console.error);

      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

  app.get("/api/auth/google/config", (req, res) => {
    res.json({
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }
}

