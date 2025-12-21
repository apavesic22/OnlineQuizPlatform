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

export const categoriesTableDef = {
  name: "CATEGORIES",
  columns: {
    category_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    category_name: { type: "TEXT", notNull: true, unique: true },
    times_chosen: { type: "INTEGER", notNull: true, default: 0 },
  },
};

export const categorySuggestionsTableDef = {
  name: "CATEGORY_SUGGESTIONS",
  columns: {
    suggestion_id: { type: "INTEGER", primaryKey: true, autoincrement: true },

    user_id: { type: "INTEGER", notNull: true },
    name: { type: "TEXT", notNull: true },

    status: {
      type: "TEXT",
      notNull: true,
      default: "pending",
      check: "status IN ('pending','approved','rejected')",
    },

    created_at: { type: "DATETIME", notNull: true, defaultRaw: "CURRENT_TIMESTAMP" },
    reviewed_at: { type: "DATETIME" },
    reviewer_id: { type: "INTEGER" },
  },
  foreignKeys: [
    { column: "user_id", references: "USERS(user_id)" },
    { column: "reviewer_id", references: "USERS(user_id)" },
  ],
};

export const questionTypesTableDef = {
  name: "QUESTION_TYPES",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    type: { type: "TEXT", notNull: true, unique: true },
  },
};

export const quizDifficultiesTableDef = {
  name: "QUIZ_DIFFICULTIES",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    difficulty: { type: "TEXT", notNull: true, unique: true },
  },
};


export const questionsTableDef = {
  name: "QUESTIONS",
  columns: {
    question_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    category_id: { type: "INTEGER", notNull: true },
    question_type_id: { type: "INTEGER", notNull: true },
    question_text: { type: "TEXT", notNull: true },
    difficulty_id: { type: "INTEGER", notNull: true },
  },
  foreignKeys: [
    { column: "category_id", references: "CATEGORIES(category_id)" },
    { column: "question_type_id", references: "QUESTION_TYPES(id)" },
    { column: "difficulty_id", references: "QUIZ_DIFFICULTIES(id)" }, 
  ],
};

export const quizzesTableDef = {
  name: "QUIZZES",
  columns: {
    quiz_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true }, 
    category_id: { type: "INTEGER", notNull: true },
    difficulty_id: { type: "INTEGER", notNull: true },

    quiz_name: { type: "TEXT", notNull: true },
    question_count: { type: "INTEGER", notNull: true, default: 10 },
    is_customizable: { type: "INTEGER", notNull: true, default: 0 },
    duration: { type: "INTEGER", notNull: true },
    created_at: { type: "DATETIME", notNull: true, defaultRaw: "CURRENT_TIMESTAMP" },
  },
  foreignKeys: [
    { column: "user_id", references: "USERS(user_id)" },
    { column: "category_id", references: "CATEGORIES(category_id)" },
    { column: "difficulty_id", references: "QUIZ_DIFFICULTIES(id)" },
  ],
};

export const quizQuestionsTableDef = {
  name: "QUIZ_QUESTIONS",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    quiz_id: { type: "INTEGER", notNull: true },
    question_id: { type: "INTEGER", notNull: true },
    position: { type: "INTEGER", notNull: true },
    time_limit: { type: "INTEGER", notNull: true, default: 15 },
  },
  foreignKeys: [
    { column: "quiz_id", references: "QUIZZES(quiz_id)" },
    { column: "question_id", references: "QUESTIONS(question_id)" },
  ],
};

export const attemptAnswersTableDef = {
  name: "ATTEMPT_ANSWERS",
  columns: {
    attempt_answer_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    attempt_id: { type: "INTEGER", notNull: true },
    question_id: { type: "INTEGER", notNull: true },
    answer_id: { type: "INTEGER", notNull: true },
    is_correct: { type: "INTEGER", notNull: true },
    time_taken_ms: { type: "INTEGER", notNull: true },
  },
  foreignKeys: [
    { column: "attempt_id", references: "QUIZ_ATTEMPTS(attempt_id)" },
    { column: "question_id", references: "QUESTIONS(question_id)" },
    { column: "answer_id", references: "ANSWER_OPTIONS(answer_id)" },
  ],
};

export const answerOptionsTableDef = {
  name: "ANSWER_OPTIONS",
  columns: {
    answer_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    question_id: { type: "INTEGER", notNull: true },
    answer_text: { type: "TEXT", notNull: true },
    is_correct: { type: "INTEGER", notNull: true, default: 0 },
  },
  foreignKeys: [
    { column: "question_id", references: "QUESTIONS(question_id)" },
  ],
};

export const quizLikesTableDef = {
  name: "QUIZ_LIKES",
  columns: {
    user_id: { type: "INTEGER", notNull: true },
    quiz_id: { type: "INTEGER", notNull: true },
    created_at: { type: "DATETIME", notNull: true, defaultRaw: "CURRENT_TIMESTAMP" },
  },
  primaryKey: ["user_id", "quiz_id"],
  foreignKeys: [
    { column: "user_id", references: "USERS(user_id)" },
    { column: "quiz_id", references: "QUIZZES(quiz_id)" },
  ],
};

