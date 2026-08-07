import { createContext, useContext, useEffect, useState } from "react";
import { api, saveToken, clearToken, getToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    saveToken(token);
    setUser(user);
    return user;
  }

  async function register(name, email, password) {
    const { token, user } = await api.register({ name, email, password });
    saveToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const { user } = await api.me();
    setUser(user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
