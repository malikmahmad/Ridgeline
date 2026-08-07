import { Router } from "express";
import { get, all, run } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyToken } from "../utils/jwt.js";
import { notFound, forbidden } from "../utils/apiError.js";

const router = Router();

export const sseClients = new Map();

export function pushToUser(userId, payload) {
  const conns = sseClients.get(String(userId));
  if (!conns) return;
  const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of conns) {
    try { res.write(data); } catch { /* closed */ }
  }
}

router.get("/stream", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  let payload;
  try { payload = verifyToken(token); } catch { return res.status(401).end(); }
  const user = await get("SELECT id, is_active FROM users WHERE id = ?", [payload.id]);
  if (!user || !user.is_active) return res.status(401).end();

  const uid = String(user.id);
  res.setHeader("Content-Type",      "text/event-stream");
  res.setHeader("Cache-Control",     "no-cache");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (!sseClients.has(uid)) sseClients.set(uid, new Set());
  sseClients.get(uid).add(res);

  const ping = setInterval(() => {
    try { res.write("event: ping\ndata: {}\n\n"); } catch { clearInterval(ping); }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    const s = sseClients.get(uid);
    if (s) { s.delete(res); if (s.size === 0) sseClients.delete(uid); }
  });
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await all(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
      [req.user.id]
    );
    const uc = await get(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user.id]
    );
    res.json({ notifications, unreadCount: Number(uc.count) || 0 });
  } catch (err) { next(err); }
});

router.patch("/:id/read", async (req, res, next) => {
  try {
    const notif = await get("SELECT * FROM notifications WHERE id = ?", [req.params.id]);
    if (!notif) throw notFound("Notification not found.");
    if (notif.user_id !== req.user.id) throw forbidden("That notification belongs to someone else.");
    await run("UPDATE notifications SET is_read = 1 WHERE id = ?", [req.params.id]);
    res.json({ message: "Marked as read." });
  } catch (err) { next(err); }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
    res.json({ message: "All notifications marked as read." });
  } catch (err) { next(err); }
});

export default router;
