import { run } from "../db/connection.js";

let _push = null;
async function getPush() {
  if (!_push) {
    const mod = await import("../routes/notifications.js");
    _push = mod.pushToUser;
  }
  return _push;
}

async function saveAndPush(userId, type, message, projectId, taskId) {
  const result = await run(
    `INSERT INTO notifications (user_id, type, message, project_id, task_id)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, message, projectId, taskId]
  );
  getPush()
    .then((push) => {
      push(userId, {
        id:         Number(result.lastInsertRowid),
        type,
        message,
        project_id: projectId,
        task_id:    taskId,
        is_read:    0,
        created_at: new Date().toISOString(),
      });
    })
    .catch(() => {});
}

export async function notify({ userId, actingUserId, type, message, projectId = null, taskId = null }) {
  if (!userId || userId === actingUserId) return;
  await saveAndPush(userId, type, message, projectId, taskId);
}

export async function notifyMany({ userIds, actingUserId, type, message, projectId = null, taskId = null }) {
  const targets = [...new Set(userIds)].filter((id) => id && id !== actingUserId);
  for (const userId of targets) {
    await saveAndPush(userId, type, message, projectId, taskId);
  }
}
