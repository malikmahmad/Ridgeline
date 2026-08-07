import { run } from "../db/connection.js";

export async function logActivity({
  actorId   = null,
  action,
  entity,
  entityId  = null,
  detail    = "",
  projectId = null,
  taskId    = null,
}) {
  try {
    await run(
      `INSERT INTO activity_log (actor_id, action, entity, entity_id, detail, project_id, task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorId, action, entity, entityId, detail, projectId, taskId]
    );
  } catch {
    // never let a log failure crash a request
  }
}
