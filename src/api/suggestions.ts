import { Router } from "express";
import { db } from "../helpers/db";

export const suggestionsRouter = Router();

suggestionsRouter.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Unauthorized" });

    const { title, description } = req.body;
    const user = req.user as any;
    const userId = user.user_id || user.id;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    await db.connection?.run(
      `INSERT INTO SUGGESTIONS (user_id, title, description) VALUES (?, ?, ?)`,
      [userId, title, description]
    );

    res.status(201).json({ message: "Suggestion submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit suggestion" });
  }
});

suggestionsRouter.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const user = req.user as any;
    const isAdminOrManagement = user.roles?.includes(1) || user.roles?.includes(2);

    if (!isAdminOrManagement) return res.status(403).json({ error: "Forbidden" });

    const suggestions = await db.connection?.all(
      `
      SELECT 
        s.*, 
        u1.username, 
        u2.username AS reviewer_username
      FROM SUGGESTIONS s
      LEFT JOIN USERS u1 ON s.user_id = u1.user_id
      LEFT JOIN USERS u2 ON s.reviewer_id = u2.user_id
      ORDER BY s.suggestion_id DESC
      `
    );

    res.status(200).json(suggestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

suggestionsRouter.patch("/:id/status", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as any;
    const isAdminOrManagement = user.roles?.includes(1) || user.roles?.includes(2);

    if (!isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden: Management only" });
    }

    const suggestionId = req.params.id;
    const { status } = req.body; 

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const isReset = status === 'pending';
    const reviewerId = isReset ? null : (user.user_id || user.id);
    const reviewedAt = isReset ? null : new Date().toISOString();

    const result = await db.connection.run(
      `UPDATE SUGGESTIONS 
       SET status = ?, 
           reviewed_at = ?, 
           reviewer_id = ? 
       WHERE suggestion_id = ?`,
      [status, reviewedAt, reviewerId, suggestionId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    res.status(200).json({ 
      message: `Status updated to ${status}`,
      status: status
    });

  } catch (err) {
    console.error("Failed to update suggestion status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});