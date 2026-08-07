import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const ROLE_LABEL = { admin: "Administrator", manager: "Project Manager", member: "Team Member" };

function ProfileForm({ user, refreshUser }) {
  const [name, setName] = useState(user?.name || "");
  const [title, setTitle] = useState(user?.title || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.updateProfile({ name, title });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center gap-2">
        <User size={16} className="text-indigo-600" />
        <h2 className="font-semibold text-ink">Personal information</h2>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      ) : null}
      {saved ? (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-soft px-3.5 py-2.5 text-sm text-emerald">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> Profile updated successfully.
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Job title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Frontend Developer"
          className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Email address</label>
        <input
          disabled
          value={user?.email || ""}
          className="w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-muted"
        />
        <p className="mt-1 text-xs text-muted">Contact your administrator to change your email.</p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSaved(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function field(key, label, placeholder = "") {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">{label}</label>
        <input
          type="password"
          required
          value={form[key]}
          placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-indigo-600" />
        <h2 className="font-semibold text-ink">Change password</h2>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      ) : null}
      {saved ? (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-soft px-3.5 py-2.5 text-sm text-emerald">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> Password changed successfully.
        </div>
      ) : null}

      {field("currentPassword", "Current password")}
      {field("newPassword", "New password", "Min. 8 chars, one uppercase, one number")}
      {field("confirmPassword", "Confirm new password")}

      <p className="text-xs text-muted">
        Password must be at least 8 characters and include an uppercase letter and a number.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
      >
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">My Profile</h1>
        <p className="mt-1 text-sm text-muted">
          {ROLE_LABEL[user?.role]} · {user?.email}
        </p>
      </div>

      <div className="space-y-5">
        <ProfileForm user={user} refreshUser={refreshUser} />
        <PasswordForm />
      </div>
    </div>
  );
}
