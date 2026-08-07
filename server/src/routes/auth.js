import { Router } from "express";
import bcrypt from "bcryptjs";
import { get, run } from "../db/connection.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, conflict, unauthorized } from "../utils/apiError.js";
import {
  registerSchema, loginSchema, updateProfileSchema,
  changePasswordSchema, parseOrThrow,
} from "../utils/validators.js";

const router = Router();

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, title: row.title };
}

router.post("/register", async (req, res, next) => {
  try {
    const data  = parseOrThrow(registerSchema, req.body, badRequest);
    const taken = await get("SELECT id FROM users WHERE email = ?", [data.email]);
    if (taken) throw conflict("An account with this email already exists.");

    const hash   = bcrypt.hashSync(data.password, 10);
    const result = await run(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')",
      [data.name, data.email, hash]
    );
    const user = await get("SELECT * FROM users WHERE id = ?", [result.lastInsertRowid]);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = parseOrThrow(loginSchema, req.body, badRequest);
    const user = await get("SELECT * FROM users WHERE email = ?", [data.email]);
    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      throw unauthorized("Incorrect email or password.");
    }
    if (!user.is_active) {
      throw unauthorized("This account has been deactivated. Contact your administrator.");
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const data = parseOrThrow(updateProfileSchema, req.body, badRequest);
    await run("UPDATE users SET name = ?, title = ? WHERE id = ?", [data.name, data.title, req.user.id]);
    const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

router.put("/me/password", requireAuth, async (req, res, next) => {
  try {
    const data = parseOrThrow(changePasswordSchema, req.body, badRequest);
    const row  = await get("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (!bcrypt.compareSync(data.currentPassword, row.password_hash)) {
      throw badRequest("Current password is incorrect.");
    }
    await run("UPDATE users SET password_hash = ? WHERE id = ?",
      [bcrypt.hashSync(data.newPassword, 10), req.user.id]);
    res.json({ message: "Password updated." });
  } catch (err) { next(err); }
});

export default router;
