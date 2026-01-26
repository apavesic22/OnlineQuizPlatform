import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { requireRole, hashPassword } from "../helpers/auth";
import { User } from "../model/user";

export const usersRouter = Router();

usersRouter.get("/", requireRole([1, 2]), async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;

    let query = `
      SELECT u.user_id, u.username, u.email, u.verified, u.rank, u.total_score, r.role_id, r.name AS role_name
      FROM USERS u
      JOIN USER_ROLES r ON r.role_id = u.role_id
    `;
    let countQuery = `SELECT COUNT(*) as count FROM USERS u`;
    const params: any[] = [];

    if (search) {
      const filter = ` WHERE u.username LIKE ?`;
      query += filter;
      countQuery += filter;
      params.push(search);
    }

    const totalRow = await db.connection.get<{ count: number }>(
      countQuery,
      params
    );
    const total = totalRow?.count ?? 0;

    query += ` ORDER BY u.rank ASC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const users = await db.connection.all(query, queryParams);

    res.json({
      data: users,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

usersRouter.get("/leaderboard", async (req, res) => {
  try {
    if (!db.connection)
      return res.status(500).json({ error: "Database not initialized" });

    const top10 = await db.connection.all(
      `SELECT username, total_score, rank FROM USERS ORDER BY rank ASC LIMIT 10`
    );

    let currentUserStats = null;
    if (req.isAuthenticated()) {
      const user = req.user as User;
      currentUserStats = await db.connection.get(
        `SELECT username, total_score, rank FROM USERS WHERE user_id = ?`,
        [user.id]
      );
    }

    res.json({
      top10,
      currentUser: currentUserStats,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

usersRouter.post("/", requireRole([1, 2]), async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const { username, email, password, role_id, verified } = req.body;

    if (!username || !password || !role_id) {
      return res.status(400).json({
        error: "Missing required fields: username, password, role_id",
      });
    }

    const role = await db.connection.get(
      `SELECT role_id FROM USER_ROLES WHERE role_id = ?`,
      [role_id]
    );

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const existing = await db.connection.get(
      `SELECT user_id FROM USERS WHERE username = ? OR email = ?`,
      [username, email ?? null]
    );

    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    await db.connection.run(
      `
        INSERT INTO USERS
          (role_id, username, email, password_hash, verified, rank, total_score)
        VALUES (?, ?, ?, ?, ?, 0, 0)
      `,
      [
        role_id,
        username,
        email ?? null,
        hashPassword(password),
        verified ? 1 : 0,
      ]
    );

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

usersRouter.get("/:username", requireRole([1, 2]), async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const { username } = req.params;

    const user = await db.connection.get(
      `
        SELECT
          u.user_id,
          u.username,
          u.email,
          u.verified,
          u.rank,
          u.total_score,
          r.role_id,
          r.name AS role_name
        FROM USERS u
        JOIN USER_ROLES r ON r.role_id = u.role_id
        WHERE u.username = ?
      `,
      [username]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Object.keys(user).length === 0) {
      return res.status(204).send();
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

usersRouter.put("/:username", requireRole([1, 2]), async (req, res) => {
  try {
    if (!db.connection)
      return res.status(500).json({ error: "Database not initialized" });

    const { username } = req.params;
    const { email, role_id, verified } = req.body;
    const performer = req.user as User;
    const performerName = performer?.username || "System admin";

    const targetUser = await db.connection.get(
      `SELECT user_id, verified FROM USERS WHERE username = ?`,
      [username]
    );

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const updates: string[] = [];
    const values: any[] = [];

    if (email !== undefined) {
      updates.push("email = ?");
      values.push(email);
    }
    if (role_id !== undefined) {
      updates.push("role_id = ?");
      values.push(role_id);
    }
    if (verified !== undefined) {
      updates.push("verified = ?");
      values.push(verified);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields provided for update" });

    values.push(username);

    await db.connection.run(
      `UPDATE USERS SET ${updates.join(", ")} WHERE username = ?`,
      values
    );

    if (verified !== undefined && verified !== targetUser.verified) {
      const actionType = verified === 1 ? "verified" : "unverified";
      const logMessage = `${performerName} made ${username} a ${actionType} user.`;

      await db.connection.run(
        `INSERT INTO LOGS (action_performer, action, time_of_action, user_id, quiz_id) 
     VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)`,
        [performerName, logMessage, targetUser.user_id, null]
      );
    }

    res.status(200).json({
      message: "User updated successfully",
      verified: verified,
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

usersRouter.delete(
  "/:username",
  requireRole([1, 2]),
  async (req, res) => {
    try {
      if (!db.connection) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      const { username } = req.params;

      const user = await db.connection.get<{
        user_id: number;
        role_id: number;
      }>(`SELECT user_id, role_id FROM USERS WHERE username = ?`, [username]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role_id === 1) {
        return res.status(403).json({ error: "Cannot delete administrator accounts" });
      }

      await db.connection.run("BEGIN TRANSACTION");

      try {
        const uid = user.user_id;

        await db.connection.run(`DELETE FROM LOGS WHERE user_id = ?`, [uid]);
        await db.connection.run(`DELETE FROM QUIZ_LIKES WHERE user_id = ?`, [uid]);
        await db.connection.run(`DELETE FROM SUGGESTIONS WHERE user_id = ? OR reviewer_id = ?`, [uid, uid]);

        await db.connection.run(`
          DELETE FROM ATTEMPT_ANSWERS 
          WHERE attempt_id IN (SELECT attempt_id FROM QUIZ_ATTEMPTS WHERE user_id = ?)
        `, [uid]);
        await db.connection.run(`DELETE FROM QUIZ_ATTEMPTS WHERE user_id = ?`, [uid]);

        await db.connection.run(`
          DELETE FROM ANSWER_OPTIONS WHERE question_id IN (
            SELECT question_id FROM QUESTIONS WHERE quiz_id IN (
              SELECT quiz_id FROM QUIZZES WHERE user_id = ?
            )
          )
        `, [uid]);

        await db.connection.run(`
          DELETE FROM QUESTIONS WHERE quiz_id IN (SELECT quiz_id FROM QUIZZES WHERE user_id = ?)
        `, [uid]);

        await db.connection.run(`DELETE FROM QUIZZES WHERE user_id = ?`, [uid]);

        await db.connection.run(`DELETE FROM USERS WHERE user_id = ?`, [uid]);

        await db.connection.run("COMMIT");
        
        res.status(200).json({ message: `User '${username}' and all associated data deleted.` });
      } catch (innerError) {
        await db.connection.run("ROLLBACK");
        throw innerError;
      }
    } catch (err) {
      console.error("Delete Error:", err);
      res.status(500).json({ error: "Failed to delete user due to database constraints" });
    }
  }
);