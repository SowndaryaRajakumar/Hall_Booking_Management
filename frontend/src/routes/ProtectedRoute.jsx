import { Navigate } from "react-router-dom";
import { normalizeRole } from "./PermissionRoute";

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const currentRole = normalizeRole(localStorage.getItem("role") || "");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (role) {
    const reqRole = normalizeRole(role);
    // If 'admin' is specified, allow both MASTER_ADMIN and DEPARTMENT_ADMIN
    if (reqRole === "MASTER_ADMIN") {
      if (currentRole !== "MASTER_ADMIN" && currentRole !== "DEPARTMENT_ADMIN") {
        return <Navigate to="/" replace />;
      }
    } else if (reqRole === "FACULTY") {
      if (currentRole !== "FACULTY") {
        return <Navigate to="/" replace />;
      }
    } else if (currentRole !== reqRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;