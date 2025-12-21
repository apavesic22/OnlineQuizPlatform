import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import { hashPassword } from "./auth";
export const db: { connection: Database | null } = {
  connection: null,
};

export async function openDb(): Promise<void> {
  db.connection = await open({
    filename: process.env.DBFILE || "./db/QuizifyDB.sqlite3",
    driver: sqlite3.Database,
  });

  await db.connection.exec("PRAGMA foreign_keys = ON");

  const { user_version } = await db.connection.get("PRAGMA user_version;");
  if (!user_version) {
    await db.connection.exec("PRAGMA user_version = 1;");
    await createSchemaAndData();
  }
}

export const userRolesTableDef = {
  name: "USER_ROLES",
  columns: {
    role_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    name: { type: "TEXT", notNull: true, unique: true },
  },
};

export const usersTableDef = {
  name: "USERS",
  columns: {
    user_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    role_id: { type: "INTEGER", notNull: true },

    username: { type: "TEXT", notNull: true, unique: true },
    email: { type: "TEXT", unique: true },

    password_hash: { type: "TEXT", notNull: true },

    verified: { type: "INTEGER", notNull: true, default: 0 },
    rank: { type: "INTEGER", notNull: true, default: 0 },
    total_score: { type: "INTEGER", notNull: true, default: 0 },
  },
  foreignKeys: [
    { column: "role_id", references: "USER_ROLES(role_id)" },
  ],
};


function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function createTableStatement(def: {
  name: string;
  columns: {
    [key: string]: {
      type: string;
      primaryKey?: boolean;
      autoincrement?: boolean;
      notNull?: boolean;
      unique?: boolean;
      default?: any;
      defaultRaw?: string;
      check?: string;
    };
  };
  primaryKey?: string[];
  foreignKeys?: { column: string; references: string }[];
}): string {
  const cols = Object.entries(def.columns).map(([name, opts]) => {
    let colDef = `${name} ${opts.type}`;
    if (opts.primaryKey) colDef += " PRIMARY KEY";
    if (opts.autoincrement) colDef += " AUTOINCREMENT";
    if (opts.notNull) colDef += " NOT NULL";
    if (opts.unique) colDef += " UNIQUE";

    if (opts.defaultRaw !== undefined) {
      colDef += ` DEFAULT ${opts.defaultRaw}`;
    } else if (opts.default !== undefined) {
      const d =
        typeof opts.default === "string" ? sqlQuote(opts.default) : String(opts.default);
      colDef += ` DEFAULT ${d}`;
    }

    if (opts.check) colDef += ` CHECK(${opts.check})`;

    return colDef;
  });

  if (def.primaryKey) cols.push(`PRIMARY KEY (${def.primaryKey.join(", ")})`);
  if (def.foreignKeys) {
    def.foreignKeys.forEach((fk) => {
      cols.push(`FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}`);
    });
  }

  return `CREATE TABLE IF NOT EXISTS ${def.name} (\n  ${cols.join(",\n  ")}\n);`;
}

export const STATIC_ROLES = [
  { role_id: 1, name: "Admin" },
  { role_id: 2, name: "Management" },
  { role_id: 3, name: "Verified user" },
  { role_id: 4, name: "Regular user" },
] as const;

export async function seedRoles(): Promise<void> {
  if (!db.connection) throw new Error("DB not open");

  for (const r of STATIC_ROLES) {
    await db.connection.run(
      `INSERT OR IGNORE INTO USER_ROLES (role_id, name) VALUES (?, ?)`,
      [r.role_id, r.name]
    );
  }
}

export async function seedUsers(): Promise<void> {
  if (!db.connection) throw new Error("DB not open");

  const seed = [
    {
      role_id: 1,
      username: "admin",
      email: "admin@quizify.local",
      password: process.env.SEED_ADMIN_PASSWORD || "Admin123",
    },
    {
      role_id: 2,
      username: "manager",
      email: "manager@quizify.local",
      password: process.env.SEED_MANAGER_PASSWORD || "Manager123",
    },
    {
      role_id: 3,
      username: "verified",
      email: "verified@quizify.local",
      password: process.env.SEED_VERIFIED_PASSWORD || "Verified123",
    },
    {
      role_id: 4,
      username: "user",
      email: "user@quizify.local",
      password: process.env.SEED_USER_PASSWORD || "User123",
    },
  ];

  for (const u of seed) {
    const password_hash = hashPassword(u.password);

    await db.connection.run(
      `INSERT OR IGNORE INTO USERS
       (role_id, username, email, password_hash, verified, rank, total_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        u.role_id,
        u.username,
        u.email,
        password_hash,
        u.role_id === 3 ? 1 : 0, // verified user gets verified=1
        0,
        0,
      ]
    );
  }
}

export async function createSchemaAndData(): Promise<void> {
  if (!db.connection) throw new Error("DB not open");

  await db.connection.exec(createTableStatement(userRolesTableDef));
  await seedRoles();

  await db.connection.exec(createTableStatement(usersTableDef));
  await seedUsers();
}
