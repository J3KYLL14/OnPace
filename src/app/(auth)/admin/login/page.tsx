"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      try {
        const data = await res.json();
        setError(data.error || "Login failed");
      } catch {
        setError("Login failed — please try again");
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-bh-black">
      <nav className="bg-bh-charcoal">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-white">
            OnPace
          </Link>
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Admin Login</h1>
          <form onSubmit={handleSubmit} className="bg-white dark:bg-bh-dark p-8 rounded-lg shadow-sm border border-gray-200 dark:border-bh-surface">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 dark:border-bh-surface dark:bg-bh-surface dark:text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bh-teal"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 dark:border-bh-surface dark:bg-bh-surface dark:text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bh-teal"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bh-teal text-bh-black font-semibold py-2 rounded hover:bg-bh-teal-dim transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
