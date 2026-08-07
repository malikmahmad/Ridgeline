import "dotenv/config";
import express from "express";
import cors from "cors";

import { runMigrations } from "../server/src/db/connection.js";
import { seed } from "../server/src/db/seed.js";

import authRoutes         from "../server/src/routes/auth.js";
import adminUserRoutes    from "../server/src/routes/adminUsers.js";
import projectRoutes      from "../server/src/routes/projects.js";
import taskRoutes         from "../server/src/routes/tasks.js";
import commentRoutes      from "../server/src/routes/comments.js";
import notificationRoutes from "../server/src/routes/notifications.js";
import dashboardRoutes    from "../server/src/routes/dashboard.js";
import activityRoutes     from "../server/src/routes/activity.js";
import attachmentRoutes   from "../server/src/routes/attachments.js";
import { notFoundHandler, errorHandler } from "../server/src/middleware/errorHandler.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

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
app.use(notFoundHandler);
app.use(errorHandler);

let initialized = false;
const initPromise = (async () => {
  await runMigrations();
  await seed();
  initialized = true;
})();

export default async function handler(req, res) {
  if (!initialized) await initPromise;
  app(req, res);
}
