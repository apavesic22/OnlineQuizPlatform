import { Router, Request } from "express";
import { db } from "../helpers/db";
import { User } from "../model/user";
import { LeaderboardEntry } from "../model/LeaderboardEntry";

export const quizzesRouter = Router();

quizzesRouter.get("/", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const totalRow = await db.connection.get<{ count: number }>(`
      SELECT COUNT(*) AS count FROM QUIZZES
    `);

    const total = totalRow?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    if (total === 0) {
      return res.status(204).send();
    }

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

        c.category_name,
        d.difficulty,

        u.username AS creator,

        COUNT(ql.user_id) AS likes
      FROM QUIZZES q
      JOIN CATEGORIES c ON c.category_id = q.category_id
      JOIN QUIZ_DIFFICULTIES d ON d.id = q.difficulty_id
      JOIN USERS u ON u.user_id = q.user_id
      LEFT JOIN QUIZ_LIKES ql ON ql.quiz_id = q.quiz_id
      GROUP BY q.quiz_id
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset]
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

quizzesRouter.post("/", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as User;

    const { quiz_name, category_id, difficulty_id, question_count, duration } =
      req.body;

    // ---- validation ----
    if (!quiz_name || !category_id || !difficulty_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ---- category exists ----
    const category = await db.connection.get(
      `SELECT category_id FROM CATEGORIES WHERE category_id = ?`,
      [category_id]
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ---- difficulty exists ----
    const difficulty = await db.connection.get(
      `SELECT id FROM QUIZ_DIFFICULTIES WHERE id = ?`,
      [difficulty_id]
    );

    if (!difficulty) {
      return res.status(404).json({ error: "Difficulty not found" });
    }

    // ---- uniqueness (same user, same name) ----
    const existing = await db.connection.get(
      `
      SELECT quiz_id
      FROM QUIZZES
      WHERE user_id = ? AND quiz_name = ?
      `,
      [user.id, quiz_name]
    );

    if (existing) {
      return res.status(409).json({ error: "Quiz already exists" });
    }

    // ---- role-based customization ----
    const isVerified = user.roles?.includes(3);

    const finalQuestionCount =
      isVerified && question_count ? question_count : 10;

    const finalDuration = isVerified && duration ? duration : 300;

    const isCustomizable = isVerified ? 1 : 0;

    // ---- insert quiz ----
    const result = await db.connection.run(
      `
      INSERT INTO QUIZZES
        (user_id, category_id, difficulty_id,
         quiz_name, question_count, duration, is_customizable)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        category_id,
        difficulty_id,
        quiz_name,
        finalQuestionCount,
        finalDuration,
        isCustomizable,
      ]
    );

    res.status(201).json({
      quiz_id: result.lastID,
      message: "Quiz created successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create quiz" });
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
        u.username AS creator
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
