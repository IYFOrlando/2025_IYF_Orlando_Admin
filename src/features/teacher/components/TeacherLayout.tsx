import * as React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  IconButton,
  Stack,
  useMediaQuery,
  useTheme,
  Avatar,
  Chip,
  Tooltip,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Drawer,
} from "@mui/material";
import {
  Menu as MenuIcon,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  TrendingUp,
  School,
  Calendar,
  Eye as VisibilityIcon,
  LogOut as ExitIcon,
} from "lucide-react";

import AuthMenu from "../../../app/layout/AuthMenu";
import iyfLogo from "../../../assets/logo/IYF_logo.png";
import { useTeacherContext } from "../../auth/context/TeacherContext";

const DRAWER_WIDTH = 280;

// Teacher-specific navigation items
const teacherItems = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  // Teachers view "Registrations" as "My Students"
  { to: "/registrations", label: "My Students", icon: <Users size={20} /> },
  {
    to: "/attendance",
    label: "Attendance",
    icon: <ClipboardCheck size={20} />,
  },
  { to: "/progress", label: "Progress", icon: <TrendingUp size={20} /> },
  { to: "/planner", label: "Planner", icon: <Calendar size={20} /> },
];

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  onNavClick?: () => void;
}

function NavItem({ to, label, icon, onNavClick }: NavItemProps) {
  const location = useLocation();
  const active = location.pathname === to;
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <Tooltip
      title={label}
      placement="right"
      arrow
      disableHoverListener={isLgUp}
    >
      <ListItemButton
        component={NavLink}
        to={to}
        onClick={onNavClick}
        sx={{
          borderRadius: "16px",
          mx: 2,
          my: 0.5,
          px: 2,
          py: 1.2,
          transition: "all 0.2s ease-in-out",
          color: active ? (isDark ? "#38bdf8" : "#0ea5e9") : "text.secondary",
          background: active
            ? isDark
              ? "rgba(56, 189, 248, 0.1)"
              : "rgba(14, 165, 233, 0.08)"
            : "transparent",
          border: "1px solid",
          borderColor: active
            ? isDark
              ? "rgba(56, 189, 248, 0.2)"
              : "rgba(14, 165, 233, 0.1)"
            : "transparent",
          "&:hover": {
            background: active
              ? isDark
                ? "rgba(56, 189, 248, 0.15)"
                : "rgba(14, 165, 233, 0.12)"
              : isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.03)",
            transform: "translateX(3px)",
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 40,
            color: "inherit",
            display: "flex",
            alignItems: "center",
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 14,
            fontWeight: active ? 600 : 500,
            fontFamily: '"Inter", sans-serif',
          }}
        />
      </ListItemButton>
    </Tooltip>
  );
}

export default function TeacherLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const theme = useTheme();
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const isDark = theme.palette.mode === "dark";
  const { teacherProfile, impersonatedEmail, stopImpersonation } =
    useTeacherContext();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: isDark
          ? "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 3, py: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar
          src={iyfLogo}
          sx={{
            width: 40,
            height: 40,
            boxShadow: "0 4px 12px rgba(14, 165, 233, 0.2)",
          }}
        />
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ lineHeight: 1.1, letterSpacing: -0.2 }}
          >
            IYF TEACHER
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {teacherProfile?.name || "Instructor"}
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 0 }}>
        <Box sx={{ px: 3, mb: 1 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.disabled"
            sx={{ letterSpacing: 0.5 }}
          >
            MY CLASSROOM
          </Typography>
        </Box>
        <List disablePadding>
          {teacherItems.map((it) => (
            <NavItem
              key={it.to}
              {...it}
              onNavClick={!isLgUp ? handleDrawerToggle : undefined}
            />
          ))}
        </List>
      </Box>

      {/* Footer support info */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2.5,
            borderRadius: 3,
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2" fontWeight={800}>
              Need Help?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Contact Admin:
            </Typography>
            <Typography variant="caption" color="primary" fontWeight={600}>
              407-900-3442
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          bgcolor: isDark
            ? "rgba(15, 23, 42, 0.7)"
            : "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
          height: 80,
          color: "text.primary",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ height: "100%", px: { xs: 2, md: 4 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Teacher Badge */}
          {/* Teacher Badge or Impersonation Status */}
          {impersonatedEmail ? (
            <Chip
              icon={<VisibilityIcon size={16} />}
              label={`Viewing as ${teacherProfile?.name || "Teacher"}`}
              onDelete={stopImpersonation}
              deleteIcon={<ExitIcon size={16} />}
              color="warning"
              variant="filled"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip
              icon={<School size={16} />}
              label="Teacher Mode"
              color="primary"
              variant="outlined"
              sx={{
                fontWeight: 600,
                border: "1px solid",
                borderColor: "primary.main",
              }}
            />
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Right Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            <AuthMenu isAdmin={false} hasGmailAccess={false} />
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
            border: "none",
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            background: isDark
              ? "rgba(30,30,30,0.95)"
              : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          {drawerContent}
        </Box>
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
            borderRight: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            bgcolor: "background.paper",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          ml: { lg: `${DRAWER_WIDTH}px` },
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          bgcolor: isDark ? "#0f172a" : "#f8fafc",
        }}
      >
        <Toolbar sx={{ height: 80 }} />
        <Box sx={{ p: { xs: 2, md: 4, lg: 6 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
