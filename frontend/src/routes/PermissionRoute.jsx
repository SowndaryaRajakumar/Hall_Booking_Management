import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AccessDenied from "../pages/AccessDenied";
import { syncUserSession } from "../utils/authSync";

export const normalizeRole = (role = "") => {
  const r = String(role).trim().toUpperCase();
  if (r === "ADMIN" || r === "MASTER_ADMIN") return "MASTER_ADMIN";
  if (r === "DEPARTMENT_ADMIN" || r === "DEPT_ADMIN") return "DEPARTMENT_ADMIN";
  if (r === "STAFF" || r === "FACULTY") return "FACULTY";
  return r;
};

const PERMISSION_ALIASES = {
  MANAGE_VENUES: ["MANAGE_VENUES", "MANAGE_DEPARTMENT_VENUES"],
  MANAGE_DEPARTMENT_VENUES: ["MANAGE_VENUES", "MANAGE_DEPARTMENT_VENUES"],
  VIEW_TIMETABLE: ["VIEW_TIMETABLE", "VIEW_BOOKINGS"],
  VIEW_ANALYTICS: ["VIEW_ANALYTICS", "VIEW_REPORTS"],
  EXPORT_REPORTS: ["EXPORT_REPORTS", "VIEW_REPORTS"],
};

const PermissionRoute = ({ children, role, permission }) => {
  const token = localStorage.getItem("token");
  const rawRole = localStorage.getItem("role") || "";
  const [currentRole, setCurrentRole] = useState(() => normalizeRole(rawRole));
  const [permissions, setPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    syncUserSession();

    const handlePermissionsUpdated = (e) => {
      if (e.detail?.permissions) {
        setPermissions(e.detail.permissions);
      }
      if (e.detail?.role) {
        setCurrentRole(normalizeRole(e.detail.role));
      }
    };

    window.addEventListener("permissions-updated", handlePermissionsUpdated);
    return () => window.removeEventListener("permissions-updated", handlePermissionsUpdated);
  }, []);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 1. Role Verification
  if (role) {
    const allowedRoles = Array.isArray(role)
      ? role.map(normalizeRole)
      : [normalizeRole(role)];

    if (!allowedRoles.includes(currentRole)) {
      return <AccessDenied permission={permission} />;
    }
  }

  // 2. Permission Verification (Master Admin always bypasses)
  if (permission && currentRole !== "MASTER_ADMIN") {
    const requiredList = Array.isArray(permission) ? permission : [permission];
    const expandedRequired = requiredList.flatMap((p) => PERMISSION_ALIASES[p] || [p]);

    const hasPermission = expandedRequired.some((p) => permissions.includes(p));

    if (!hasPermission) {
      return <AccessDenied permission={Array.isArray(permission) ? permission.join(" or ") : permission} />;
    }
  }

  return children;
};

export default PermissionRoute;
