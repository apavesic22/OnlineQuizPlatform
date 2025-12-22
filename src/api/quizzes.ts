import { Router } from "express";
import { db } from "../helpers/db";

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

quizzesRouter.post('/', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
} );

quizzesRouter.get('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.put('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.delete('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.get('/:id/leaderboard', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.post('/:id/answer', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});