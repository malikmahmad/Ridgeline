import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, CalendarDays, Clock, FolderKanban, LayoutDashboard,
  ListTodo, LogOut, Menu, Moon, Mountain, Sun, User, Users, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { api, getToken } from "../../lib/api";

const NAV_BY_ROLE = {
  admin: [
    { label: "Dashboard",  to: "/",          icon: LayoutDashboard, end: true },
    { label: "Projects",   to: "/projects",   icon: FolderKanban },
    { label: "Users",      to: "/users",      icon: Users },
    { label: "Timeline",   to: "/timeline",   icon: Clock },
    { label: "Calendar",   to: "/calendar",   icon: CalendarDays },
  ],
  manager: [
    { label: "Dashboard",  to: "/",          icon: LayoutDashboard, end: true },
    { label: "My Projects",to: "/projects",   icon: FolderKanban },
    { label: "Timeline",   to: "/timeline",   icon: Clock },
    { label: "Calendar",   to: "/calendar",   icon: CalendarDays },
  ],
  member: [
    { label: "Dashboard",  to: "/",          icon: LayoutDashboard, end: true },
    { label: "My Tasks",   to: "/my-tasks",   icon: ListTodo },
    { label: "My Projects",to: "/projects",   icon: FolderKanban },
    { label: "Calendar",   to: "/calendar",   icon: CalendarDays },
  ],
};

const ROLE_LABEL = { admin: "Administrator", manager: "Project Manager", member: "Team Member" };
const ROLE_BADGE = {
  admin:   "bg-rose-soft/20 text-rose",
  manager: "bg-white/15 text-white/80",
  member:  "bg-white/10 text-white/70",
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  // Poll unread count every 30 s
  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const { unreadCount } = await api.getNotifications();
        if (!cancelled) setUnreadCount(unreadCount);
      } catch { /* non-critical */ }
    }
    loadUnread();
    const iv = setInterval(loadUnread, 30_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Real-time notifications via Server-Sent Events
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse(e.data);
        setUnreadCount((c) => c + 1);
        toast.notify(data.message, "New notification");
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("ping", () => { /* keep-alive, no-op */ });
    es.onerror = () => { /* auto-reconnects */ };

    return () => es.close();
  }, [toast]);

  function handleLogout() { logout(); navigate("/login"); }

  const navItems = NAV_BY_ROLE[user?.role] || [];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
          <Mountain size={16} className="text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-white">Ridgeline</span>
      </Link>

      {/* Role badge */}
      <div className="px-5 pb-4">
        <span className={`inline-block rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${ROLE_BADGE[user?.role]}`}>
          {ROLE_LABEL[user?.role]}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}

        {/* Notifications */}
        <NavLink
          to="/notifications"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
            }`
          }
        >
          <span className="flex items-center gap-3"><Bell size={17} /> Notifications</span>
          {unreadCount > 0 ? (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose px-1 text-[0.65rem] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/8 hover:text-white"
            }`
          }
        >
          <User size={17} /> Profile
        </NavLink>
      </nav>

      {/* Footer: theme toggle + user */}
      <div className="border-t border-white/10 p-4 space-y-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/8 hover:text-white transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark"
            ? <><Sun size={15} /> Light mode</>
            : <><Moon size={15} /> Dark mode</>
          }
        </button>

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="sidebar-bg hidden w-64 shrink-0 lg:block" style={{ backgroundColor: "var(--sidebar-bg, #232566)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden" style={{ backgroundColor: "var(--sidebar-bg, #232566)" }}>
        <Link to="/" className="flex items-center gap-2 font-bold text-white">
          <Mountain size={18} /> Ridgeline
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="text-white/70 hover:text-white" aria-label="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {unreadCount > 0 ? (
            <Link to="/notifications" className="relative text-white/70">
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose text-[0.6rem] font-bold text-white px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </Link>
          ) : null}
          <button onClick={() => setSidebarOpen(true)} className="text-white" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div className="w-64" style={{ backgroundColor: "var(--sidebar-bg, #232566)" }}>
            {sidebarContent}
          </div>
          <button className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={22} className="ml-3 mt-3 text-white" />
          </button>
        </div>
      ) : null}

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden p-5 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
