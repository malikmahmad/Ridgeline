import { all, get } from "../db/connection.js";
import { notify } from "./notifications.js";

export async function checkApproachingDeadlines() {
  const tasks = await all(
    `SELECT t.*, p.name as project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.status != 'completed'
       AND t.assignee_id IS NOT NULL
       AND t.due_date IS NOT NULL
       AND date(t.due_date) BETWEEN date('now') AND date('now', '+2 days')`
  );

  for (const task of tasks) {
    const already = await get(
      `SELECT 1 FROM notifications
       WHERE task_id = ?
         AND type = 'deadline_approaching'
         AND created_at > datetime('now', '-1 day')`,
      [task.id]
    );
    if (already) continue;

    await notify({
      userId:       task.assignee_id,
      actingUserId: null,
      type:         "deadline_approaching",
      message:      `"${task.title}" in ${task.project_name} is due on ${task.due_date}.`,
      projectId:    task.project_id,
      taskId:       task.id,
    });
  }
}
