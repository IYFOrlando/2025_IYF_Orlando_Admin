import * as React from "react";
import {
  CardContent,
  Stack,
  Box,
  Typography,
  Grid,
  Button,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Users,
  School,
  Calendar,
  Download as DownloadIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../../../assets/logo/IYF_logo.png";
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
import { displayYMD } from "../../../lib/date";
import { sendEmail, formatPrice } from "../../../lib/emailService";
import {
  dailyReportTemplate,
  type DailyReportData,
} from "../../../lib/reportEmailTemplates";
import { notifySuccess, notifyError } from "../../../lib/alerts";
import { GlassCard } from "../../../components/GlassCard";
import { PageHeader } from "../../../components/PageHeader";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { useSupabasePayments } from "../../payments/hooks/useSupabasePayments";
// import { motion } from "framer-motion";

// --- Types ---

/* TabPanel kept for future use
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index}
      id={`reports-tabpanel-${index}`} aria-labelledby={`reports-tab-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}
*/

function computeAge(birthday?: string | null): number | "" {
  if (!birthday) return "";
  const age = new Date().getFullYear() - new Date(birthday).getFullYear();
  return age < 0 ? "" : age;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

export default function ReportsPage() {
  const { data: registrations, loading } = useSupabaseRegistrations();
  const { data: payments, loading: paymentsLoading } = useSupabasePayments();
  const [dailyReportEmailTo, _setDailyReportEmailTo] =
    React.useState("orlando@iyfusa.org");
  const [sendingDailyReportEmail, setSendingDailyReportEmail] =
    React.useState(false);

  // define dailyStats memo
  const dailyStats = React.useMemo(() => {
    const today = displayYMD(new Date());
    const yesterday = displayYMD(new Date(Date.now() - 86400000));

    // Registrations
    const todayRegs = registrations.filter(
      (r) => r.createdAt && displayYMD(r.createdAt) === today,
    );
    const yesterdayRegs = registrations.filter(
      (r) => r.createdAt && displayYMD(r.createdAt) === yesterday,
    );

    // Total enrollment by academy
    const totalAcademyMap = new Map<string, number>();
    registrations.forEach((r) => {
      if (
        (r as any).selectedAcademies &&
        Array.isArray((r as any).selectedAcademies)
      ) {
        (r as any).selectedAcademies.forEach((a: any) => {
          if (a && a.academy) {
            const normName = normalizeAcademy(a.academy);
            totalAcademyMap.set(
              normName,
              (totalAcademyMap.get(normName) || 0) + 1,
            );
          }
        });
      }
    });
    const allAcademyStats = Array.from(totalAcademyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Korean language level breakdown
    const koreanLevelMap = new Map<string, number>();
    registrations.forEach((r) => {
      if (
        (r as any).selectedAcademies &&
        Array.isArray((r as any).selectedAcademies)
      ) {
        (r as any).selectedAcademies.forEach((a: any) => {
          const normName = normalizeAcademy(a.academy);
          if (normName === "Korean Language") {
            let levelName = a.level ? normalizeLevel(a.level) : null;

            // Infer level from Academy Name if level is missing
            if (
              !levelName &&
              a.academy.toLowerCase().includes("conversation")
            ) {
              levelName = "Conversation";
            }

            if (levelName) {
              // Normalize consistency (e.g. "Conversation" vs "Korean Conversation")
              if (levelName.toLowerCase().includes("conversation"))
                levelName = "Conversation";

              koreanLevelMap.set(
                levelName,
                (koreanLevelMap.get(levelName) || 0) + 1,
              );
            }
          }
        });
      }
    });
    const koreanLevelStats = Array.from(koreanLevelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    // Today's academy breakdown
    const todayAcademyMap = new Map<string, number>();
    todayRegs.forEach((r) => {
      if (
        (r as any).selectedAcademies &&
        Array.isArray((r as any).selectedAcademies)
      ) {
        (r as any).selectedAcademies.forEach((a: any) => {
          if (a.academy) {
            todayAcademyMap.set(
              a.academy,
              (todayAcademyMap.get(a.academy) || 0) + 1,
            );
          }
        });
      }
    });
    const todayAcademyStats = Array.from(todayAcademyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Build Rosters (Academy -> Students List)
    // We explicitly type the roster items to include all NASA-level fields
    const rosters: Record<
      string,
      Array<{
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        age?: number | string;
        gender?: string;
        shirtSize?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        guardianName?: string;
        guardianPhone?: string;
        createdAt?: any;
      }>
    > = {};

    registrations.forEach((r) => {
      if (
        (r as any).selectedAcademies &&
        Array.isArray((r as any).selectedAcademies)
      ) {
        (r as any).selectedAcademies.forEach((a: any) => {
          if (a && a.academy && normalizeAcademy(a.academy) !== "n/a") {
            const acName = a.academy.trim();
            if (!rosters[acName]) rosters[acName] = [];
            rosters[acName].push({
              firstName: r.firstName || "",
              lastName: r.lastName || "",
              email: r.email || "",
              phone: r.cellNumber || "",
              age: computeAge(r.birthday),
              gender: r.gender,
              shirtSize: r.tShirtSize,
              address: r.address,
              city: r.city,
              state: r.state,
              zip: r.zipCode,
              guardianName: r.guardianName,
              guardianPhone: r.guardianPhone,
              createdAt: r.createdAt,
            });
          }
        });
      }
    });

    return {
      today: {
        registrations: todayRegs.length,
        payments: 0,
        revenue: 0,
        newStudents: todayRegs.map((r) => ({
          firstName: r.firstName || "",
          lastName: r.lastName || "",
          email: r.email || "",
          phone: r.cellNumber || "",
          selectedAcademies: (r as any).selectedAcademies,
          id: r.id,
        })),
        academies: todayAcademyStats,
      },
      yesterday: {
        registrations: yesterdayRegs.length,
      },
      overall: {
        totalStudents: registrations.length,
        totalRevenue: 0,
        totalPending: 0,
        paidCount: 0,
        unpaidCount: 0,
      },
      allAcademies: allAcademyStats,
      koreanLevels: koreanLevelStats,
      rosters, // Including rosters in stats
    };
  }, [registrations]);

  const generateDailyReportPDF = () => {
    // Landscape orientation for "NASA" detail
    const doc = new jsPDF("l");
    const pageWidth = doc.internal.pageSize.getWidth();

    try {
      doc.addImage(logoImage, "JPEG", 20, 10, 25, 25);
    } catch (error) {}

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("IYF Orlando Academy - Daily Report", pageWidth / 2, 20, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString(), pageWidth / 2, 28, {
      align: "center",
    });

    let yPos = 45;

    // Total Students
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total Students Unique: ${dailyStats.overall.totalStudents}`,
      20,
      yPos,
    );
    yPos += 10;
    doc.text(`New Students Today: ${dailyStats.today.registrations}`, 20, yPos);
    yPos += 15;

    // New Students Table
    if (dailyStats.today.newStudents.length > 0) {
      doc.setFontSize(12);
      doc.text("New Students Today", 20, yPos);
      yPos += 5;
      const newStudentsData = dailyStats.today.newStudents.map(
        (student, idx) => [
          (idx + 1).toString(),
          `${student.firstName} ${student.lastName}`,
          student.email,
          student.phone,
          student.selectedAcademies?.[0]?.academy || "N/A",
        ],
      );
      autoTable(doc, {
        startY: yPos,
        head: [["#", "Name", "Email", "Phone", "Academy"]],
        body: newStudentsData,
        theme: "striped",
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Academy Distribution
    doc.text("Academy Enrollment", 20, yPos);
    yPos += 5;
    const academyData = dailyStats.allAcademies.map((a, i) => [
      i + 1,
      a.name,
      a.count,
    ]);
    autoTable(doc, {
      startY: yPos,
      head: [["Rank", "Academy", "Count"]],
      body: academyData,
      theme: "striped",
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Class Rosters Section (Detailed)
    doc.addPage();
    yPos = 20;
    doc.setFontSize(16);
    doc.text("Master Class Rosters", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    if (dailyStats.rosters) {
      Object.entries(dailyStats.rosters).forEach(([academyName, students]) => {
        // Check if we need a new page approximated
        if (yPos > 180) {
          // Landscape page height is smaller (~210mm)
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 150, 243);
        doc.text(`${academyName} (${students.length})`, 14, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;

        const rosterData = students.map((s, idx) => [
          (idx + 1).toString(),
          `${s.firstName} ${s.lastName}`,
          s.age || "-",
          s.gender || "-",
          s.phone || "-",
          s.email || "-",
          `${s.city || "-"}, ${s.state || "-"}`,
          s.shirtSize || "-",
          s.guardianName ? `${s.guardianName} (${s.guardianPhone})` : "-",
          s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [
            [
              "#",
              "Name",
              "Age",
              "Sex",
              "Phone",
              "Email",
              "Location",
              "Size",
              "Guardian",
              "Reg. Date",
            ],
          ],
          body: rosterData,
          theme: "grid",
          headStyles: {
            fillColor: [41, 128, 185],
            fontSize: 9,
            halign: "center",
          },
          styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 35, fontStyle: "bold" },
            2: { cellWidth: 10, halign: "center" },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 25 },
            5: { cellWidth: 40 },
            6: { cellWidth: 30 },
            7: { cellWidth: 15, halign: "center" },
            8: { cellWidth: 40 },
            9: { cellWidth: 20, halign: "center" },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    doc.save(
      `daily-report-detailed-${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  // Chart Data
  const chartData = React.useMemo(() => {
    const cityCount: Record<string, number> = {};
    registrations.forEach((r) => {
      if (r.city && r.city !== "N/A") {
        cityCount[r.city] = (cityCount[r.city] || 0) + 1;
      }
    });
    const cityData = Object.entries(cityCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { cities: cityData };
  }, [registrations]);

  if (loading || paymentsLoading)
    return <Typography>Loading reports...</Typography>;

  const sendDailyReportEmail = async () => {
    if (!dailyReportEmailTo?.trim()) {
      notifyError("Enter a recipient email");
      return;
    }
    setSendingDailyReportEmail(true);
    try {
      const reportDate = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const payload: DailyReportData = {
        reportDate,
        today: dailyStats.today,
        overall: dailyStats.overall,
        allAcademies: dailyStats.allAcademies,
        koreanLevels: dailyStats.koreanLevels,
        rosters: dailyStats.rosters, // Pass the rosters
      };
      const html = dailyReportTemplate(payload);
      const result = await sendEmail({
        to: dailyReportEmailTo.trim(),
        subject: `Daily Report – ${reportDate} – IYF Orlando Academy`,
        html,
        fromName: "IYF Orlando Admin",
      });
      if (result.success) {
        notifySuccess("Report sent", `Email sent to ${dailyReportEmailTo}`);
      } else {
        notifyError(result.error);
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSendingDailyReportEmail(false);
    }
  };

  // Prepare table data
  const recentRegistrations = [...registrations]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 10);

  const recentPayments = [...payments].slice(0, 10);

  return (
    <Box sx={{ pb: 8 }}>
      <PageHeader
        title="Reports"
        subtitle="Enrollment & Demographic Insights"
        icon={<TrendingUpIcon size={40} />}
      />

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* ... existing KPIs ... */}
        <Grid item xs={12} md={4}>
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
                Total Students
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800}>
              {dailyStats.overall.totalStudents}
            </Typography>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <GlassCard sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "success.light",
                  color: "success.main",
                  mr: 2,
                }}
              >
                <Calendar size={24} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary">
                New Today
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800}>
              {dailyStats.today.registrations}
            </Typography>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
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
                <School size={24} />
              </Box>
              <Typography variant="subtitle2" color="text.secondary">
                Classes Selected
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800}>
              {dailyStats.allAcademies.reduce((a, b) => a + b.count, 0)}
            </Typography>
          </GlassCard>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Row 1: Academy Counts Table & City Chart */}
        <Grid item xs={12} lg={6}>
          <GlassCard sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Academy Enrollment
              </Typography>
              <Box sx={{ mt: 2 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                      <th style={{ textAlign: "left", padding: "12px" }}>
                        Academy
                      </th>
                      <th style={{ textAlign: "right", padding: "12px" }}>
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.allAcademies.map((a, i) => (
                      <React.Fragment key={i}>
                        <tr style={{ borderBottom: "1px solid #f9f9f9" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                            {a.name}
                          </td>
                          <td
                            style={{ padding: "10px 12px", textAlign: "right" }}
                          >
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1.5,
                                py: 0.5,
                                bgcolor: "primary.light",
                                color: "primary.main",
                                borderRadius: 4,
                                fontSize: "0.875rem",
                                fontWeight: 700,
                              }}
                            >
                              {a.count}
                            </Box>
                          </td>
                        </tr>
                        {/* Show Breakdown for Korean Language */}
                        {a.name === "Korean Language" &&
                          dailyStats.koreanLevels.map((lvl, j) => (
                            <tr
                              key={`korean-${j}`}
                              style={{
                                borderBottom: "1px solid #f9f9f9",
                                backgroundColor: "#fdfdfd",
                              }}
                            >
                              <td
                                style={{
                                  padding: "8px 12px 8px 32px",
                                  fontSize: "0.85rem",
                                  color: "#666",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    bgcolor: COLORS[j % COLORS.length],
                                    mr: 1,
                                  }}
                                />
                                {lvl.level}
                              </td>
                              <td
                                style={{
                                  padding: "8px 12px",
                                  textAlign: "right",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "inline-block",
                                    px: 1,
                                    py: 0.25,
                                    bgcolor: COLORS[j % COLORS.length],
                                    color: "#fff",
                                    borderRadius: 4,
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    minWidth: 20,
                                    textAlign: "center",
                                  }}
                                >
                                  {lvl.count}
                                </Box>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Stack spacing={3}>
            {/* City Chart */}
            <GlassCard>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Top Cities
                </Typography>
                <Box sx={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.cities} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <RechartsTooltip />
                      <Bar
                        dataKey="value"
                        fill="#2196F3"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </GlassCard>

            <GlassCard>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Korean Levels
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dailyStats.koreanLevels}
                            dataKey="count"
                            nameKey="level"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {dailyStats.koreanLevels.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Legend />
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 2 }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.875rem",
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                            <th style={{ textAlign: "left", padding: "8px" }}>
                              Level
                            </th>
                            <th style={{ textAlign: "right", padding: "8px" }}>
                              Count
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyStats.koreanLevels.map((item, i) => (
                            <tr
                              key={i}
                              style={{ borderBottom: "1px solid #f9f9f9" }}
                            >
                              <td style={{ padding: "8px", fontWeight: 500 }}>
                                {item.level}
                              </td>
                              <td
                                style={{ padding: "8px", textAlign: "right" }}
                              >
                                <Box
                                  sx={{
                                    display: "inline-block",
                                    px: 1,
                                    py: 0.5,
                                    bgcolor: COLORS[i % COLORS.length],
                                    color: "#fff",
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    minWidth: 24,
                                    textAlign: "center",
                                  }}
                                >
                                  {item.count}
                                </Box>
                              </td>
                            </tr>
                          ))}
                          {dailyStats.koreanLevels.length === 0 && (
                            <tr>
                              <td
                                colSpan={2}
                                style={{ padding: 10, textAlign: "center" }}
                              >
                                No data
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </GlassCard>

            {/* PDF Download Button Area */}
            <GlassCard>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Actions
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={generateDailyReportPDF}
                  >
                    Daily Report PDF (Detailed)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={sendDailyReportEmail}
                    disabled={sendingDailyReportEmail}
                  >
                    {sendingDailyReportEmail ? "Sending..." : "Email Report"}
                  </Button>
                </Stack>
              </CardContent>
            </GlassCard>
          </Stack>
        </Grid>

        {/* Row 2: Recent Lists */}
        <Grid item xs={12} md={6}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Recent Registrations
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #f0f0f0",
                        color: "#666",
                      }}
                    >
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Date
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Name
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Academy
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRegistrations.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f9f9f9" }}>
                        <td style={{ padding: "8px", color: "#666" }}>
                          {r.createdAt &&
                            new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "8px", fontWeight: 600 }}>
                          {r.firstName} {r.lastName}
                        </td>
                        <td style={{ padding: "8px", color: "#444" }}>
                          {(r as any).selectedAcademies?.[0]?.academy || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Recent Payments
              </Typography>
              {paymentsLoading ? (
                <Typography variant="body2">Loading payments...</Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.875rem",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: "2px solid #f0f0f0",
                          color: "#666",
                        }}
                      >
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Date
                        </th>
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Student
                        </th>
                        <th style={{ textAlign: "right", padding: "8px" }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(recentPayments as any).map((p: any, i: number) => (
                        <tr
                          key={i}
                          style={{ borderBottom: "1px solid #f9f9f9" }}
                        >
                          <td style={{ padding: "8px", color: "#666" }}>
                            {p.date || "N/A"}
                          </td>
                          <td style={{ padding: "8px", fontWeight: 600 }}>
                            {p.studentName || "Unknown"}
                          </td>
                          <td
                            style={{
                              padding: "8px",
                              textAlign: "right",
                              color: "green",
                              fontWeight: 600,
                            }}
                          >
                            {formatPrice((p.amount || 0) / 100)}
                          </td>
                        </tr>
                      ))}
                      {recentPayments.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            style={{ padding: 10, textAlign: "center" }}
                          >
                            No payments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
