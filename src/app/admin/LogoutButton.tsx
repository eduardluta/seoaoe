"use client";

export function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm opacity-60 hover:opacity-100 transition-opacity"
    >
      Logout →
    </button>
  );
}
