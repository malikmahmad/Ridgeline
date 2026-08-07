import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { runMigrations } from "./db/connection.js";
import { seed } from "./db/seed.js";
import { checkApproachingDeadlines } from "./utils/deadlineCheck.js";

import authRoutes         from "./routes/auth.js";
import adminUserRoutes    from "./routes/adminUsers.js";
import projectRoutes      from "./routes/projects.js";
import taskRoutes         from "./routes/tasks.js";
import commentRoutes      from "./routes/comments.js";
import notificationRoutes from "./routes/notifications.js";
import dashboardRoutes    from "./routes/dashboard.js";
import activityRoutes     from "./routes/activity.js";
import attachmentRoutes   from "./routes/attachments.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth",          authRoutes);
app.use("/api/admin/users",   adminUserRoutes);
app.use("/api/projects",      projectRoutes);
app.use("/api/tasks",         taskRoutes);
app.use("/api/comments",      commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/activity",      activityRoutes);
app.use("/api/attachments",   attachmentRoutes);

app.use("/api", notFoundHandler);

const webDist = path.join(__dirname, "..", "..", "web", "dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("/*splat", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
} else {
  app.get("/", (_req, res) => res.json({ message: "API is running." }));
}

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await runMigrations();
  await seed();
  if (!process.env.VERCEL) {
    checkApproachingDeadlines();
    setInterval(checkApproachingDeadlines, 60 * 60 * 1000);
  }
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

start().catch((e) => { console.error(e); process.exit(1); });

export default app;
