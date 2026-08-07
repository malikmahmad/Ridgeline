import { get } from "../db/connection.js";
import { notFound, forbidden } from "./apiError.js";

export async function getProjectOrThrow(projectId) {
  const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!project) throw notFound("Project not found.");
  return project;
}

export async function isProjectMember(projectId, userId) {
  const row = await get(
    "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?",
    [projectId, userId]
  );
  return !!row;
}

export async function assertCanViewProject(user, project) {
  if (user.role === "admin") return;
  if (user.role === "manager" && project.manager_id === user.id) return;
  if (user.role === "member" && await isProjectMember(project.id, user.id)) return;
  throw forbidden("You do not have access to this project.");
}

export async function assertCanManageProject(user, project) {
  if (user.role === "admin") return;
  if (user.role === "manager" && project.manager_id === user.id) return;
  throw forbidden("Only the assigned manager or an admin can do that.");
}

export async function getTaskOrThrow(taskId) {
  const task = await get("SELECT * FROM tasks WHERE id = ?", [taskId]);
  if (!task) throw notFound("Task not found.");
  return task;
}

export async function assertCanViewTask(user, task) {
  const project = await getProjectOrThrow(task.project_id);
  await assertCanViewProject(user, project);
  return project;
}

export async function assertCanManageTask(user, task) {
  const project = await getProjectOrThrow(task.project_id);
  await assertCanManageProject(user, project);
  return project;
}

export async function assertCanUpdateTaskStatus(user, task) {
  const project = await getProjectOrThrow(task.project_id);
  if (user.role === "admin") return project;
  if (user.role === "manager" && project.manager_id === user.id) return project;
  if (user.role === "member" && task.assignee_id === user.id) return project;
  throw forbidden("You can only update the status of tasks assigned to you.");
}