export const logsTableDef = {
  name: "LOGS",
  columns: {
    log_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    action_performer: { type: "TEXT" },
    action: { type: "TEXT" },
    time_of_action: { type: "DATETIME", defaultRaw: "CURRENT_TIMESTAMP" },

    user_id: { type: "INTEGER", notNull: true },
    quiz_id: { type: "INTEGER", notNull: true },
  },
  foreignKeys: [
    { column: "user_id", references: "USERS(user_id)" },
    { column: "quiz_id", references: "QUIZZES(quiz_id)" },
  ],
};

export const quizAttemptsTableDef = {
  name: "QUIZ_ATTEMPTS",
  columns: {
    attempt_id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true },
    quiz_id: { type: "INTEGER", notNull: true },
    score: { type: "INTEGER", notNull: true },

    started_at: { type: "DATETIME", notNull: true, defaultRaw: "CURRENT_TIMESTAMP" },
    finished_at: { type: "DATETIME" },
    total_time_ms: { type: "INTEGER", notNull: true },
  },
  foreignKeys: [
    { column: "user_id", references: "USERS(user_id)" },
    { column: "quiz_id", references: "QUIZZES(quiz_id)" },
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

function seedQuizDifficulties() {
  if (!db.connection) throw new Error("DB not open");

  const difficulties = [
    { id: 1, difficulty: "Easy" },
    { id: 2, difficulty: "Medium" },
    { id: 3, difficulty: "Hard" },
  ]

  for (const d of difficulties) {
    db.connection.run(
      `INSERT OR IGNORE INTO QUIZ_DIFFICULTIES (id_quiz_difficulty, difficulty) VALUES (?, ?)`,
      [d.id, d.difficulty]
    );
  }
}

function seedQuestionTypes() {
  if (!db.connection) throw new Error("DB not open");

  const types = [
    { id: 1, type: "Multiple Choice" },
    { id: 2, type: "True/False" }
  ]

  for (const t of types) {
    db.connection.run(
      `INSERT OR IGNORE INTO QUESTION_TYPES (id, type) VALUES (?, ?)`,
      [t.id, t.type]
    );
  }
}

const indexStatements = [
  `CREATE INDEX IF NOT EXISTS idx_users_role ON USERS(role_id);`,
  `CREATE INDEX IF NOT EXISTS idx_category_suggestions_status ON CATEGORY_SUGGESTIONS(status);`,

  `CREATE INDEX IF NOT EXISTS idx_questions_category ON QUESTIONS(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_questions_type ON QUESTIONS(question_type_id);`,
  `CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON QUESTIONS(difficulty_id);`,

  `CREATE INDEX IF NOT EXISTS idx_quizzes_user ON QUIZZES(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_category ON QUIZZES(category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON QUIZZES(difficulty_id);`,

  `CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON QUIZ_QUESTIONS(quiz_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_questions_question ON QUIZ_QUESTIONS(question_id);`,

  `CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON ATTEMPT_ANSWERS(attempt_id);`,
  `CREATE INDEX IF NOT EXISTS idx_attempt_answers_question ON ATTEMPT_ANSWERS(question_id);`,

  `CREATE INDEX IF NOT EXISTS idx_answer_options_question ON ANSWER_OPTIONS(question_id);`,

  `CREATE INDEX IF NOT EXISTS idx_logs_user ON LOGS(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_logs_quiz ON LOGS(quiz_id);`,
];



export async function createSchemaAndData(): Promise<void> {
  if (!db.connection) throw new Error("DB not open");

  await db.connection.exec(createTableStatement(userRolesTableDef));
  await seedRoles();
  console.log("User roles loaded");
  

  await db.connection.exec(createTableStatement(usersTableDef));
  await seedUsers();
  console.log("Users loaded");
  
  await db.connection.exec(createTableStatement(categoriesTableDef));
  console.log("Categories table created");

  await db.connection.exec(createTableStatement(categorySuggestionsTableDef));
  console.log("Category suggestions table created");

  await db.connection.exec(createTableStatement(questionTypesTableDef));
  await seedQuestionTypes(); 
  console.log("Question types loaded");

  await db.connection.exec(createTableStatement(quizDifficultiesTableDef));
  await seedQuizDifficulties();
  console.log("Quiz difficulties loaded");

  await db.connection.exec(createTableStatement(questionsTableDef));
  console.log("Questions table created");

  await db.connection.exec(createTableStatement(quizzesTableDef));
  console.log("Quizzes table created");

  await db.connection.exec(createTableStatement(quizQuestionsTableDef));
  console.log("Quiz questions table created");

  await db.connection.exec(createTableStatement(attemptAnswersTableDef));
  console.log("Attempt answers table created");

  await db.connection.exec(createTableStatement(answerOptionsTableDef));
  console.log("Answer options table created");

  await db.connection.exec(createTableStatement(quizLikesTableDef));
  console.log("Quiz likes table created");

  await db.connection.exec(createTableStatement(logsTableDef));
  console.log("Logs table created");

  await db.connection.exec(createTableStatement(quizAttemptsTableDef));
  console.log("Quiz attempts table created");

  for (const stmt of indexStatements) {
  await db.connection.exec(stmt);
}
  console.log("Indexes created");
}


