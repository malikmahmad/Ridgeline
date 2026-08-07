import { Router } from "express";
import bcrypt from "bcryptjs";
import { get, all, run } from "../db/connection.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { badRequest, notFound, conflict, forbidden } from "../utils/apiError.js";
import { createUserSchema, updateUserSchema, parseOrThrow } from "../utils/validators.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function publicUser(row) {
  return {
    id:        row.id,
    name:      row.name,
    email:     row.email,
    role:      row.role,
    title:     row.title,
    isActive:  row.is_active === 1 || row.is_active === true,
    createdAt: row.created_at,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { role } = req.query;
    const rows = role
      ? await all("SELECT * FROM users WHERE role = ? ORDER BY name ASC", [role])
      : await all("SELECT * FROM users ORDER BY name ASC");
    res.json({ users: rows.map(publicUser) });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const data  = parseOrThrow(createUserSchema, req.body, badRequest);
    const taken = await get("SELECT id FROM users WHERE email = ?", [data.email]);
    if (taken) throw conflict("An account with this email already exists.");
    const result = await run(
      "INSERT INTO users (name, email, password_hash, role, title) VALUES (?, ?, ?, ?, ?)",
      [data.name, data.email, bcrypt.hashSync(data.password, 10), data.role, data.title]
    );
    const user = await get("SELECT * FROM users WHERE id = ?", [result.lastInsertRowid]);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const existing = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!existing) throw notFound("User not found.");
    const data = parseOrThrow(updateUserSchema, req.body, badRequest);
    if (Number(req.params.id) === req.user.id && data.role !== "admin") {
      throw forbidden("You cannot remove your own admin role.");
    }
    await run(
      "UPDATE users SET name = ?, role = ?, title = ?, is_active = ? WHERE id = ?",
      [data.name, data.role, data.title, data.isActive ? 1 : 0, req.params.id]
    );
    const user = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) throw forbidden("You cannot delete your own account.");
    const existing = await get("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!existing) throw notFound("User not found.");
    await run("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted." });
  } catch (err) {
    if (err?.message?.includes("FOREIGN KEY") || err?.message?.includes("constraint")) {
      return next(conflict("This user has linked records. Deactivate the account instead."));
    }
    next(err);
  }
});

export default router;
