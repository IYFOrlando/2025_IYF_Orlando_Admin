import * as React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle,
  BookOpen,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import { useNavigate } from "react-router-dom";
// import { supabase } from "../../../lib/supabase"; // Removed - using hooks
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { useSupabaseAttendance } from "../../attendance/hooks/useSupabaseAttendance";
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
// deduplicateRegistrations removed - Supabase hook already groups by student.id

// --- Components ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      elevation={0}
      sx={{
        background: isDark
          ? "rgba(30, 30, 30, 0.6)"
          : "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderRadius: 4,
        border: "1px solid",
        borderColor: isDark
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(255, 255, 255, 0.4)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        height: "100%",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  subtext,
  loading,
}: any) => (
  <GlassCard>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.15),
            color: color,
          }}
        >
          <Icon size={24} />
        </Box>
        <Typography variant="h6" fontWeight={600} color="text.secondary">
          {label}
        </Typography>
      </Stack>
      {loading ? (
        <CircularProgress size={24} sx={{ mb: 1 }} />
      ) : (
        <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>
          {value}
        </Typography>
      )}
      {subtext && (
        <Typography variant="body2" color="text.secondary">
          {subtext}
        </Typography>
      )}
    </CardContent>
  </GlassCard>
);

export default function TeacherDashboardPage() {
  const { teacherProfile } = useTeacherContext();
  const navigate = useNavigate();
  const theme = useTheme();
  const { data: allRegistrations } = useSupabaseRegistrations();
  const { fetchDailyOverallAttendance } = useSupabaseAttendance();

  // -- Stats State --
  const [stats, setStats] = React.useState({
    attendancePercent: 0,
    attendanceLabel: "0%",
    totalStudents: 0,
  });
  const [loadingStats, setLoadingStats] = React.useState(true);

  // -- Calculate Stats --
  React.useEffect(() => {
    const fetchStats = async () => {
      if (!teacherProfile) return;

      try {
        setLoadingStats(true);
        // 1. Calculate Total Students for this teacher
        const uniqueRegs = allRegistrations; // Already grouped by student.id
        let teacherStudents = 0;

        uniqueRegs.forEach((reg) => {
          const isMatch = teacherProfile.academies.some((asg) => {
            const myAcademy = normalizeAcademy(asg.academyName);
            const myLevel = asg.level ? normalizeLevel(asg.level) : null;

            if (reg.selectedAcademies && Array.isArray(reg.selectedAcademies)) {
              return reg.selectedAcademies.some((sa) => {
                const saAcademy = normalizeAcademy(sa.academy || "");
                const saLevel = normalizeLevel(sa.level || "");

                if (saAcademy !== myAcademy) return false;
                if (myLevel && saLevel !== myLevel) return false;
                return true;
              });
            }
            return false;
          });

          if (isMatch) teacherStudents++;
        });

        // 2. Calculate Attendance for Today using Hook
        const d = new Date();
        const day = d.getDay();
        if (day !== 6) {
          // If not Saturday, fallback to last Saturday/session? Or just show 0?
          // Logic in existing code rolled back date to Saturday if not Sat.
          // Keeping that logic for consistency.
          const diff = (day + 1) % 7;
          // If day is Sunday (0), diff = 1 (Sat).
          // If day is Friday (5), diff = 6 (Sat).
          // Wait, logic was: if (day !== 6) { diff = (day + 1) % 7; d.setDate(...) }
          // (day + 1) % 7:
          // Sun(0) -> 1 -> -1 day -> Sat. Correct.
          // Mon(1) -> 2 -> -2 days -> Sat. Correct.
          d.setDate(d.getDate() - diff);
        }
        const targetDate = d.toISOString().slice(0, 10);

        const myAcademyIds = teacherProfile.academies
          .map((a) => a.academyId)
          .filter(Boolean) as string[];

        const { totalPresent } = await fetchDailyOverallAttendance(
          targetDate,
          myAcademyIds,
        );

        const percent =
          teacherStudents > 0
            ? Math.round((totalPresent / teacherStudents) * 100)
            : 0;

        setStats({
          attendancePercent: percent,
          attendanceLabel: `${percent}%`,
          totalStudents: teacherStudents,
        });
      } catch (e) {
        console.error("Failed to calc stats", e);
      } finally {
        setLoadingStats(false);
      }
    };

    if (teacherProfile && allRegistrations.length > 0) {
      fetchStats();
    }
  }, [teacherProfile, allRegistrations, fetchDailyOverallAttendance]);

  const classesCount = teacherProfile?.academies.length || 0;

  // Get greeting based on time
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          gutterBottom
          sx={{
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {greeting}, {teacherProfile?.name.split(" ")[0]}! 👋
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          Here's what's happening with your classes today.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
          <Chip
            label="🟢 Supabase Data"
            size="small"
            sx={{
              bgcolor: "rgba(76, 175, 80, 0.1)",
              color: "success.main",
              fontWeight: 700,
              border: "1px solid rgba(76, 175, 80, 0.2)",
            }}
          />
          <Button
            size="small"
            variant="text"
            onClick={() => window.location.reload()}
            sx={{ minWidth: "auto" }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="My Classes"
            value={classesCount}
            icon={BookOpen}
            color={theme.palette.primary.main}
            subtext="Active courses assigned"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Total Students"
            value={stats.totalStudents}
            loading={loadingStats}
            icon={Users}
            color={theme.palette.success.main}
            subtext="Across all your classes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Attendance Today"
            value={stats.attendanceLabel}
            loading={loadingStats}
            icon={CheckCircle}
            color={theme.palette.warning.main}
            subtext="Present / Total Enrolled"
          />
        </Grid>
      </Grid>

      {/* Class List Section */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        My Classes
      </Typography>
      <Grid container spacing={3}>
        {teacherProfile?.academies.map((cls, idx) => (
          <Grid key={idx} item xs={12} md={6}>
            <GlassCard
              sx={{
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                cursor: "pointer",
              }}
              onClick={() => {
                const params = new URLSearchParams({ class: cls.academyId });
                if (cls.level) params.set("level", cls.level);
                navigate(`/attendance?${params.toString()}`);
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="start"
                >
                  <Box>
                    <Chip
                      label={cls.level || "Main Class"}
                      size="small"
                      color="primary"
                      sx={{ mb: 1.5, fontWeight: 600 }}
                    />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {cls.academyName}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "text.secondary",
                        }}
                      >
                        <Users size={16} />
                        <Typography variant="body2" fontWeight={500}>
                          Student Roster
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          color: "text.secondary",
                        }}
                      >
                        <Calendar size={16} />
                        <Typography variant="body2" fontWeight={500}>
                          Spring 2026
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: "50%",
                      bgcolor: "action.hover",
                      display: "flex",
                    }}
                  >
                    <ChevronRight size={20} />
                  </Box>
                </Stack>

                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CheckCircle size={18} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      const params = new URLSearchParams({ class: cls.academyId });
                      if (cls.level) params.set("level", cls.level);
                      navigate(`/attendance?${params.toString()}`);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    Take Attendance
                  </Button>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
