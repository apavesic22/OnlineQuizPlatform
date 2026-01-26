import { Router } from "express";
import { db } from "../helpers/db";

export const difficultiesRouter = Router();

difficultiesRouter.get("/", async (req, res) => {
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
