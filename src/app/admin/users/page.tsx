"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, name: newName || undefined, password: newPassword, role: newRole }),
    });
    if (res.ok) {
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("admin");
      loadUsers();
    } else {
      const data = await res.json();
      setCreateError(data.error || "Failed to create user");
    }
    setCreating(false);
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    loadUsers();
  }

  function openReset(user: User) {
    setResetTarget(user);
    setResetPassword("");
    setResetError("");
    setResetSuccess(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetting(true);
    const res = await fetch(`/api/users/${resetTarget!.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      setResetSuccess(true);
      setResetPassword("");
    } else {
      const data = await res.json();
      setResetError(data.error || "Failed to reset password");
    }
    setResetting(false);
  }

  const roleBadge = (role: string) =>
    role === "superadmin"
      ? <span className="text-xs bg-bh-teal/20 text-bh-teal-dim border border-bh-teal/30 px-2 py-0.5 rounded font-medium">Super Admin</span>
      : <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded">Admin</span>;

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* User list */}
      <div className="space-y-2 mb-8">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-900">{user.email}</span>
                {roleBadge(user.role)}
              </div>
              <div className="text-sm text-gray-500">
                {user.name && <span className="mr-3">{user.name}</span>}
                <span className="text-xs text-gray-400">
                  Added {new Date(user.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="flex gap-3 text-sm shrink-0 ml-4">
              <button
                onClick={() => openReset(user)}
                className="text-bh-teal-dim hover:text-bh-teal transition"
              >
                Reset password
              </button>
              <button
                onClick={() => handleDelete(user)}
                className="text-red-500 hover:text-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-gray-500 text-sm">No users found.</p>
        )}
      </div>

      {/* Add user */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-4">Add User</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          {createError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{createError}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-bh-teal text-bh-black font-semibold px-5 py-2 rounded hover:bg-bh-teal-dim transition disabled:opacity-50 text-sm"
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">{resetTarget.email}</p>

            {resetSuccess ? (
              <div>
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                  ✓ Password updated successfully.
                </p>
                <button
                  onClick={() => setResetTarget(null)}
                  className="bg-bh-teal text-bh-black font-semibold px-5 py-2 rounded hover:bg-bh-teal-dim transition text-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-3">
                {resetError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{resetError}</p>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    required
                    minLength={8}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={resetting}
                    className="bg-bh-teal text-bh-black font-semibold px-5 py-2 rounded hover:bg-bh-teal-dim transition disabled:opacity-50 text-sm"
                  >
                    {resetting ? "Saving..." : "Set Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
