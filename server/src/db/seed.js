import bcrypt from "bcryptjs";
import { get, run, runMigrations } from "./connection.js";

function hashPassword(pw) { return bcrypt.hashSync(pw, 10); }

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000).toISOString().replace("T", " ").slice(0, 19);
}

async function addUser(name, email, password, role, title) {
  return run(
    "INSERT INTO users (name, email, password_hash, role, title) VALUES (?, ?, ?, ?, ?)",
    [name, email, hashPassword(password), role, title]
  );
}

async function addProject(name, description, startDate, endDate, priority, status, managerId, createdBy) {
  return run(
    `INSERT INTO projects (name, description, start_date, end_date, priority, status, manager_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description, startDate, endDate, priority, status, managerId, createdBy]
  );
}

export async function seed() {
  await runMigrations();

  const already = await get("SELECT COUNT(*) as c FROM users");
  if (Number(already.c) > 0) return;

  const admin = await addUser("M Ahmad",   "admin@ridgeline.test",    "Admin@123",   "admin",   "Operations Lead");
  const mgr1  = await addUser("Amna",      "manager1@ridgeline.test", "Manager@123", "manager", "Senior Project Manager");
  const mgr2  = await addUser("Mahnoor",   "manager2@ridgeline.test", "Manager@123", "manager", "Project Manager");
  const mem1  = await addUser("Mahad",     "member1@ridgeline.test",  "Member@123",  "member",  "Backend Developer");
  const mem2  = await addUser("Saqib",     "member2@ridgeline.test",  "Member@123",  "member",  "Frontend Developer");
  const mem3  = await addUser("Ayesha",    "member3@ridgeline.test",  "Member@123",  "member",  "Web Developer");
  const mem4  = await addUser("Bakhtawar", "member4@ridgeline.test",  "Member@123",  "member",  "UI/UX Designer");

  const u = {
    admin: Number(admin.lastInsertRowid), mgr1: Number(mgr1.lastInsertRowid),
    mgr2:  Number(mgr2.lastInsertRowid),  mem1: Number(mem1.lastInsertRowid),
    mem2:  Number(mem2.lastInsertRowid),  mem3: Number(mem3.lastInsertRowid),
    mem4:  Number(mem4.lastInsertRowid),
  };

  const p1 = await addProject("Client Portal Redesign",
    "Rebuilding the client-facing portal with a fresh design system.",
    daysFromNow(-20), daysFromNow(25), "high", "active", u.mgr1, u.admin);
  const p2 = await addProject("Mobile App Launch",
    "First release of the mobile app on iOS and Android.",
    daysFromNow(-10), daysFromNow(45), "urgent", "active", u.mgr1, u.admin);
  const p3 = await addProject("Internal Reporting Tool",
    "A proper dashboard for weekly ops metrics instead of spreadsheets.",
    daysFromNow(-5), daysFromNow(30), "medium", "planning", u.mgr2, u.admin);

  const p = {
    portal:    Number(p1.lastInsertRowid),
    mobile:    Number(p2.lastInsertRowid),
    reporting: Number(p3.lastInsertRowid),
  };

  const addMember = (pid, uid) =>
    run("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)", [pid, uid]);

  await addMember(p.portal,    u.mem2);
  await addMember(p.portal,    u.mem4);
  await addMember(p.mobile,    u.mem1);
  await addMember(p.mobile,    u.mem2);
  await addMember(p.mobile,    u.mem3);
  await addMember(p.reporting, u.mem1);
  await addMember(p.reporting, u.mem3);

  const addTask = (pid, title, desc, assignee, priority, status, due, createdBy) =>
    run(
      `INSERT INTO tasks (project_id, title, description, assignee_id, priority, status, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [pid, title, desc, assignee, priority, status, due, createdBy]
    );

  const t1 = await addTask(p.portal,    "Set up design tokens",
    "Define color, spacing and typography tokens for the new design system.",
    u.mem4, "high", "completed", daysFromNow(-12), u.mgr1);
  const t2 = await addTask(p.portal,    "Build responsive navbar",
    "New nav with a hamburger drawer on mobile. Make sure it closes on route change.",
    u.mem2, "medium", "in_progress", daysFromNow(2), u.mgr1);
  const t3 = await addTask(p.portal,    "Dashboard page layout",
    "Rebuild the main dashboard using the new component library.",
    u.mem2, "high", "todo", daysFromNow(7), u.mgr1);
  const t4 = await addTask(p.mobile,    "Implement push notifications",
    "Both iOS and Android. Android token refresh has been flaky.",
    u.mem1, "urgent", "in_progress", daysFromNow(1), u.mgr1);
  const t5 = await addTask(p.mobile,    "Write onboarding flow tests",
    "Cover the happy path first, then edge cases.",
    u.mem3, "medium", "review", daysFromNow(3), u.mgr1);
  const t6 = await addTask(p.reporting, "Define KPI data model",
    "Sit down with ops and figure out exactly which numbers go on the weekly report.",
    u.mem1, "medium", "todo", daysFromNow(10), u.mgr2);

  const t = {
    t1: Number(t1.lastInsertRowid), t2: Number(t2.lastInsertRowid),
    t3: Number(t3.lastInsertRowid), t4: Number(t4.lastInsertRowid),
    t5: Number(t5.lastInsertRowid), t6: Number(t6.lastInsertRowid),
  };

  const addComment = (tid, uid, msg) =>
    run("INSERT INTO task_comments (task_id, user_id, message) VALUES (?, ?, ?)", [tid, uid, msg]);

  await addComment(t.t2, u.mgr1, "Make sure the drawer closes on route change — saw that bug in the last build.");
  await addComment(t.t2, u.mem2, "Good catch, fixed it this morning. Will push the branch after adding tests.");
  await addComment(t.t2, u.mem2, "Branch is up. Tested on Chrome, Safari and Firefox mobile.");
  await addComment(t.t4, u.mem1, "iOS push is sorted. Still stuck on Android token refresh after background wake.");
  await addComment(t.t4, u.mgr1, "Mahad check this thread, similar issue was reported last week.");
  await addComment(t.t5, u.mem3, "Happy path done and passing. Working on the no-internet edge case.");
  await addComment(t.t5, u.mgr1, "Take your time, better to get it right. Let me know if you need another day.");

  const addNotif = (uid, type, msg, pid, tid) =>
    run(`INSERT INTO notifications (user_id, type, message, project_id, task_id) VALUES (?, ?, ?, ?, ?)`,
      [uid, type, msg, pid, tid]);

  await addNotif(u.mem2, "task_assigned", "Amna assigned you to Dashboard page layout in Client Portal Redesign.", p.portal, t.t3);
  await addNotif(u.mgr1, "new_comment",   "Saqib commented on Build responsive navbar.", p.portal, t.t2);
  await addNotif(u.mem1, "task_assigned", "Amna assigned you to Implement push notifications in Mobile App Launch.", p.mobile, t.t4);
  await addNotif(u.mgr1, "task_status_changed", "Ayesha moved Write onboarding flow tests to review.", p.mobile, t.t5);
  await addNotif(u.mem4, "added_to_project", "You were added to Client Portal Redesign.", p.portal, null);
  await addNotif(u.mem1, "added_to_project", "You were added to Mobile App Launch.", p.mobile, null);

  const addLog = (actorId, action, entity, entityId, detail, pid, tid, ts) =>
    run(
      `INSERT INTO activity_log (actor_id, action, entity, entity_id, detail, project_id, task_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [actorId, action, entity, entityId, detail, pid, tid, ts]
    );

  await addLog(u.admin, "project_created", "project", p.portal,    "Created project Client Portal Redesign", p.portal,    null, hoursAgo(48));
  await addLog(u.admin, "project_created", "project", p.mobile,    "Created project Mobile App Launch",      p.mobile,    null, hoursAgo(46));
  await addLog(u.admin, "project_created", "project", p.reporting, "Created project Internal Reporting Tool",p.reporting, null, hoursAgo(44));
  await addLog(u.mgr1,  "member_added",    "project", p.portal,    "Added Saqib to Client Portal Redesign",  p.portal,    null, hoursAgo(47));
  await addLog(u.mgr1,  "member_added",    "project", p.portal,    "Added Bakhtawar to Client Portal Redesign", p.portal, null, hoursAgo(46));
  await addLog(u.mgr1,  "member_added",    "project", p.mobile,    "Added Mahad to Mobile App Launch",       p.mobile,    null, hoursAgo(45));
  await addLog(u.mgr1,  "task_created",    "task",    t.t1, "Created task Set up design tokens",           p.portal,    t.t1, hoursAgo(42));
  await addLog(u.mgr1,  "task_created",    "task",    t.t2, "Created task Build responsive navbar",         p.portal,    t.t2, hoursAgo(40));
  await addLog(u.mgr1,  "task_created",    "task",    t.t4, "Created task Implement push notifications",    p.mobile,    t.t4, hoursAgo(32));
  await addLog(u.mem4,  "task_status_changed","task", t.t1, "Moved Set up design tokens to completed",      p.portal,    t.t1, hoursAgo(20));
  await addLog(u.mem2,  "task_status_changed","task", t.t2, "Moved Build responsive navbar to in progress", p.portal,    t.t2, hoursAgo(14));
  await addLog(u.mem1,  "task_status_changed","task", t.t4, "Moved Implement push notifications to in progress", p.mobile, t.t4, hoursAgo(11));
  await addLog(u.mem3,  "task_status_changed","task", t.t5, "Moved Write onboarding flow tests to review",  p.mobile,    t.t5, hoursAgo(6));
  await addLog(u.mgr1,  "comment_added",   "comment", null, "Commented on Build responsive navbar",          p.portal,    t.t2, hoursAgo(9));
  await addLog(u.mem2,  "comment_added",   "comment", null, "Commented on Build responsive navbar",          p.portal,    t.t2, hoursAgo(8));
  await addLog(u.mem1,  "comment_added",   "comment", null, "Commented on Implement push notifications",     p.mobile,    t.t4, hoursAgo(5));
  await addLog(u.mem3,  "comment_added",   "comment", null, "Commented on Write onboarding flow tests",      p.mobile,    t.t5, hoursAgo(2));

  console.log("Seed complete.");
}

if (process.argv[1].endsWith("seed.js")) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
