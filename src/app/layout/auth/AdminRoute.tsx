/**
 * AdminRoute — Route guard that blocks non-admin users.
 * Wraps admin-only pages. Teachers are redirected to /dashboard.
 */
import { Navigate } from "react-router-dom";
import { useTeacherContext } from "../../../features/auth/context/TeacherContext";
import { Box, CircularProgress } from "@mui/material";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useTeacherContext();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
