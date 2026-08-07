const BASE = "/api";

function getToken() {
  return localStorage.getItem("ridgeline_token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data   = isJson ? await res.json() : null;

  if (!res.ok) {
    const err    = new Error(data?.error || `Request failed (${res.status})`);
    err.status   = res.status;
    err.details  = data?.details;
    throw err;
  }

  return data;
}

export const api = {
  register:      (payload) => request("/auth/register",   { method: "POST", body: payload }),
  login:         (payload) => request("/auth/login",      { method: "POST", body: payload }),
  me:            ()        => request("/auth/me"),
  updateProfile: (payload) => request("/auth/me",         { method: "PUT",  body: payload }),
  changePassword:(payload) => request("/auth/me/password",{ method: "PUT",  body: payload }),

  getUsers:      (role)    => request(`/admin/users${role ? `?role=${role}` : ""}`),
  createUser:    (payload) => request("/admin/users",     { method: "POST", body: payload }),
  updateUser:    (id, payload) => request(`/admin/users/${id}`, { method: "PUT", body: payload }),
  deleteUser:    (id)      => request(`/admin/users/${id}`,     { method: "DELETE" }),

  getProjects:   ()        => request("/projects"),
  getProject:    (id)      => request(`/projects/${id}`),
  createProject: (payload) => request("/projects",        { method: "POST", body: payload }),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: "PUT", body: payload }),
  deleteProject: (id)      => request(`/projects/${id}`,     { method: "DELETE" }),
  getProjectMembers:  (id) => request(`/projects/${id}/members`),
  addProjectMember:   (id, userId) => request(`/projects/${id}/members`, { method: "POST", body: { userId } }),
  removeProjectMember:(id, userId) => request(`/projects/${id}/members/${userId}`, { method: "DELETE" }),

  getProjectTasks: (projectId, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/tasks/project/${projectId}${qs ? `?${qs}` : ""}`);
  },
  getMyTasks:       ()         => request("/tasks/my"),
  getTask:          (id)       => request(`/tasks/${id}`),
  createTask:       (pid, payload) => request(`/tasks/project/${pid}`, { method: "POST", body: payload }),
  updateTask:       (id, payload)  => request(`/tasks/${id}`,          { method: "PUT",  body: payload }),
  updateTaskStatus: (id, status)   => request(`/tasks/${id}/status`,   { method: "PATCH",body: { status } }),
  deleteTask:       (id)           => request(`/tasks/${id}`,          { method: "DELETE" }),

  getComments: (taskId)         => request(`/comments/${taskId}`),
  addComment:  (taskId, message)=> request(`/comments/${taskId}`, { method: "POST", body: { message } }),

  getNotifications:       () => request("/notifications"),
  markNotificationRead:   (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => request("/notifications/read-all",   { method: "PATCH" }),

  getDashboard: () => request("/dashboard"),

  getActivity: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return request(`/activity${qs ? `?${qs}` : ""}`);
  },

  getAttachments:   (taskId) => request(`/attachments/${taskId}`),
  deleteAttachment: (taskId, attId) => request(`/attachments/${taskId}/${attId}`, { method: "DELETE" }),

  uploadAttachment: (taskId, file) => {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    return fetch(`${BASE}/attachments/${taskId}`, {
      method:  "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        const err   = new Error(data?.error || "Upload failed.");
        err.status  = res.status;
        throw err;
      }
      return data;
    });
  },
};

export function saveToken(token) {
  localStorage.setItem("ridgeline_token", token);
}

export function clearToken() {
  localStorage.removeItem("ridgeline_token");
}

export { getToken };
