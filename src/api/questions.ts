import { Router } from "express";
import { db } from "../helpers/db";
import { User } from "../model/user";

export const questionsRouter = Router();

questionsRouter.put("/:questionId", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const questionId = Number(req.params.questionId);
    if (Number.isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question id" });
    }

    const user = req.user as User;

    const { question_type_id, question_text, position, time_limit, answers } =
      req.body;

    const question = await db.connection.get<{
      question_id: number;
      quiz_id: number;
      user_id: number;
    }>(
      `
      SELECT q.question_id, q.quiz_id, quiz.user_id
      FROM QUESTIONS q
      JOIN QUIZZES quiz ON quiz.quiz_id = q.quiz_id
      WHERE q.question_id = ?
      `,
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    if (question.user_id !== user.id && !isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      question_type_id === undefined &&
      question_text === undefined &&
      position === undefined &&
      time_limit === undefined &&
      answers === undefined
    ) {
      return res.status(204).send();
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (question_type_id !== undefined) {
      updates.push("question_type_id = ?");
      values.push(question_type_id);
    }

    if (question_text !== undefined) {
      updates.push("question_text = ?");
      values.push(question_text);
    }

    if (position !== undefined) {
      updates.push("position = ?");
      values.push(position);
    }

    if (time_limit !== undefined) {
      updates.push("time_limit = ?");
      values.push(time_limit);
    }

    if (updates.length > 0) {
      values.push(questionId);
      await db.connection.run(
        `UPDATE QUESTIONS SET ${updates.join(", ")} WHERE question_id = ?`,
        values
      );
    }

    if (Array.isArray(answers)) {
      if (!answers.some((a) => a.is_correct === true)) {
        return res
          .status(400)
          .json({ error: "At least one answer must be correct" });
      }

      for (const a of answers) {
        if (!a.answer_id) continue;

        await db.connection.run(
          `
          UPDATE ANSWER_OPTIONS
          SET answer_text = ?, is_correct = ?
          WHERE answer_id = ? AND question_id = ?
          `,
          [a.answer_text, a.is_correct ? 1 : 0, a.answer_id, questionId]
        );
      }
    }

    res.status(200).json({ message: "Question updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update question" });
  }
});

questionsRouter.delete("/:questionId", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const questionId = Number(req.params.questionId);
    if (Number.isNaN(questionId)) {
      return res.status(400).json({ error: "Invalid question id" });
    }

    const user = req.user as User;

    const question = await db.connection.get<{
      question_id: number;
      quiz_id: number;
      user_id: number;
    }>(
      `
      SELECT q.question_id, q.quiz_id, quiz.user_id
      FROM QUESTIONS q
      JOIN QUIZZES quiz ON quiz.quiz_id = q.quiz_id
      WHERE q.question_id = ?
      `,
      [questionId]
    );

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    if (question.user_id !== user.id && !isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.connection.run(
      `DELETE FROM ATTEMPT_ANSWERS WHERE question_id = ?`,
      [questionId]
    );

    await db.connection.run(
      `DELETE FROM ANSWER_OPTIONS WHERE question_id = ?`,
      [questionId]
    );

    await db.connection.run(
      `DELETE FROM QUESTIONS WHERE question_id = ?`,
      [questionId]
    );

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete question" });
  }
});