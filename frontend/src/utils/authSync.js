/**
 * Synchronizes user session details and permissions from backend (/api/auth/me)
 * into localStorage and dispatches a 'permissions-updated' event so the
 * UI (Sidebar, Route guards, Dashboard) reactively refreshes.
 */
export const syncUserSession = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch("http://localhost:5000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data.success && data.user) {
      const user = data.user;
      const role = data.role || user.role;
      const permissions = data.permissions || user.permissions || [];
      const department = data.department || user.department || "";
      const departmentId = data.departmentId || user.departmentId || "";

      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("permissions", JSON.stringify(permissions));
      if (department) localStorage.setItem("department", department);
      if (departmentId) localStorage.setItem("departmentId", String(departmentId));

      // Broadcast update across the frontend
      window.dispatchEvent(
        new CustomEvent("permissions-updated", {
          detail: { role, permissions, user },
        })
      );

      return { role, permissions, user };
    }
  } catch (err) {
    console.error("Session sync failed:", err);
  }
  return null;
};
