import { Router, Request } from "express";
import { db, recomputeUserRanks } from "../helpers/db";
import { User } from "../model/user";
import { LeaderboardEntry } from "../model/LeaderboardEntry";
import { requireRole } from "../helpers/auth";

export const quizzesRouter = Router();

quizzesRouter.post("/", async (req, res) => {
  try {
    if (!db.connection)
      return res.status(500).json({ error: "Database not initialized" });

    const { quiz_name, category_id, difficulty_id, questions, duration } =
      req.body;
    const user = req.user as any;

    const userRole = user?.role_id || (Array.isArray(user?.roles) ? user.roles[0] : null);
    // Check roles: 1=Admin, 2=Management, 3=Verified
    const isVerifiedOrStaff = user?.roles?.some((r: number) =>
      [1, 2, 3].includes(userRole)
    );

    const finalDuration = isVerifiedOrStaff
      ? Math.min(Math.max(duration || 15, 1), 60)
      : 15;

    // Enforcement: If NOT verified/staff and trying to add more than 5 questions, REJECT
    if (!isVerifiedOrStaff && questions.length > 5) {
      return res.status(403).json({
        error:
          "Unverified users and guests are limited to a maximum of 5 questions.",
      });
    }

    let userId: number = 4; 
    if (req.isAuthenticated() && user) {
      userId = user.user_id || user.id; // Tries both common naming conventions
    }

    console.log(`Creating quiz: "${quiz_name}" for User ID: ${userId} (Role: ${userRole})`);
    await db.connection.run("BEGIN TRANSACTION");

    // 1. Insert into QUIZZES table using provided difficulty_id
    const quizResult = await db.connection.run(
      `INSERT INTO QUIZZES 
  (user_id, category_id, difficulty_id, quiz_name, question_count, duration, is_customizable) 
  VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, // This is now guaranteed to have a value
        category_id,
        difficulty_id,
        quiz_name,
        questions.length,
        finalDuration,
        0,
      ]
    );
    const quizId = quizResult.lastID;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const typeId = q.type === "multiple" ? 1 : 2;

      // Logic for flexible time limit:
      // Use the value from the question if user is verified, otherwise default to 15
      const timeLimit = isVerifiedOrStaff && q.time_limit ? q.time_limit : 15;

      const qResult = await db.connection.run(
        `INSERT INTO QUESTIONS (quiz_id, question_type_id, question_text, position, time_limit) 
         VALUES (?, ?, ?, ?, ?)`,
        [quizId, typeId, q.text, i + 1, timeLimit]
      );
      const questionId = qResult.lastID;

      // 3. Insert ANSWER_OPTIONS
      if (q.type === "multiple") {
        for (const opt of q.options) {
          await db.connection.run(
            `INSERT INTO ANSWER_OPTIONS (question_id, answer_text, is_correct) VALUES (?, ?, ?)`,
            [questionId, opt, opt === q.correct_answer ? 1 : 0]
          );
        }
      } else {
        const bools = ["True", "False"];
        for (const b of bools) {
          await db.connection.run(
            `INSERT INTO ANSWER_OPTIONS (question_id, answer_text, is_correct) VALUES (?, ?, ?)`,
            [questionId, b, q.correct_answer === b ? 1 : 0]
          );
        }
      }
    }

    await db.connection.run("COMMIT");
    res.status(201).json({ message: "Quiz created" });
  } catch (err) {
    console.error("Database Error:", err);
    if (db.connection) await db.connection.run("ROLLBACK");
    res.status(500).json({ error: "Failed to finalize quiz" });
  }
});

quizzesRouter.get("/difficulties", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }
    const difficulties = await db.connection.all(
      "SELECT id, difficulty FROM QUIZ_DIFFICULTIES"
    );
    res.json(difficulties);
  } catch (err) {
    res.status(500).json({ error: "Could not load difficulties" });
  }
});

quizzesRouter.get("/", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // Get current user ID to check for "user_has_liked" status
    const userId = req.isAuthenticated() ? (req.user as any).user_id : 0;

    const totalRow = await db.connection.get<{ count: number }>(`
      SELECT COUNT(*) AS count FROM QUIZZES
    `);

    const total = totalRow?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(204).send();
    }

    // ---- paginated data with likes and user status ----
    const quizzes = await db.connection.all(
      `
      SELECT
        q.quiz_id,
        q.quiz_name,
        q.question_count,
        q.duration,
        q.is_customizable,
        q.created_at,
        c.category_name,
        d.difficulty,
        u.role_id,
        CASE WHEN u.user_id = 4 THEN 'Guest' ELSE u.username END AS creator,

        COUNT(ql.user_id) AS likes,

        MAX(CASE WHEN ql.user_id = ? THEN 1 ELSE 0 END) AS user_has_liked,

        (SELECT time_limit FROM QUESTIONS WHERE quiz_id = q.quiz_id LIMIT 1) as question_duration

      FROM QUIZZES q
      JOIN CATEGORIES c ON c.category_id = q.category_id
      JOIN QUIZ_DIFFICULTIES d ON d.id = q.difficulty_id
      JOIN USERS u ON u.user_id = q.user_id
      LEFT JOIN QUIZ_LIKES ql ON ql.quiz_id = q.quiz_id
      GROUP BY q.quiz_id
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [userId, limit, offset]
    );

    res.json({
      page,
      limit,
      total,
      totalPages,
      data: quizzes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});
quizzesRouter.get("/category/:category", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const categoryName = req.params.category;

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    // ---- check category exists ----
    const category = await db.connection.get<{ category_id: number }>(
      `SELECT category_id FROM CATEGORIES WHERE LOWER(category_name) = LOWER(?)`,
      [categoryName]
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ---- total count ----
    const totalRow = await db.connection.get<{ count: number }>(
      `
      SELECT COUNT(*) AS count
      FROM QUIZZES
      WHERE category_id = ?
      `,
      [category.category_id]
    );

    const total = totalRow?.count ?? 0;

    if (total === 0) {
      return res.status(204).send();
    }

    const totalPages = Math.ceil(total / limit);

    // ---- paginated data ----
    const quizzes = await db.connection.all(
      `
      SELECT
        q.quiz_id,
        q.quiz_name,
        q.question_count,
        q.duration,
        q.is_customizable,
        q.created_at,
        d.difficulty,
        u.username AS creator,
        u.role_id
      FROM QUIZZES q
      JOIN QUIZ_DIFFICULTIES d ON d.id = q.difficulty_id
      JOIN USERS u ON u.user_id = q.user_id
      WHERE q.category_id = ?
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [category.category_id, limit, offset]
    );

    res.status(200).json({
      category: categoryName,
      page,
      limit,
      total,
      totalPages,
      data: quizzes,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quizzes by category" });
  }
});

quizzesRouter.put("/:id", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    const user = req.user as User;

    // ---- fetch quiz ----
    const quiz = await db.connection.get<{
      quiz_id: number;
      user_id: number;
    }>(`SELECT quiz_id, user_id FROM QUIZZES WHERE quiz_id = ?`, [quizId]);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    const isOwner = quiz.user_id === user.id;

    if (!isOwner && !isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { quiz_name, category_id, difficulty_id, duration, question_count } =
      req.body;

    // ---- no fields ----
    if (
      quiz_name === undefined &&
      category_id === undefined &&
      difficulty_id === undefined &&
      duration === undefined &&
      question_count === undefined
    ) {
      return res.status(204).send();
    }

    // ---- role-based validation ----
    const isVerified = user.roles?.includes(3);

    if (
      !isVerified &&
      (duration !== undefined || question_count !== undefined)
    ) {
      return res.status(403).json({
        error: "Only verified users can change duration or question count",
      });
    }

    // ---- foreign key validation ----
    if (category_id !== undefined) {
      const c = await db.connection.get(
        `SELECT category_id FROM CATEGORIES WHERE category_id = ?`,
        [category_id]
      );
      if (!c) return res.status(400).json({ error: "Invalid category_id" });
    }

    if (difficulty_id !== undefined) {
      const d = await db.connection.get(
        `SELECT id FROM QUIZ_DIFFICULTIES WHERE id = ?`,
        [difficulty_id]
      );
      if (!d) return res.status(400).json({ error: "Invalid difficulty_id" });
    }

    // ---- build update dynamically ----
    const updates: string[] = [];
    const values: any[] = [];

    if (quiz_name !== undefined) {
      updates.push("quiz_name = ?");
      values.push(quiz_name);
    }

    if (category_id !== undefined) {
      updates.push("category_id = ?");
      values.push(category_id);
    }

    if (difficulty_id !== undefined) {
      updates.push("difficulty_id = ?");
      values.push(difficulty_id);
    }

    if (duration !== undefined) {
      updates.push("duration = ?");
      values.push(duration);
    }

    if (question_count !== undefined) {
      updates.push("question_count = ?");
      values.push(question_count);
    }

    values.push(quizId);

    await db.connection.run(
      `UPDATE QUIZZES SET ${updates.join(", ")} WHERE quiz_id = ?`,
      values
    );

    res.status(200).json({ message: "Quiz updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update quiz" });
  }
});

quizzesRouter.delete("/:id", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    const user = req.user as User;

    // ---- fetch quiz ----
    const quiz = await db.connection.get<{
      quiz_id: number;
      user_id: number;
    }>(`SELECT quiz_id, user_id FROM QUIZZES WHERE quiz_id = ?`, [quizId]);

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    const isOwner = quiz.user_id === user.id;

    if (!isOwner && !isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // ---- delete in FK-safe order ----

    // delete logs
    await db.connection.run(`DELETE FROM LOGS WHERE quiz_id = ?`, [quizId]);

    // delete likes
    await db.connection.run(`DELETE FROM QUIZ_LIKES WHERE quiz_id = ?`, [
      quizId,
    ]);

    // delete attempt answers
    await db.connection.run(
      `
      DELETE FROM ATTEMPT_ANSWERS
      WHERE attempt_id IN (
        SELECT attempt_id FROM QUIZ_ATTEMPTS WHERE quiz_id = ?
      )
      `,
      [quizId]
    );

    // delete attempts
    await db.connection.run(`DELETE FROM QUIZ_ATTEMPTS WHERE quiz_id = ?`, [
      quizId,
    ]);

    // delete answer options
    await db.connection.run(
      `
      DELETE FROM ANSWER_OPTIONS
      WHERE question_id IN (
        SELECT question_id FROM QUESTIONS WHERE quiz_id = ?
      )
      `,
      [quizId]
    );

    // delete questions
    await db.connection.run(`DELETE FROM QUESTIONS WHERE quiz_id = ?`, [
      quizId,
    ]);

    // delete quiz
    await db.connection.run(`DELETE FROM QUIZZES WHERE quiz_id = ?`, [quizId]);

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

quizzesRouter.get("/:id/questions", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    // ---- quiz exists ----
    const quiz = await db.connection.get(
      `SELECT quiz_id FROM QUIZZES WHERE quiz_id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // ---- fetch questions ----
    const questions = await db.connection.all<
      {
        question_id: number;
        question_text: string;
        time_limit: number;
        type: string;
      }[]
    >(
      `
      SELECT
        q.question_id,
        q.question_text,
        q.time_limit,
        qt.type
      FROM QUESTIONS q
      JOIN QUESTION_TYPES qt ON qt.id = q.question_type_id
      WHERE q.quiz_id = ?
      ORDER BY q.position ASC
    `,
      [quizId]
    );

    if (questions.length === 0) {
      return res.status(204).send();
    }

    // ---- attach answers ----
    for (const q of questions) {
      const answers = await db.connection.all(
        `
        SELECT
          answer_id,
          answer_text,
          is_correct
        FROM ANSWER_OPTIONS
        WHERE question_id = ?
        `,
        [q.question_id]
      );

      (q as any).answers = answers;
    }

    res.status(200).json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load questions" });
  }
});

quizzesRouter.post(
  "/:id/submit",
  requireRole([1, 2, 3, 4]),
  async (req: Request, res) => {
    try {
      if (!db.connection) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      const quizId = Number(req.params.id);
      if (Number.isNaN(quizId)) {
        return res.status(400).json({ error: "Invalid quiz id" });
      }

      const user = req.user as User;
      const answers = req.body.answers; // Expects an array of { question_id: number, answer_id: number }

      if (!Array.isArray(answers)) {
        return res
          .status(400)
          .json({ error: "Invalid request body, expected 'answers' array" });
      }

      // --- Get quiz and difficulty ---
      const quiz = await db.connection.get<{ difficulty: string }>(
        `SELECT d.difficulty 
             FROM QUIZZES q
             JOIN QUIZ_DIFFICULTIES d ON q.difficulty_id = d.id
             WHERE q.quiz_id = ?`,
        [quizId]
      );

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      // --- Define scoring ---
      const pointsPerDifficulty: { [key: string]: number } = {
        Easy: 10,
        Medium: 20,
        Hard: 30,
      };
      const pointsPerAnswer = pointsPerDifficulty[quiz.difficulty] || 10;

      let score = 0;
      let correctAnswersCount = 0;

      // --- Get all correct answers for the quiz at once ---
      const correctAnswers: { question_id: number; answer_id: number }[] =
        await db.connection.all(
          `SELECT q.question_id, ao.answer_id
             FROM QUESTIONS q
             JOIN ANSWER_OPTIONS ao ON q.question_id = ao.question_id
             WHERE q.quiz_id = ? AND ao.is_correct = 1`,
          [quizId]
        );

      const correctAnswerMap = new Map<number, number>();
      correctAnswers.forEach((row) => {
        correctAnswerMap.set(row.question_id, row.answer_id);
      });

      // --- Calculate score ---
      for (const userAnswer of answers) {
        if (
          correctAnswerMap.get(userAnswer.question_id) === userAnswer.answer_id
        ) {
          score += pointsPerAnswer;
          correctAnswersCount++;
        }
      }

      const incorrectAnswersCount = answers.length - correctAnswersCount;

      // --- Record the attempt ---
      await db.connection.run(
        `INSERT INTO QUIZ_ATTEMPTS (user_id, quiz_id, score, finished_at, total_time_ms)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0)`,
        [user.id, quizId, score]
      );

      // --- Update user's total score ---
      await db.connection.run(
        `UPDATE USERS SET total_score = total_score + ? WHERE user_id = ?`,
        [score, user.id]
      );

      // --- Recompute ranks ---
      await recomputeUserRanks();

      const leaderboard = await db.connection.all(
        `SELECT u.username, u.total_score, u.rank 
       FROM USERS u 
       ORDER BY u.rank ASC LIMIT 10`
      );

      const currentUserStats = await db.connection.get(
        `SELECT username, total_score, rank FROM USERS WHERE user_id = ?`,
        [user.id]
      );

      res.status(200).json({
        message: "Quiz submitted successfully!",
        score: score,
        correctAnswers: correctAnswersCount,
        incorrectAnswers: incorrectAnswersCount,
        leaderboard: leaderboard,
        currentUserStats: currentUserStats,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit quiz answers" });
    }
  }
);

quizzesRouter.get("/:id/leaderboard", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    const user = req.user as User;

    // ---- quiz exists ----
    const quiz = await db.connection.get(
      `SELECT quiz_id FROM QUIZZES WHERE quiz_id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const leaderboard = await db.connection.all<LeaderboardEntry[]>(
      `
  SELECT
    u.user_id,
    u.username,
    qa.score,
    ROW_NUMBER() OVER (
      ORDER BY qa.score DESC, qa.finished_at ASC
    ) AS rank
  FROM QUIZ_ATTEMPTS qa
  JOIN USERS u ON u.user_id = qa.user_id
  WHERE qa.quiz_id = ?
`,
      [quizId]
    );

    if (leaderboard.length === 0) {
      return res.status(204).send();
    }

    const top10 = leaderboard.slice(0, 10);

    const currentUserEntry = leaderboard.find(
      (entry) => entry.user_id === user.id
    );

    res.status(200).json({
      quiz_id: quizId,
      top10,
      currentUser:
        currentUserEntry && currentUserEntry.rank > 10
          ? currentUserEntry
          : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

quizzesRouter.post("/:id/answer", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    const user = req.user as User;
    const { attempt_id, answers } = req.body;

    if (!attempt_id || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const attempt = await db.connection.get<{
      attempt_id: number;
      user_id: number;
      quiz_id: number;
    }>(
      `SELECT attempt_id, user_id, quiz_id FROM QUIZ_ATTEMPTS WHERE attempt_id = ?`,
      [attempt_id]
    );

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.quiz_id !== quizId || attempt.user_id !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let score = 0;

    for (const a of answers) {
      const { question_id, answer_id, time_taken_ms } = a;

      // ---- validate question ----
      const question = await db.connection.get(
        `SELECT question_id FROM QUESTIONS WHERE question_id = ? AND quiz_id = ?`,
        [question_id, quizId]
      );

      if (!question) {
        return res.status(400).json({ error: "Invalid question" });
      }

      // ---- validate answer ----
      const answer = await db.connection.get<{ is_correct: number }>(
        `
        SELECT is_correct
        FROM ANSWER_OPTIONS
        WHERE answer_id = ? AND question_id = ?
        `,
        [answer_id, question_id]
      );

      if (!answer) {
        return res.status(400).json({ error: "Invalid answer option" });
      }

      const isCorrect = answer.is_correct === 1;
      if (isCorrect) score++;

      // ---- store answer ----
      await db.connection.run(
        `
        INSERT INTO ATTEMPT_ANSWERS
          (attempt_id, question_id, answer_id, is_correct, time_taken_ms)
        VALUES (?, ?, ?, ?, ?)
        `,
        [attempt_id, question_id, answer_id, isCorrect ? 1 : 0, time_taken_ms]
      );
    }

    // ---- update attempt ----
    await db.connection.run(
      `
      UPDATE QUIZ_ATTEMPTS
      SET score = ?, finished_at = CURRENT_TIMESTAMP
      WHERE attempt_id = ?
      `,
      [score, attempt_id]
    );

    res.status(200).json({
      message: "Answers submitted",
      score,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit answers" });
  }
});

quizzesRouter.post("/:id/attempts", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ error: "Invalid quiz id" });
    }

    const user = req.user as User;

    // ---- quiz exists ----
    const quiz = await db.connection.get(
      `SELECT quiz_id FROM QUIZZES WHERE quiz_id = ?`,
      [quizId]
    );

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // ---- prevent multiple attempts (recommended) ----
    const existingAttempt = await db.connection.get(
      `
      SELECT attempt_id
      FROM QUIZ_ATTEMPTS
      WHERE quiz_id = ? AND user_id = ?
      `,
      [quizId, user.id]
    );

    if (existingAttempt) {
      return res.status(409).json({
        error: "You have already attempted this quiz",
      });
    }

    // ---- create attempt ----
    const result = await db.connection.run(
      `
      INSERT INTO QUIZ_ATTEMPTS
        (user_id, quiz_id, score, total_time_ms)
      VALUES (?, ?, 0, 0)
      `,
      [user.id, quizId]
    );

    const attempt = await db.connection.get(
      `
      SELECT attempt_id, started_at
      FROM QUIZ_ATTEMPTS
      WHERE attempt_id = ?
      `,
      [result.lastID]
    );

    res.status(201).json(attempt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start quiz attempt" });
  }
});

quizzesRouter.get("/my-stats", async (req, res) => {
  try {
    if (!db.connection)
      return res.status(500).json({ error: "Database not initialized" });
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const user = req.user as User;
    // Important: Use user_id to match your database column name
    const userId = user.id;

    const personalStats = await db.connection.all(
      `
      SELECT 
        q.quiz_name,
        qa.score AS your_score,
        qa.finished_at,
        c.category_name,
        q.question_count as total_questions
      FROM QUIZ_ATTEMPTS qa
      JOIN QUIZZES q ON qa.quiz_id = q.quiz_id
      JOIN CATEGORIES c ON q.category_id = c.category_id
      WHERE qa.user_id = ? 
      ORDER BY qa.finished_at DESC
    `,
      [userId]
    );

    res.json(personalStats);
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch your statistics" });
  }
});

quizzesRouter.post("/:id/like", async (req, res) => {
  try {
    if (!db.connection)
      return res.status(500).json({ error: "DB connection lost" });
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const quizId = Number(req.params.id);
    const user = req.user as any;

    // Safety check: try user_id first, then id as a backup
    const userId = user.user_id || user.id;

    if (!userId) {
      console.error("User ID is missing from session:", user);
      return res
        .status(400)
        .json({ error: "User identity lost. Please re-login." });
    }

    // 1. Check if like exists
    const existing = await db.connection.get(
      "SELECT * FROM QUIZ_LIKES WHERE user_id = ? AND quiz_id = ?",
      [userId, quizId]
    );

    if (existing) {
      // 2. Remove like
      await db.connection.run(
        "DELETE FROM QUIZ_LIKES WHERE user_id = ? AND quiz_id = ?",
        [userId, quizId]
      );
      return res.json({ liked: false });
    } else {
      // 3. Add like
      await db.connection.run(
        "INSERT INTO QUIZ_LIKES (user_id, quiz_id) VALUES (?, ?)",
        [userId, quizId]
      );
      return res.json({ liked: true });
    }
  } catch (err) {
    // This will show exactly what crashed in your terminal/console
    console.error("SQL Error in Like Route:", err);
    res.status(500).json({ error: "Internal Server Error during Like toggle" });
  }
});
