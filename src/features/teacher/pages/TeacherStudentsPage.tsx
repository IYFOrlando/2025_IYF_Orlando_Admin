import * as React from "react";
import {
  Box,
  Chip,
  Typography,
  TextField,
  Tab,
  Tabs,
  CardContent,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  gridClasses,
} from "@mui/x-data-grid";
import { Users, Search } from "lucide-react";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import type { Registration } from "../../registrations/types";
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
import { computeAge } from "../../../lib/validations";
import { supabase } from "../../../lib/supabase";
import { PageHeader } from "../../../components/PageHeader";
import { PageHeaderColors } from "../../../components/pageHeaderColors";
import { GlassCard } from "../../../components/GlassCard";

// ---------- Types ----------
type StudentRow = {
  id: string;
  rowNum: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  age: string;
  city: string;
};

type ClassGroup = {
  key: string;
  label: string;
  academyName: string;
  level: string | null;
  students: StudentRow[];
};

export default function TeacherStudentsPage() {
  const { data: allRegs } = useSupabaseRegistrations();
  const { teacherProfile } = useTeacherContext();
  const [activeTab, setActiveTab] = React.useState(0);
  const [search, setSearch] = React.useState("");

  // Fetch levels per academy ID to resolve sub-academy assignments
  const [academyLevelsMap, setAcademyLevelsMap] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    const fetchLevels = async () => {
      const { data } = await supabase
        .from("levels")
        .select("name, academy_id, schedule")
        .order("display_order", { ascending: true });
      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach((l: any) => {
          if (!map[l.academy_id]) map[l.academy_id] = [];
          if (!map[l.academy_id].includes(l.name)) {
            map[l.academy_id].push(l.name);
          }
        });
        setAcademyLevelsMap(map);
      }
    };
    fetchLevels();
  }, []);

  // Group students by teacher's academy/level assignments
  // Handles sub-academies: when level is null, resolves levels from the specific academyId
  const classGroups = React.useMemo<ClassGroup[]>(() => {
    if (!teacherProfile || !allRegs.length) return [];

    // Resolve each teacher assignment into groups with proper level info
    const groups: ClassGroup[] = [];

    teacherProfile.academies.forEach((a) => {
      if (a.level) {
        // Teacher explicitly assigned to a specific level
        groups.push({
          key: `${a.academyName}::${a.level}`,
          label: `${normalizeAcademy(a.academyName)} — ${a.level}`,
          academyName: normalizeAcademy(a.academyName),
          level: a.level,
          students: [],
        });
      } else {
        // Teacher assigned to entire (sub-)academy
        // Look up what levels belong to this specific academyId
        const subLevels = academyLevelsMap[a.academyId] || [];
        if (subLevels.length > 0) {
          // Create one group per level in this sub-academy
          subLevels.forEach(lvl => {
            const key = `${a.academyName}::${lvl}`;
            // Avoid duplicate groups (if another assignment already covers this level)
            if (!groups.some(g => g.key === key)) {
              groups.push({
                key,
                label: `${normalizeAcademy(a.academyName)} — ${lvl}`,
                academyName: normalizeAcademy(a.academyName),
                level: lvl,
                students: [],
              });
            }
          });
        } else {
          // Academy has no levels at all - show as single group
          groups.push({
            key: `${a.academyName}::all`,
            label: a.academyName,
            academyName: normalizeAcademy(a.academyName),
            level: null,
            students: [],
          });
        }
      }
    });

    allRegs.forEach((reg: Registration) => {
      if (!reg.selectedAcademies || !Array.isArray(reg.selectedAcademies)) return;

      reg.selectedAcademies.forEach((sa) => {
        const saAcademy = normalizeAcademy(sa.academy || "");

        groups.forEach((group) => {
          if (saAcademy !== group.academyName) return;
          if (group.level) {
            // Group has a specific level - match student level
            const studentLevel = normalizeLevel(sa.level || "");
            const groupLevel = normalizeLevel(group.level);
            if (studentLevel !== groupLevel && sa.level !== group.level) return;
          }
          // group.level is null → no levels, accept all students

          // Avoid duplicates
          if (group.students.some((s) => s.id === reg.id)) return;

          const ageVal = reg.birthday ? computeAge(reg.birthday) : "";
          group.students.push({
            id: reg.id,
            rowNum: 0,
            firstName: reg.firstName || "",
            lastName: reg.lastName || "",
            email: reg.email || "",
            phone: reg.cellNumber || "",
            gender: reg.gender || "",
            age: ageVal !== undefined && ageVal !== null ? String(ageVal) : "",
            city: reg.city || "",
          });
        });
      });
    });

    // Sort students in each group and number them
    groups.forEach((g) => {
      g.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
      g.students.forEach((s, i) => (s.rowNum = i + 1));
    });

    return groups;
  }, [allRegs, teacherProfile, academyLevelsMap]);

  // Current group based on active tab
  const currentGroup = classGroups[activeTab] || null;

  // Filter by search
  const filteredStudents = React.useMemo(() => {
    if (!currentGroup) return [];
    if (!search.trim()) return currentGroup.students;
    const q = search.toLowerCase();
    return currentGroup.students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.city.toLowerCase().includes(q),
    );
  }, [currentGroup, search]);

  // Re-number after filter
  const numberedRows = React.useMemo(
    () => filteredStudents.map((r, i) => ({ ...r, rowNum: i + 1 })),
    [filteredStudents],
  );

  // Total students across all groups (unique)
  const totalStudents = React.useMemo(() => {
    const ids = new Set<string>();
    classGroups.forEach((g) => g.students.forEach((s) => ids.add(s.id)));
    return ids.size;
  }, [classGroups]);

  // ---------- Columns ----------
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "rowNum",
        headerName: "#",
        width: 55,
        sortable: false,
        filterable: false,
      },
      { field: "firstName", headerName: "First Name", minWidth: 130, flex: 1 },
      { field: "lastName", headerName: "Last Name", minWidth: 130, flex: 1 },
      { field: "email", headerName: "Email", minWidth: 200, flex: 1.3 },
      { field: "phone", headerName: "Phone", minWidth: 130, flex: 0.8 },
      { field: "gender", headerName: "Gender", width: 85 },
      { field: "age", headerName: "Age", width: 65 },
      { field: "city", headerName: "City", minWidth: 120, flex: 0.8 },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        icon={<Users size={40} />}
        title="My Students"
        subtitle={`${totalStudents} students across ${classGroups.length} class${classGroups.length !== 1 ? "es" : ""}`}
        {...PageHeaderColors.students}
      />

      {classGroups.length === 0 ? (
        <GlassCard>
          <CardContent>
            <Typography color="text.secondary" textAlign="center" py={6}>
              No classes assigned yet. Contact admin if this is an error.
            </Typography>
          </CardContent>
        </GlassCard>
      ) : (
        <>
          {/* Class Tabs */}
          <Box sx={{ mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setSearch("");
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 14,
                  minHeight: 48,
                },
              }}
            >
              {classGroups.map((g, i) => (
                <Tab
                  key={g.key}
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{g.label}</span>
                      <Chip
                        label={g.students.length}
                        size="small"
                        color={activeTab === i ? "primary" : "default"}
                        sx={{ height: 22, fontSize: 12, fontWeight: 700 }}
                      />
                    </Stack>
                  }
                />
              ))}
            </Tabs>
          </Box>

          {/* Student Table */}
          <GlassCard>
            <Box sx={{ p: { xs: 1, md: 2 } }}>
              {/* Search & Summary */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "center" }}
                sx={{ mb: 2 }}
              >
                <TextField
                  placeholder="Search students..."
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 280 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  label={`${numberedRows.length} student${numberedRows.length !== 1 ? "s" : ""}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              <Box sx={{ height: 520, width: "100%" }}>
                <DataGrid
                  rows={numberedRows}
                  columns={columns}
                  getRowId={(r) => r.id}
                  disableRowSelectionOnClick
                  disableColumnMenu
                  initialState={{
                    pagination: { paginationModel: { pageSize: 25 } },
                  }}
                  pageSizeOptions={[25, 50, 100]}
                  sx={{
                    border: "none",
                    [`& .${gridClasses.cell}`]: {
                      borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
                    },
                    [`& .${gridClasses.columnHeaders}`]: {
                      bgcolor: "rgba(14, 165, 233, 0.06)",
                      fontWeight: 700,
                    },
                  }}
                />
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Read-only view. Contact admin for any changes.
              </Typography>
            </Box>
          </GlassCard>
        </>
      )}
    </Box>
  );
}
