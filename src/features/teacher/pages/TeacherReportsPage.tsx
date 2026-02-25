import * as React from "react";
import {
  Box,
  Button,
  CardContent,
  Stack,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Typography,
  Chip,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { FileText as FileTextIcon, ClipboardCheck } from "lucide-react";
import { GlassCard } from "../../../components/GlassCard";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import { supabase } from "../../../lib/supabase";
import { useTeacherReports } from "../../reports/hooks/useTeacherReports";
import {
  formatClassDateLabel,
  getNearestSaturdayYmd,
  getSaturdayOptions,
  getSaturdayRangePreset,
  isSaturdayYmd,
  type SaturdayRangePreset,
} from "../../../lib/classDate";

type AttendanceDetailRow = {
  studentId: string;
  studentName: string;
  status: string;
  reason: string;
};

export default function TeacherReportsPage() {
  const { teacherProfile, isTeacher, isAdmin } = useTeacherContext();
  const [tab, setTab] = React.useState(0);
  const [feedbackStudentFilter, setFeedbackStudentFilter] = React.useState("");
  const [rangePreset, setRangePreset] = React.useState<
    SaturdayRangePreset | "custom"
  >("last4Saturdays");
  const [showRangeCalendar, setShowRangeCalendar] = React.useState(false);
  const [rangeHint, setRangeHint] = React.useState("");

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRows, setDetailRows] = React.useState<AttendanceDetailRow[]>([]);
  const [detailTitle, setDetailTitle] = React.useState("");

  const {
    academies,
    selectedAcademy,
    setSelectedAcademy,
    visibleLevels,
    selectedLevel,
    setSelectedLevel,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    attendanceRows,
    feedbackRows,
    loading,
    error,
  } = useTeacherReports({ isTeacher, teacherProfile });

  const feedbackRowsFiltered = React.useMemo(() => {
    const term = feedbackStudentFilter.trim().toLowerCase();
    if (!term) return feedbackRows;
    return feedbackRows.filter((r) => r.studentName.toLowerCase().includes(term));
  }, [feedbackRows, feedbackStudentFilter]);

  React.useEffect(() => {
    if (rangePreset === "custom") return;
    const range = getSaturdayRangePreset(rangePreset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, [rangePreset, setStartDate, setEndDate]);

  const rangeLabel = React.useMemo(() => {
    if (rangePreset !== "custom") return getSaturdayRangePreset(rangePreset).label;
    return `${startDate} - ${endDate}`;
  }, [rangePreset, startDate, endDate]);
  const saturdayFromOptions = React.useMemo(
    () => getSaturdayOptions(startDate, 16, 4),
    [startDate],
  );
  const saturdayToOptions = React.useMemo(
    () => getSaturdayOptions(endDate, 16, 4),
    [endDate],
  );

  const setSaturdayRangeDate = (target: "from" | "to", value: string) => {
    if (target === "from") setStartDate(value);
    else setEndDate(value);
    setRangePreset("custom");
    setRangeHint("");
  };

  const setManualRangeDate = (target: "from" | "to", value: string) => {
    if (!value) return;
    const adjusted = isSaturdayYmd(value) ? value : getNearestSaturdayYmd(value);
    if (target === "from") setStartDate(adjusted);
    else setEndDate(adjusted);
    setRangePreset("custom");
    setRangeHint(
      isSaturdayYmd(value)
        ? ""
        : `Adjusted to Saturday date: ${formatClassDateLabel(adjusted)}`,
    );
  };

  const openSessionDetails = async (sessionId: string, label: string) => {
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, status, reason, students(first_name,last_name)")
      .eq("session_id", sessionId);
    setDetailRows(
      (data || []).map((r: any) => ({
        studentId: r.student_id,
        studentName: `${r.students?.first_name || ""} ${r.students?.last_name || ""}`.trim(),
        status: r.status || "absent",
        reason: r.reason || "",
      })),
    );
    setDetailTitle(label);
    setDetailOpen(true);
  };

  const attendanceCols: GridColDef[] = React.useMemo(
    () => [
      { field: "date", headerName: "Date", width: 120 },
      { field: "academyName", headerName: "Academy", minWidth: 160, flex: 1 },
      { field: "levelName", headerName: "Level", minWidth: 160, flex: 1 },
      { field: "present", headerName: "Present", width: 100 },
      { field: "late", headerName: "Late", width: 90 },
      { field: "absent", headerName: "Absent", width: 100 },
      { field: "total", headerName: "Total", width: 90 },
      {
        field: "action",
        headerName: "Details",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Chip
            label="View"
            size="small"
            color="primary"
            onClick={() =>
              openSessionDetails(p.row.id, `${p.row.academyName} - ${p.row.levelName} (${p.row.date})`)
            }
          />
        ),
      },
    ],
    [],
  );

  const feedbackCols: GridColDef[] = React.useMemo(
    () => [
      { field: "date", headerName: "Date", width: 120 },
      { field: "studentName", headerName: "Student", minWidth: 180, flex: 1 },
      { field: "academyName", headerName: "Academy", minWidth: 150, flex: 1 },
      { field: "levelName", headerName: "Level", minWidth: 140, flex: 1 },
      { field: "score", headerName: "Score", width: 90 },
      { field: "attendancePct", headerName: "Attendance %", width: 130 },
      { field: "certTypeOverride", headerName: "Cert Override", width: 150 },
      { field: "comment", headerName: "Comment", minWidth: 240, flex: 1.5 },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <FileTextIcon size={28} />
        <Typography variant="h4" fontWeight={800}>
          Teacher Reports
        </Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Attendance and feedback history with class/date filters.
      </Typography>

      <GlassCard>
        <CardContent>
          {!isTeacher && !isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Report access is scoped by your role and class assignments.
            </Alert>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
            <Autocomplete
              options={academies}
              getOptionLabel={(o) => o.name}
              value={selectedAcademy}
              onChange={(_, v) => {
                setSelectedAcademy(v);
                setSelectedLevel("");
              }}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(p) => <TextField {...p} label="Academy" size="small" />}
              sx={{ minWidth: 280 }}
            />
            {visibleLevels.length > 0 && (
              <TextField
                select
                size="small"
                label="Level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                sx={{ minWidth: 240 }}
              >
                <MenuItem value="">All Levels</MenuItem>
                {visibleLevels.map((l) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                    {l.schedule ? ` — ${l.schedule}` : ""}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label="Range Preset"
              size="small"
              value={rangePreset}
              onChange={(e) =>
                setRangePreset(
                  e.target.value as SaturdayRangePreset | "custom",
                )
              }
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="lastSaturday">Last Saturday</MenuItem>
              <MenuItem value="last4Saturdays">Last 4 Saturdays</MenuItem>
              <MenuItem value="thisMonth">This Month</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </TextField>
            <TextField
              label="Student (optional)"
              size="small"
              value={feedbackStudentFilter}
              onChange={(e) => setFeedbackStudentFilter(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <TextField
              select
              label="From Saturday"
              size="small"
              value={startDate}
              onChange={(e) => setSaturdayRangeDate("from", e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {saturdayFromOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="To Saturday"
              size="small"
              value={endDate}
              onChange={(e) => setSaturdayRangeDate("to", e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {saturdayToOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowRangeCalendar((v) => !v)}
            >
              {showRangeCalendar ? "Hide calendar" : "Open calendar"}
            </Button>
            <Chip
              label={`Range: ${rangeLabel}`}
              variant="outlined"
              color="primary"
              sx={{ alignSelf: "center" }}
            />
            {showRangeCalendar && (
              <>
                <TextField
                  label="Pick from date"
                  type="date"
                  size="small"
                  value={startDate}
                  InputLabelProps={{ shrink: true }}
                  onChange={(e) => setManualRangeDate("from", e.target.value)}
                />
                <TextField
                  label="Pick to date"
                  type="date"
                  size="small"
                  value={endDate}
                  InputLabelProps={{ shrink: true }}
                  onChange={(e) => setManualRangeDate("to", e.target.value)}
                />
              </>
            )}
            {!!rangeHint && (
              <Alert severity="info" sx={{ py: 0 }}>
                {rangeHint}
              </Alert>
            )}
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<ClipboardCheck size={18} />} iconPosition="start" label={`Attendance (${attendanceRows.length})`} />
            <Tab icon={<FileTextIcon size={18} />} iconPosition="start" label={`Feedback (${feedbackRowsFiltered.length})`} />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ height: 620 }}>
              <DataGrid
                rows={attendanceRows}
                columns={attendanceCols}
                loading={loading}
                getRowId={(r) => r.id}
                disableRowSelectionOnClick
                slots={{ toolbar: GridToolbar }}
              />
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ height: 620 }}>
              <DataGrid
                rows={feedbackRowsFiltered}
                columns={feedbackCols}
                loading={loading}
                getRowId={(r) => r.id}
                disableRowSelectionOnClick
                slots={{ toolbar: GridToolbar }}
              />
            </Box>
          )}
        </CardContent>
      </GlassCard>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{detailTitle || "Attendance Details"}</DialogTitle>
        <DialogContent>
          <Box sx={{ height: 420 }}>
            <DataGrid
              rows={detailRows}
              columns={[
                { field: "studentName", headerName: "Student", minWidth: 220, flex: 1 },
                { field: "status", headerName: "Status", width: 120 },
                { field: "reason", headerName: "Reason", minWidth: 260, flex: 1.2 },
              ]}
              getRowId={(r) => r.studentId}
              disableRowSelectionOnClick
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
