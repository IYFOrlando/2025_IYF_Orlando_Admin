import * as React from "react";
import {
  Grid,
  CardContent,
  Typography,
  Box,
  useTheme,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  Users,
  BarChart3,
} from "lucide-react";
import { GlassCard } from "../../../components/GlassCard";
import { PageHeader } from "../../../components/PageHeader";
import { PageHeaderColors } from "../../../components/pageHeaderColors";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { displayYMD } from "../../../lib/date";
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

// --- Types ---
type CountRow = { academy: string; count: number };
type KoreanLevelRow = { level: string; count: number };

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function AnalyticsPage() {
  const theme = useTheme();
  const { data: registrations, loading } = useSupabaseRegistrations();
  // No financial hooks

  const { totals, academyRows, koreanLevelRows, dailyStats } =
    React.useMemo(() => {
      // 1. Registration Stats (Supabase hook already groups by student.id)
      const academies = new Map<string, number>();
      const koreanLevels = new Map<string, number>();
      const dailyCounts = new Map<string, number>();

      for (const r of registrations) {
        // Daily Trend
        if (r.createdAt) {
          // Supabase returns standard ISO strings usually, displayYMD handles string/Date
          const dateStr = displayYMD(r.createdAt);
          if (dateStr) {
            dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1);
          }
        }

        // Academies
        if (
          (r as any).selectedAcademies &&
          Array.isArray((r as any).selectedAcademies)
        ) {
          (r as any).selectedAcademies.forEach((a: any) => {
            if (a.academy && normalizeAcademy(a.academy) !== "n/a") {
              const key = normalizeAcademy(a.academy);
              academies.set(key, (academies.get(key) || 0) + 1);
              if (key === "korean language" && a.level) {
                const lvl = normalizeLevel(a.level);
                koreanLevels.set(lvl, (koreanLevels.get(lvl) || 0) + 1);
              }
            }
          });
        } else {
          // Legacy fallback (just in case)
          const check = (a: any, l: any) => {
            if (a && normalizeAcademy(a) !== "n/a") {
              const key = normalizeAcademy(a);
              academies.set(key, (academies.get(key) || 0) + 1);
              if (key === "korean language" && l) {
                const lvl = normalizeLevel(l);
                koreanLevels.set(lvl, (koreanLevels.get(lvl) || 0) + 1);
              }
            }
          };
          check(r.firstPeriod?.academy, r.firstPeriod?.level);
          check(r.secondPeriod?.academy, r.secondPeriod?.level);
        }
      }

      const dailyStats = Array.from(dailyCounts.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const academyRows: CountRow[] = Array.from(academies.entries())
        .map(([academy, count]) => ({ academy, count }))
        .sort((a, b) => b.count - a.count);

      const koreanLevelRows: KoreanLevelRow[] = Array.from(
        koreanLevels.entries(),
      )
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count);

      const totalAcademies = Array.from(academies.values()).reduce(
        (a, b) => a + b,
        0,
      );

      // Today's Registrations
      const todayStr = displayYMD(new Date());
      const registrationsToday = dailyCounts.get(todayStr) || 0;

      return {
        totals: {
          registrations: registrations.length, // Unique Students (already grouped by student.id in hook)
          totalAcademies,
          registrationsToday,
        },
        academyRows,
        koreanLevelRows,
        dailyStats,
      };
    }, [registrations]);

  if (loading) {
    return (
      <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Loading analytics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        icon={<TrendingUp size={40} />}
        title="Analytics"
        subtitle="Insights and metrics across all academies"
        {...PageHeaderColors.analytics}
      />

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} md={6}>
          <GlassCard sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "primary.light",
                  color: "primary.main",
                  mr: 2,
                }}
              >
                <Users size={24} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total Unique Students
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800}>
              {totals.registrations}
            </Typography>
            <Chip
              size="small"
              label={`+${totals.registrationsToday} Today`}
              color="success"
              sx={{ mt: 1 }}
            />
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "warning.light",
                  color: "warning.main",
                  mr: 2,
                }}
              >
                <BarChart3 size={24} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary">
                Active Class Enrollments
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800}>
              {totals.totalAcademies}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg{" "}
              {(totals.totalAcademies / (totals.registrations || 1)).toFixed(1)}{" "}
              classes per student
            </Typography>
          </GlassCard>
        </Grid>

        {/* Charts Row 1 */}
        <Grid item xs={12} lg={8}>
          <GlassCard>
            <CardContent sx={{ height: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Registration Trend
              </Typography>
              {dailyStats.length > 0 ? (
                <Box
                  sx={{ width: "100%", height: 320, minWidth: 0, minHeight: 0 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyStats}>
                      <defs>
                        <linearGradient
                          id="colorCount"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#2196F3"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#2196F3"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        strokeOpacity={0.2}
                      />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: theme.palette.text.secondary,
                          fontSize: 12,
                        }}
                        dy={10}
                        minTickGap={30}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{
                          fill: theme.palette.text.secondary,
                          fontSize: 12,
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          backgroundColor: theme.palette.background.paper,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#2196F3"
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                >
                  <Typography color="text.secondary">
                    No trend data available yet.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Korean Levels (Moved up) */}
        <Grid item xs={12} lg={4}>
          <GlassCard>
            <CardContent sx={{ height: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Korean Levels
              </Typography>
              {koreanLevelRows.length > 0 ? (
                <Box
                  sx={{ width: "100%", height: 320, minWidth: 0, minHeight: 0 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={koreanLevelRows}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="level"
                      >
                        {koreanLevelRows.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                >
                  <Typography color="text.secondary">
                    No Korean classes data.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Bottom Bar Chart */}
        <Grid item xs={12}>
          <GlassCard>
            <CardContent sx={{ minHeight: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Academy Distribution
              </Typography>
              {academyRows.length > 0 ? (
                <Box
                  sx={{ width: "100%", height: 320, minWidth: 0, minHeight: 0 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={academyRows}
                      layout="vertical"
                      margin={{ left: 40, right: 20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                        strokeOpacity={0.2}
                      />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="academy"
                        type="category"
                        width={120}
                        tick={{
                          fill: theme.palette.text.primary,
                          fontWeight: 500,
                          fontSize: 13,
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "transparent" }}
                        contentStyle={{ borderRadius: 8 }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#2196F3"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      >
                        {academyRows.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  height={200}
                >
                  <Typography color="text.secondary">
                    No academies selected.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
