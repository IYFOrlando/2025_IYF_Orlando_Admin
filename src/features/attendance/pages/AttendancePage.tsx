import * as React from "react";
import {
  CardContent,
  Stack,
  Button,
  Tooltip,
  Box,
  Alert,
  TextField,
  MenuItem,
  Chip,
  Switch,
  Autocomplete,
  Grid,
  Typography,
} from "@mui/material";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";
import ChecklistIcon from "@mui/icons-material/Checklist";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";

import {
  Alert as SAlert,
  confirmDelete,
} from "../../../lib/alerts";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import type { Registration } from "../../registrations/types";
import { GlassCard } from "../../../components/GlassCard";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import { useInstructors } from "../../payments/hooks/useInstructors";
import { useTeacherNotifications } from "../../dashboard/hooks/useTeacherNotifications";
import { useSupabaseAttendance } from "../hooks/useSupabaseAttendance";
import { PageHeader } from "../../../components/PageHeader";
import { PageHeaderColors } from "../../../components/pageHeaderColors";
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
// deduplicateRegistrations removed - Supabase hook already groups by student.id

const KOREAN = "Korean Language";

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ["jodlouis.dev@gmail.com", "orlando@iyfusa.org"];

type Row = {
  id: string;
  registrationId: string;
  studentName: string;
  present: boolean;
  reason?: string;
  percent?: number;
  recordId?: string; // Supabase record ID
};

