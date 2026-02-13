import * as React from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { normalizeAcademy } from "../../../lib/normalization";
import { format } from "date-fns";

type DailyStats = {
  date: string;
  total: number;
  academies: Record<string, number>;
};

type AcademyStats = {
  academy: string;
  total: number;
  dailyBreakdown: Record<string, number>;
};

export default function RegistrationsReportPage() {
  const { data: registrations, loading, error } = useSupabaseRegistrations();

  const stats = React.useMemo(() => {
    if (!registrations)
      return { dailyStats: [], academyStats: [], totalRegistrations: 0 };

    // Group by date
    const dailyMap = new Map<string, DailyStats>();
    const academyMap = new Map<string, AcademyStats>();

    registrations.forEach((reg) => {
      const createdAt =
        typeof reg.createdAt === 'string' ? new Date(reg.createdAt) : new Date(reg.createdAt || Date.now());
      const dateKey = format(createdAt, "yyyy-MM-dd");
      const dateDisplay = format(createdAt, "MMM dd, yyyy");

      // Daily stats
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateDisplay,
          total: 0,
          academies: {},
        });
      }
      const daily = dailyMap.get(dateKey)!;
      daily.total++;

      // Academy stats
      const academiesSet = new Set<string>();

      // New Structure
      if (reg.selectedAcademies && Array.isArray(reg.selectedAcademies)) {
        reg.selectedAcademies.forEach((sa) => {
          const norm = normalizeAcademy(sa.academy || "");
          if (norm && norm !== "No Academy" && norm !== "n/a") {
            academiesSet.add(norm);
          }
        });
      }

      // Legacy Structure (fallback/merge)
      const p1 = normalizeAcademy(reg.firstPeriod?.academy || "");
      const p2 = normalizeAcademy(reg.secondPeriod?.academy || "");
      if (p1 && p1 !== "No Academy" && p1 !== "n/a") academiesSet.add(p1);
      if (p2 && p2 !== "No Academy" && p2 !== "n/a") academiesSet.add(p2);

      const academies = Array.from(academiesSet);

      academies.forEach((academy) => {
        // Update daily academy count
        daily.academies[academy] = (daily.academies[academy] || 0) + 1;

        // Update academy stats
        if (!academyMap.has(academy)) {
          academyMap.set(academy, {
            academy,
            total: 0,
            dailyBreakdown: {},
          });
        }
        const academyStat = academyMap.get(academy)!;
        academyStat.total++;
        academyStat.dailyBreakdown[dateKey] =
          (academyStat.dailyBreakdown[dateKey] || 0) + 1;
      });
    });

    // Convert to arrays and sort
    const dailyStats = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const academyStats = Array.from(academyMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return {
      dailyStats,
      academyStats,
      totalRegistrations: registrations.length,
    };
  }, [registrations]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading registrations...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">
          Error loading registrations: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Registrations Report
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Registrations
              </Typography>
              <Typography variant="h3">{stats.totalRegistrations}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Registration Days
              </Typography>
              <Typography variant="h3">{stats.dailyStats.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Academies
              </Typography>
              <Typography variant="h3">{stats.academyStats.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Breakdown */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Daily Registration Breakdown"
          subheader="Registrations grouped by date and academy"
        />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Date</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Total</strong>
                  </TableCell>
                  {stats.academyStats.slice(0, 8).map((academy) => (
                    <TableCell key={academy.academy} align="center">
                      <strong>{academy.academy}</strong>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.dailyStats.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>
                      <strong>{day.date}</strong>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={day.total} color="primary" size="small" />
                    </TableCell>
                    {stats.academyStats.slice(0, 8).map((academy) => (
                      <TableCell key={academy.academy} align="center">
                        {day.academies[academy.academy] || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Academy Summary */}
      <Card>
        <CardHeader
          title="Academy Summary"
          subheader="Total registrations per academy"
        />
        <CardContent>
          <Grid container spacing={2}>
            {stats.academyStats.map((academy) => (
              <Grid item xs={12} sm={6} md={4} key={academy.academy}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {academy.academy}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {academy.total}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      registrations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
