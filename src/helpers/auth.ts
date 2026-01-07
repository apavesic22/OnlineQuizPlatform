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

    // Check for existing user
    const existing = await db.connection.get(
      "SELECT user_id FROM USERS WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing) {
      return res.status(409).json({ error: "Username or Email already taken" });
    }

    const passwordHash = hashPassword(password);

    // 1. Insert the new user with score 0 and rank 0 initially
    await db.connection.run(
      `INSERT INTO USERS (role_id, username, email, password_hash, verified, rank, total_score)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [4, username, email, passwordHash, 0]
    );

    // 2. Recalculate ranks to put the new user in their correct position
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

// Initialize authentication
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

  // Middleware setup with persistent sessions
  const SQLiteStore = SQLiteStoreFactory(session);
  app.use(
    session({
      secret: process.env.SECRETKEY || "mysecretkey",
      resave: false,
      saveUninitialized: false,
      // store sessions in sqlite database
      store: new SQLiteStore({
        db: process.env.SESSIONSDBFILE || "./db/sessions.sqlite3",
      }) as session.Store,
      cookie: { maxAge: 86400000 }, // default 1 day
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  /*
  if(reset) {
    users.length = 0;
  }
  if(users.length > 0) return; // already initialized
  */
}

async function findUserById(id: number): Promise<User | undefined> {
  if (!db.connection) return undefined;

  const row = await db.connection.get<{
    user_id: number;
    username: string;
    password_hash: string;
    role_id: number;
  }>(
    `
    SELECT
      u.user_id,
      u.username,
      u.password_hash,
      u.role_id
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
    total_score: 0,
    rank: 0,
  };
}

async function findUserByUsername(username: string): Promise<User | undefined> {
  if (!db.connection) return undefined;

  const row = await db.connection.get<{
    user_id: number;
    username: string;
    password_hash: string;
    role_id: number;
  }>(
    `
    SELECT
      u.user_id,
      u.username,
      u.password_hash,
      u.role_id
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
    roles: [row.role_id], // single role → array
    total_score: 0,
    rank: 0,
  };
}

// Serialize user to store in session (User -> user.id)
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
/**
 * @api {post} /api/auth Login user
 * @apiGroup Authentication
 * @apiName Login
 *
 * @apiDescription
 * Authenticates a user using JSON body credentials.
 * The endpoint expects credentials formatted according to the JSON strategy
 * of Passport (`{ "username": "...", "password": "..." }`).
 *
 * @apiBody {String} username User's login name
 * @apiBody {String} password User's password
 *
 * @apiSuccess {String} message Successful login message
 * @apiSuccess {String} username Authenticated user's username
 * @apiSuccess {Number[]} roles List of numeric role identifiers assigned to the user
 *
 * @apiError (401) Unauthorized Invalid credentials
 * @apiUse HttpError
 */
authRouter.post(
  "",
  passport.authenticate("json"),
  (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    res.json({
      message: "Logged in successfully",
      username: authReq.user?.username,
      roles: authReq.user?.roles,
    });
  }
);

/**
 * @api {delete} /api/auth Logout user
 * @apiGroup Authentication
 * @apiName Logout
 *
 * @apiDescription
 * Logs out the currently authenticated user by terminating their session.
 *
 * @apiSuccess {String} message Logout confirmation message
 *
 * @apiUse HttpError
 */
authRouter.delete("", (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  authReq.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out" });
  });
});

/**
 * @api {get} /api/auth Who am I
 * @apiGroup Authentication
 * @apiName WhoAmI
 *
 * @apiDescription
 * Returns information about the currently authenticated user.
 * If no user is logged in, `username` and `roles` will be `null`.
 *
 * @apiSuccess {String|null} username Authenticated user's username or null if not logged in
 * @apiSuccess {Number[]|null} roles List of user's role IDs or null if not logged in
 *
 * @apiUse HttpError
 */
authRouter.get("", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    const user = req.user as User;
    res.json({ username: user.username, roles: user.roles });
  } else {
    res.json({ username: null, roles: null });
  }
});
