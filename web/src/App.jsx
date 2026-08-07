import { Route, Routes } from "react-router-dom";
import AppLayout     from "./components/layout/AppLayout";
import RequireRole   from "./components/ui/RequireRole";
import Login         from "./pages/shared/Login";
import Register      from "./pages/shared/Register";
import Dashboard     from "./pages/shared/Dashboard";
import Projects      from "./pages/shared/Projects";
import ProjectDetail from "./pages/shared/ProjectDetail";
import TaskDetail    from "./pages/shared/TaskDetail";
import Notifications from "./pages/shared/Notifications";
import Profile       from "./pages/shared/Profile";
import Timeline      from "./pages/shared/Timeline";
import Calendar      from "./pages/shared/Calendar";
import NotFound      from "./pages/shared/NotFound";
import MyTasks       from "./pages/member/MyTasks";
import Users         from "./pages/admin/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<RequireRole><AppLayout /></RequireRole>}>
        <Route index              element={<Dashboard />} />
        <Route path="projects"    element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks/:id"   element={<TaskDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile"     element={<Profile />} />
        <Route path="calendar"    element={<Calendar />} />

        <Route
          path="timeline"
          element={
            <RequireRole roles={["admin", "manager"]}>
              <Timeline />
            </RequireRole>
          }
        />
        <Route
          path="my-tasks"
          element={
            <RequireRole roles={["member"]}>
              <MyTasks />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole roles={["admin"]}>
              <Users />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
