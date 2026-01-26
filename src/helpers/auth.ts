import { scryptSync, randomBytes } from "crypto";
import {
  Express,
  Request,
  Response,
  NextFunction,
  Router,
  RequestHandler,
} from "express";
import session from "express-session";
import passport from "passport";
import SQLiteStoreFactory from "connect-sqlite3";
import { db } from "./db";
import { User } from "../model/user";
import { HttpError } from "./errors";
import { recomputeUserRanks } from "./db";

export const authRouter = Router();

interface AuthRequest extends Request {
  user?: User;
}

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const existing = await db.connection.get(
      "SELECT user_id FROM USERS WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing) {
      return res.status(409).json({ error: "Username or Email already taken" });
    }

    const passwordHash = hashPassword(password);

    await db.connection.run(
      `INSERT INTO USERS (role_id, username, email, password_hash, verified, rank, total_score)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [4, username, email, passwordHash, 0]
    );

    await recomputeUserRanks();

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});
export function requireRole(roles: number[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    const user = authReq.user as User | undefined;
    const hasRole = user?.roles?.some((role) => roles.includes(role));
    if (!hasRole) {
      throw new HttpError(403, "You do not have permission to do this");
    }
    next();
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashToCompare = scryptSync(password, salt, 64).toString("hex");
  return hash === hashToCompare;
}

export async function initAuth(
  app: Express,
  reset: boolean = false
): Promise<void> {
  const { Strategy } = require("passport-json") as any;
  passport.use(
    new Strategy(
      async (
        username: string,
        password: string,
        done: (error: any, user?: Express.User | false, info?: any) => void
      ) => {
        try {
          const user = await findUserByUsername(username);

          if (!user) {
            return done(null, false, { message: "User not found" });
          }

          if (!verifyPassword(password, user.password)) {
            return done(null, false, { message: "Invalid password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  const SQLiteStore = SQLiteStoreFactory(session);
  app.use(
    session({
      secret: process.env.SECRETKEY || "mysecretkey",
      resave: false,
      saveUninitialized: false,
      store: new SQLiteStore({
        db: process.env.SESSIONSDBFILE || "./db/sessions.sqlite3",
      }) as session.Store,
      cookie: { maxAge: 86400000 }, 
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
}

async function findUserById(id: number): Promise<User | undefined> {
  if (!db.connection) return undefined;

  const row = await db.connection.get<{
    user_id: number;
    username: string;
    password_hash: string;
    role_id: number;
    verified: number;
    email: string;
  }>(
    `
    SELECT
      u.user_id,
      u.username,
      u.password_hash,
      u.role_id,
      u.verified,
      u.email
    FROM USERS u
    WHERE u.user_id = ?
  `,
    [id]
  );

  if (!row) return undefined;

  return {
    id: row.user_id,
    username: row.username,
    password: row.password_hash,
    roles: [row.role_id],
    email: row.email,
    verified: row.verified,
    total_score: 0,
    rank: 0,
    role_id: row.role_id
  };
}

async function findUserByUsername(username: string): Promise<User | undefined> {
  if (!db.connection) return undefined;

  const row = await db.connection.get<{
    user_id: number;
    username: string;
    password_hash: string;
    role_id: number;
    verified: number;
    email: string;
  }>(
    `
    SELECT
      u.user_id,
      u.username,
      u.password_hash,
      u.role_id,
      u.email
    FROM USERS u
    WHERE u.username = ?
  `,
    [username]
  );

  if (!row) return undefined;

  return {
    id: row.user_id,
    username: row.username,
    password: row.password_hash,
    roles: [row.role_id], 
    email: row.email,
    total_score: 0,
    verified: row.verified,
    rank: 0,
    role_id: row.role_id
  };
}

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await findUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

authRouter.post(
  "",
  passport.authenticate("json"),
  (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    res.json({
      message: "Logged in successfully",
      username: authReq.user?.username,
      roles: authReq.user?.roles,
      email: authReq.user?.email,
      verified: authReq.user?.verified,
    });
  }
);

authRouter.delete("", (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  authReq.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out" });
  });
});

authRouter.get("", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const user = req.user as User;
    res.json({ username: user.username, roles: user.roles, email: user.email, verified: user.verified });
  } else {
    res.json({ username: null, roles: null, email: null, verified: 0 });
  }
});