export default function AttendancePage() {
  const { data: allRegs } = useSupabaseRegistrations();
  const regs = allRegs; // Supabase hook already groups by student.id
  const { getInstructorByAcademy } = useInstructors();

  // Mobile check
  // const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Unused currently

  // Teacher Context
  const {
    isTeacher,
    teacherProfile,
    isAdmin: contextIsAdmin,
  } = useTeacherContext();
  const { addNotification } = useTeacherNotifications(false);

  // Who is signed in (to flip admin vs read-only)
  const { currentUser } = useAuth();
  const userEmail = currentUser?.email || null;

  const isSuperAdmin =
    !!(userEmail && ADMIN_EMAILS.includes(userEmail)) || contextIsAdmin;
  const canEdit = isSuperAdmin || isTeacher;

  // Filters
  // Determine initial date (nearest past Saturday or today if Saturday)
  const getInitialSaturday = () => {
    const d = new Date();
    const day = d.getDay();
    if (day !== 6) {
      const diff = (day + 1) % 7;
      d.setDate(d.getDate() - diff);
    }
    return d.toISOString().slice(0, 10);
  };

  const [date, setDate] = React.useState<string>(getInitialSaturday());

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    setDate(val);
  };

  const [academy, setAcademy] = React.useState<string>("");
  const [level, setLevel] = React.useState<string>("");
  const [teacherName, setTeacherName] = React.useState<string>("");
  const [teacherNote, setTeacherNote] = React.useState<string>("");

  // Auto-fill teacher name when academy/level changes
  React.useEffect(() => {
    if (academy) {
      const instructor = getInstructorByAcademy(academy, level || null);
      if (instructor && instructor.name) {
        setTeacherName(instructor.name);
      }
    }
  }, [academy, level, getInstructorByAcademy]);

  // Academies from registrations (normalized)
  const academies = React.useMemo(() => {
    // If teacher, only show their assigned academies
    if (isTeacher && teacherProfile) {
      return Array.from(
        new Set(
          teacherProfile.academies.map((a) => normalizeAcademy(a.academyName)),
        ),
      ).sort((a, b) => a.localeCompare(b));
    }

    const set = new Set<string>();
    regs.forEach((r) => {
      if (r.selectedAcademies && Array.isArray(r.selectedAcademies)) {
        r.selectedAcademies.forEach((sa) => {
          const a = normalizeAcademy(sa.academy || "");
          if (a && a.toLowerCase() !== "n/a" && a !== "No Academy") set.add(a);
        });
      }
      // Check legacy period fields
      const a1 = normalizeAcademy(r.firstPeriod?.academy || "");
      const a2 = normalizeAcademy(r.secondPeriod?.academy || "");
      if (a1 && a1.toLowerCase() !== "n/a" && a1 !== "No Academy") set.add(a1);
      if (a2 && a2.toLowerCase() !== "n/a" && a2 !== "No Academy") set.add(a2);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [regs, isTeacher, teacherProfile]);

  // Auto-select academy if only one available (for teachers)
  React.useEffect(() => {
    if (isTeacher && academies.length === 1 && !academy) {
      setAcademy(academies[0]);
    }
  }, [isTeacher, academies, academy]);

  // Roster for selected class (Dynamic & Normalized)
  const roster = React.useMemo(() => {
    if (!academy) return [];
    const isK = academy === KOREAN;
    const list: { id: string; name: string }[] = [];

    regs.forEach((r: Registration) => {
      const studentLevels = new Set<string>();

      // Check selectedAcademies
      if (r.selectedAcademies && Array.isArray(r.selectedAcademies)) {
        r.selectedAcademies.forEach((sa) => {
          if (normalizeAcademy(sa.academy || "") === academy) {
            studentLevels.add(normalizeLevel(sa.level || ""));
          }
        });
      }

      // Legacy
      if (normalizeAcademy(r.firstPeriod?.academy || "") === academy) {
        studentLevels.add(normalizeLevel(r.firstPeriod?.level || ""));
      }
      if (normalizeAcademy(r.secondPeriod?.academy || "") === academy) {
        studentLevels.add(normalizeLevel(r.secondPeriod?.level || ""));
      }

      if (studentLevels.size > 0) {
        if (isK && level) {
          if (studentLevels.has(level)) {
            const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
            list.push({ id: r.id, name: fullName });
          }
        } else {
          const fullName = `${r.firstName || ""} ${r.lastName || ""}`.trim();
          list.push({ id: r.id, name: fullName });
        }
      }
    });

    // unique + sorted
    const m = new Map(list.map((s) => [s.id, s]));
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [regs, academy, level]);

  // Helper to fetch Academy ID (since we only have name in state)
  // We need this for Supabase queries
  const [academyIdMap, setAcademyIdMap] = React.useState<
    Record<string, string>
  >({});
  // Store ALL Korean academy IDs to handle multiple Korean variants
  const [koreanAcademyIds, setKoreanAcademyIds] = React.useState<string[]>([]);
  // Dynamic Korean levels fetched from Supabase (replaces hardcoded list)
  const [koreanLevels, setKoreanLevels] = React.useState<string[]>([]);

  React.useEffect(() => {
    const fetchAcademyIds = async () => {
      const { data } = await supabase.from("academies").select("id, name");
      if (data) {
        const map: Record<string, string> = {};
        const koreanIds: string[] = [];
        data.forEach((a: any) => {
          const normalized = normalizeAcademy(a.name);
          if (normalized === KOREAN) {
            koreanIds.push(a.id);
            // Prefer the exact "Korean Language" academy as primary ID
            if (a.name.trim() === "Korean Language" || !map[normalized]) {
              map[normalized] = a.id;
            }
          } else {
            map[normalized] = a.id;
          }
        });
        setAcademyIdMap(map);
        setKoreanAcademyIds(koreanIds);
      }
    };
    fetchAcademyIds();
  }, []);

  const currentAcademyId = academyIdMap[academy];

  // Fetch Levels Map for ID lookup (must be declared before loadClassForDate)
  const [levelIdMap, setLevelIdMap] = React.useState<Record<string, string>>(
    {},
  );

  // Grid rows
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selection, setSelection] = React.useState<string[]>([]);

  // -- Class History for % --
  const [studentStats, setStudentStats] = React.useState<
    Record<string, number>
  >({});

  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!currentAcademyId) return;

      // 1. Get all sessions for this academy (use all Korean IDs for Korean)
      const isKorean = academy === KOREAN;
      const queryIds = isKorean && koreanAcademyIds.length > 0
        ? koreanAcademyIds
        : [currentAcademyId];

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id")
        .in("academy_id", queryIds);

      if (!sessions || sessions.length === 0) {
        setStudentStats({});
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      // 2. Get all status records
      const { data: records } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .in("session_id", sessionIds);

      if (!records) return;

      const stats: Record<string, { present: number; total: number }> = {};
      records.forEach((r: any) => {
        if (!stats[r.student_id])
          stats[r.student_id] = { present: 0, total: 0 };
        stats[r.student_id].total++;
        if (r.status === "present") stats[r.student_id].present++;
      });

      const percents: Record<string, number> = {};
      Object.keys(stats).forEach((sid) => {
        const s = stats[sid];
        percents[sid] = Math.round((s.present / s.total) * 100);
      });
      setStudentStats(percents);
    };

    fetchHistory();
  }, [currentAcademyId, academy, koreanAcademyIds]); // Re-fetch when academy changes

  const loadClassForDate = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!academy || !currentAcademyId) {
        setRows([]);
        setLoading(false);
        return;
      }

      const isKorean = academy === KOREAN;

      // Build query with proper academy and level filtering
      let query = supabase
        .from("attendance_sessions")
        .select("id, notes, teacher_id")
        .eq("date", date);

      if (isKorean && koreanAcademyIds.length > 0) {
        // For Korean: query across ALL Korean academy IDs (handles variants)
        query = query.in("academy_id", koreanAcademyIds);

        // Filter by level_id if a specific level is selected
        if (level) {
          let targetLevelId: string | null = null;
          // Search across all Korean academy IDs for the matching level
          for (const kid of koreanAcademyIds) {
            const lid =
              levelIdMap[`${kid}:${normalizeLevel(level)}`] ||
              levelIdMap[`${kid}:${level}`];
            if (lid) {
              targetLevelId = lid;
              break;
            }
          }
          if (targetLevelId) {
            query = query.eq("level_id", targetLevelId);
          }
        }
      } else {
        query = query.eq("academy_id", currentAcademyId);
      }

      const { data: sessions } = await query;
      const session = sessions && sessions.length > 0 ? sessions[0] : null;

      const existingRecords: Record<string, any> = {};

      if (session) {
        // Get Records
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("session_id", session.id);

        recs?.forEach((r: any) => {
          existingRecords[r.student_id] = r;
        });

        if (session.notes) setTeacherNote(session.notes);
      } else {
        setTeacherNote("");
      }

      const base: Row[] = roster.map((s) => {
        const ex = existingRecords[s.id];
        const percent = studentStats[s.id];

        return {
          id: s.id,
          registrationId: s.id,
          studentName: s.name,
          present: ex ? ex.status === "present" : true,
          reason: ex?.reason || "",
          percent,
          recordId: ex?.id,
        };
      });

      setRows(base);
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Unknown error");
      setLoading(false);
    }
  }, [academy, currentAcademyId, date, roster, studentStats, koreanAcademyIds, level, levelIdMap]);

  React.useEffect(() => {
    void loadClassForDate();
  }, [loadClassForDate]);

  // Columns
  const cols = React.useMemo<GridColDef[]>(
    () => [
      { field: "studentName", headerName: "Student", minWidth: 220, flex: 1 },
      {
        field: "present",
        headerName: "Present",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <Switch
            checked={!!p.row.present}
            onChange={(e) => {
              const checked = e.target.checked;
              setRows((prev) =>
                prev.map((r) =>
                  r.id === p.row.id
                    ? {
                        ...r,
                        present: checked,
                        reason: checked ? "" : r.reason,
                      }
                    : r,
                ),
              );
            }}
            disabled={!canEdit}
          />
        ),
      },
      {
        field: "reason",
        headerName: "Reason (if absent)",
        minWidth: 260,
        flex: 1.2,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <TextField
            size="small"
            fullWidth
            placeholder="Illness, travel, family…"
            value={p.row.reason || ""}
            disabled={p.row.present || !canEdit}
            onChange={(e) =>
              setRows((prev) =>
                prev.map((r) =>
                  r.id === p.row.id ? { ...r, reason: e.target.value } : r,
                ),
              )
            }
          />
        ),
      },
      {
        field: "percent",
        headerName: "Attendance %",
        width: 140,
        renderCell: (p) => {
          const pct =
            typeof p.row.percent === "number" ? p.row.percent : undefined;
          return pct !== undefined ? (
            <Chip
              size="small"
              color={pct >= 90 ? "success" : pct >= 75 ? "warning" : "default"}
              label={`${pct}%`}
            />
          ) : (
            <Chip size="small" variant="outlined" label="—" />
          );
        },
      },
    ],
    [canEdit],
  );

  // Admin-only helpers
  const markAll = (val: boolean) =>
    setRows((prev) =>
      prev.map((r) => ({ ...r, present: val, reason: val ? "" : r.reason })),
    );

  React.useEffect(() => {
    const fetchLevels = async () => {
      const { data } = await supabase
        .from("levels")
        .select("id, name, academy_id")
        .order("display_order", { ascending: true });
      if (data) {
        const map: Record<string, string> = {};
        const kLevels: string[] = [];
        const kIdSet = new Set(koreanAcademyIds);

        data.forEach((l: any) => {
          map[`${l.academy_id}:${normalizeLevel(l.name)}`] = l.id;
          map[`${l.academy_id}:${l.name}`] = l.id;

          // Collect Korean level names dynamically
          if (kIdSet.has(l.academy_id) && !kLevels.includes(l.name)) {
            kLevels.push(l.name);
          }
        });
        setLevelIdMap(map);
        setKoreanLevels(kLevels);
      }
    };
    fetchLevels();
  }, [koreanAcademyIds]);

  const { saveAttendance, deleteAttendanceRecords } = useSupabaseAttendance();

  const saveAll = async () => {
    if (!canEdit)
      return SAlert.fire({
        title: "Read-only",
        text: "Only admins or teachers can save.",
        icon: "info",
      });
    if (!academy || !currentAcademyId)
      return SAlert.fire({ title: "Select an academy", icon: "warning" });

    // Validate Level Requirement for Korean
    const isKorean = academy === KOREAN;
    let targetLevelId: string | null = null;
    // For Korean, we may need to use a different academy_id than the primary one
    let saveAcademyId = currentAcademyId;

    if (isKorean) {
      if (!level || level === "All") {
        return SAlert.fire({
          title: "Level Required",
          text: "Please select a specific level (Alphabet, Beginner, etc.) to save attendance for Korean Language.",
          icon: "warning",
        });
      }
      // Search across ALL Korean academy IDs for the matching level
      const searchIds = koreanAcademyIds.length > 0 ? koreanAcademyIds : [currentAcademyId];
      for (const kid of searchIds) {
        const lid =
          levelIdMap[`${kid}:${normalizeLevel(level)}`] ||
          levelIdMap[`${kid}:${level}`];
        if (lid) {
          targetLevelId = lid;
          saveAcademyId = kid; // Use the academy that owns this level
          break;
        }
      }

      if (!targetLevelId) {
        console.warn("Level ID not found in map for", level, "- trying direct fetch");
        // Fallback: direct query across all Korean academies
        const { data } = await supabase
          .from("levels")
          .select("id, academy_id")
          .in("academy_id", searchIds)
          .ilike("name", level)
          .limit(1)
          .single();
        if (data) {
          targetLevelId = data.id;
          saveAcademyId = data.academy_id;
        } else {
          return SAlert.fire({
            title: "Error",
            text: "Invalid Level ID. Please contact support.",
            icon: "error",
          });
        }
      }
    }

    // Prepare rows for hook
    const rowsToSave = rows.map((r) => ({
      id: r.registrationId, // hook uses 'id' as studentId
      studentName: r.studentName,
      present: r.present,
      reason: r.reason || "",
      recordId: r.recordId,
    }));

    const success = await saveAttendance(
      date,
      saveAcademyId, // Use correct academy (may differ from primary for Korean levels)
      targetLevelId,
      teacherProfile?.id || null, // Pass teacher ID
      teacherNote,
      rowsToSave,
    );

    if (success) {
      // Notification is handled in hook?
      // Hook has `notifySuccess`.
      // We might want to send the "Teacher Notification" (Admin Log) here?
      // Hook doesn't do "Teacher Notification" logging (supabase/admin_notifications).

      if (isTeacher && teacherProfile) {
        void addNotification({
          teacherId: teacherProfile.id,
          teacherName: teacherProfile.name,
          action: "Updated Attendance",
          academy: academy,
          details: `Date: ${date}, ${rows.length} students, Level: ${level || "N/A"}`,
        });
      }

      void loadClassForDate();
    }
  };

  const handleDelete = async () => {
    if (!isSuperAdmin)
      return SAlert.fire({
        title: "Super Admin Only",
        text: "Only admins can delete attendance records.",
        icon: "info",
      });
    if (!selection.length)
      return SAlert.fire({
        title: "No rows selected",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });

    const rowsToDelete = rows.filter((r) => selection.includes(r.id));
    const recordIds = rowsToDelete
      .map((r) => r.recordId)
      .filter(Boolean) as string[];

    if (recordIds.length === 0) {
      setSelection([]);
      return;
    }

    const res = await confirmDelete(
      "Delete attendance?",
      `You are about to delete ${recordIds.length} record(s) for ${date}.`,
    );
    if (!res.isConfirmed) return;

    const success = await deleteAttendanceRecords(recordIds);

    if (success) {
      setSelection([]);
      void loadClassForDate();
    }
  };

  // ... (Removing the duplicate 'cols' block completely)

  return (
    <Box>
      <PageHeader
        icon={<ChecklistIcon sx={{ fontSize: 40 }} />}
        title="Attendance Tracker"
        subtitle={
          isSuperAdmin
            ? "Admin mode (full edit)"
            : isTeacher
              ? "Teacher mode (scoped)"
              : "Viewer mode (read-only)"
        }
        {...PageHeaderColors.attendance}
      />

      <GlassCard>
        <CardContent>
          {!canEdit && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              You can view rosters and attendance, but only admins or teachers
              can modify.
            </Alert>
          )}

          {/* Filters */}
          <GlassCard
            sx={{
              mb: 3,
              border: "1px solid rgba(0,0,0,0.05)",
              bgcolor: "rgba(255,255,255,0.4)",
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ pb: "16px !important" }}>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 4,
                    height: 24,
                    bgcolor: "primary.main",
                    borderRadius: 1,
                  }}
                />
                Filters & Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={date}
                    onChange={handleDateChange}
                    fullWidth
                    size="small"
                    helperText="Select any date"
                  />
                </Grid>
                {/* Period Dropped */}
                <Grid item xs={12} md={5}>
                  <Autocomplete
                    options={academies}
                    value={academy || null}
                    onChange={(_, v) => {
                      setAcademy(v || "");
                      if ((v || "") !== KOREAN) setLevel("");
                    }}
                    renderInput={(p) => (
                      <TextField
                        {...p}
                        label="Academy"
                        placeholder="Select academy…"
                        size="small"
                      />
                    )}
                    fullWidth
                  />
                </Grid>
                {academy === KOREAN && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      select
                      label="Korean Level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      fullWidth
                      size="small"
                    >
                      {koreanLevels.map((l) => (
                        <MenuItem key={l} value={l}>
                          {l}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
              </Grid>

              {/* Teacher info */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ mt: 2 }}
              >
                <TextField
                  label="Teacher Name"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  sx={{ minWidth: 240 }}
                  disabled={!canEdit}
                  size="small"
                />
                <TextField
                  label="Teacher Note"
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  fullWidth
                  disabled={!canEdit}
                  size="small"
                />
              </Stack>
            </CardContent>
          </GlassCard>

          {/* Actions */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ mb: 3, flexWrap: "wrap" }}
          >
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Tooltip title="Load/refresh roster for this date & class">
                <Button
                  startIcon={<AddIcon />}
                  variant="outlined"
                  onClick={loadClassForDate}
                  disabled={!academy}
                  sx={{ borderRadius: 2, flex: { xs: 1, sm: "none" } }}
                >
                  Load Class
                </Button>
              </Tooltip>
              {canEdit && (
                <>
                  <Tooltip title="Mark everyone present">
                    <Button
                      startIcon={<DoneAllIcon />}
                      color="success"
                      onClick={() => markAll(true)}
                      disabled={!rows.length}
                      sx={{ minWidth: { xs: "45%", sm: "auto" } }}
                    >
                      All Present
                    </Button>
                  </Tooltip>
                  <Tooltip title="Mark everyone absent">
                    <Button
                      startIcon={<CloseIcon />}
                      color="warning"
                      onClick={() => markAll(false)}
                      disabled={!rows.length}
                      sx={{ minWidth: { xs: "45%", sm: "auto" } }}
                    >
                      All Absent
                    </Button>
                  </Tooltip>
                </>
              )}
            </Box>

            {isSuperAdmin && canEdit && selection.length > 0 && (
              <Tooltip title="Delete selected rows for this date">
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDelete}
                  sx={{ borderRadius: 2 }}
                >
                  Delete ({selection.length})
                </Button>
              </Tooltip>
            )}

            <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }} />

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                width: { xs: "100%", sm: "auto" },
                justifyContent: "space-between",
              }}
            >
              <Chip
                label={`${rows.length} students`}
                color="primary"
                variant="outlined"
                sx={{ borderRadius: 2, fontWeight: 600 }}
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveAll}
                disabled={!rows.length || !canEdit}
                sx={{
                  borderRadius: 2,
                  background:
                    "linear-gradient(45deg, #3F51B5 30%, #2196F3 90%)",
                  boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
                  flex: { xs: 1, sm: "none" },
                }}
              >
                Save Attendance
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={cols}
              loading={loading}
              checkboxSelection={canEdit}
              disableRowSelectionOnClick
              onRowSelectionModelChange={(m) => setSelection(m as string[])}
              rowSelectionModel={selection}
              getRowId={(r) => r.id}
              slots={{ toolbar: GridToolbar }}
              columnVisibilityModel={
                {
                  // isMobile logic removed or handled via Media Query hook if needed
                  // Currently just showing standard columns
                }
              }
              sx={{
                border: "none",
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
                },
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "rgba(63, 81, 181, 0.08)",
                  fontWeight: 700,
                },
              }}
            />
          </Box>
        </CardContent>
      </GlassCard>
    </Box>
  );
}
