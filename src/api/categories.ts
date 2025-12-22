import { Router } from "express";
import { db } from "../helpers/db";
import { Category } from "../model/Categories"; 
import { User } from "../model/user";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const categories = await db.connection.all<Category[]>(`
      SELECT
        category_id,
        category_name,
        times_chosen
      FROM CATEGORIES
      ORDER BY category_name ASC
    `);

    if (categories.length === 0) {
      return res.status(204).send();
    }

    res.status(200).json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

categoriesRouter.post("/", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as User;

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    if (!isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { category_name } = req.body;

    if (!category_name || typeof category_name !== "string") {
      return res.status(400).json({ error: "Invalid category_name" });
    }

    const trimmedName = category_name.trim();

    if (trimmedName.length === 0) {
      return res.status(400).json({ error: "Invalid category_name" });
    }

    // ---- check uniqueness ----
    const existing = await db.connection.get(
      `SELECT category_id FROM CATEGORIES WHERE LOWER(category_name) = LOWER(?)`,
      [trimmedName]
    );

    if (existing) {
      return res.status(409).json({ error: "Category already exists" });
    }

    // ---- insert ----
    const result = await db.connection.run(
      `INSERT INTO CATEGORIES (category_name) VALUES (?)`,
      [trimmedName]
    );

    res.status(201).json({
      category_id: result.lastID,
      category_name: trimmedName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

categoriesRouter.put("/:categoryId", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as User;

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    if (!isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const categoryId = Number(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category id" });
    }

    const { category_name } = req.body;

    if (!category_name || typeof category_name !== "string") {
      return res.status(400).json({ error: "Invalid category_name" });
    }

    const trimmedName = category_name.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({ error: "Invalid category_name" });
    }

    // ---- check category exists ----
    const category = await db.connection.get(
      `SELECT category_id FROM CATEGORIES WHERE category_id = ?`,
      [categoryId]
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ---- check name uniqueness ----
    const existing = await db.connection.get(
      `
      SELECT category_id
      FROM CATEGORIES
      WHERE LOWER(category_name) = LOWER(?) AND category_id != ?
      `,
      [trimmedName, categoryId]
    );

    if (existing) {
      return res.status(409).json({ error: "Category name already exists" });
    }

    // ---- update ----
    await db.connection.run(
      `UPDATE CATEGORIES SET category_name = ? WHERE category_id = ?`,
      [trimmedName, categoryId]
    );

    res.status(200).json({
      category_id: categoryId,
      category_name: trimmedName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

categoriesRouter.delete("/:categoryId", async (req, res) => {
  try {
    if (!db.connection) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = req.user as User;

    const isAdminOrManagement =
      user.roles?.includes(1) || user.roles?.includes(2);

    if (!isAdminOrManagement) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const categoryId = Number(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category id" });
    }

    // ---- category exists ----
    const category = await db.connection.get(
      `SELECT category_id FROM CATEGORIES WHERE category_id = ?`,
      [categoryId]
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ---- check usage ----
    const usage = await db.connection.get<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM QUIZZES
      WHERE category_id = ?
      `,
      [categoryId]
    );

    if ((usage?.count ?? 0) > 0) {
      return res.status(409).json({
        error: "Category is in use and cannot be deleted",
      });
    }

    // ---- delete ----
    await db.connection.run(
      `DELETE FROM CATEGORIES WHERE category_id = ?`,
      [categoryId]
    );

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});