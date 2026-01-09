import { Router } from "express";
import { db } from "../helpers/db";

export const suggestionsRouter = Router();

suggestionsRouter.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
    
    const { title, description } = req.body;
    const user = req.user as any;
    const userId = user.user_id || user.id;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
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