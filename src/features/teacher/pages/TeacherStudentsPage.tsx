import * as React from "react";
import {
  Box,
  Chip,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  GridToolbar,
  type GridColDef,
  gridClasses,
} from "@mui/x-data-grid";
import { Users } from "lucide-react";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import type { Registration } from "../../registrations/types";
import { normalizeAcademy } from "../../../lib/normalization";
import { computeAge } from "../../../lib/validations";
import { PageHeader } from "../../../components/PageHeader";
import { PageHeaderColors } from "../../../components/pageHeaderColors";
import { GlassCard } from "../../../components/GlassCard";

// ---------- Row type ----------
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
  academies: string;
};

export default function TeacherStudentsPage() {
  const { data: allRegs } = useSupabaseRegistrations();
  const { teacherProfile } = useTeacherContext();

  // Filter registrations to only those in the teacher's assigned academies
  const myStudents = React.useMemo<StudentRow[]>(() => {
    if (!teacherProfile || !allRegs.length) return [];

    const myAcademies = teacherProfile.academies.map((a) => ({
      name: normalizeAcademy(a.academyName),
      level: a.level || null,
    }));

    const rows: StudentRow[] = [];
    let idx = 0;

    allRegs.forEach((reg: Registration) => {
      // Check if student belongs to any of my academies
      const matchedAcademies: string[] = [];

      if (reg.selectedAcademies && Array.isArray(reg.selectedAcademies)) {
        reg.selectedAcademies.forEach((sa) => {
          const saAcademy = normalizeAcademy(sa.academy || "");
          const match = myAcademies.some((ma) => {
            if (saAcademy !== ma.name) return false;
            // If teacher is assigned to a specific level, only show matching students
            if (ma.level && sa.level && ma.level !== sa.level) return false;
            return true;
          });
          if (match) {
            const label = sa.level ? `${sa.academy} (${sa.level})` : sa.academy || "";
            if (!matchedAcademies.includes(label)) matchedAcademies.push(label);
          }
        });
      }

      if (matchedAcademies.length > 0) {
        idx++;
        const ageVal = reg.birthday ? computeAge(reg.birthday) : "";
        rows.push({
          id: reg.id,
          rowNum: idx,
          firstName: reg.firstName || "",
          lastName: reg.lastName || "",
          email: reg.email || "",
          phone: reg.cellNumber || "",
          gender: reg.gender || "",
          age: ageVal !== undefined && ageVal !== null ? String(ageVal) : "",
          city: reg.city || "",
          academies: matchedAcademies.join(", "),
        });
      }
    });

    return rows.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [allRegs, teacherProfile]);

  // Re-number after sort
  const numberedRows = React.useMemo(
    () => myStudents.map((r, i) => ({ ...r, rowNum: i + 1 })),
    [myStudents],
  );

  // ---------- Columns ----------
  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "rowNum",
        headerName: "#",
        width: 60,
        sortable: false,
        filterable: false,
      },
      { field: "firstName", headerName: "First Name", minWidth: 130, flex: 1 },
      { field: "lastName", headerName: "Last Name", minWidth: 130, flex: 1 },
      { field: "email", headerName: "Email", minWidth: 200, flex: 1.2 },
      { field: "phone", headerName: "Phone", minWidth: 130, flex: 0.8 },
      { field: "gender", headerName: "Gender", width: 90 },
      { field: "age", headerName: "Age", width: 70 },
      { field: "city", headerName: "City", minWidth: 120, flex: 0.8 },
      {
        field: "academies",
        headerName: "Academies",
        minWidth: 200,
        flex: 1.5,
        renderCell: (params) => {
          const items = (params.value as string || "").split(", ").filter(Boolean);
          return (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", py: 0.5 }}>
              {items.map((a, i) => (
                <Chip key={i} label={a} size="small" variant="outlined" color="primary" />
              ))}
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        icon={<Users size={40} />}
        title="My Students"
        subtitle={`${numberedRows.length} students in your classes`}
        {...PageHeaderColors.students}
      />

      <GlassCard>
        <Box sx={{ p: { xs: 1, md: 2 } }}>
          {/* Summary chips */}
          <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={`${numberedRows.length} Students`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {teacherProfile?.academies.map((a, i) => (
              <Chip
                key={i}
                label={a.level ? `${a.academyName} — ${a.level}` : a.academyName}
                size="small"
                sx={{
                  bgcolor: "rgba(14, 165, 233, 0.08)",
                  fontWeight: 500,
                }}
              />
            ))}
          </Box>

          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={numberedRows}
              columns={columns}
              getRowId={(r) => r.id}
              slots={{ toolbar: GridToolbar }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 300 },
                },
              }}
              disableRowSelectionOnClick
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
                [`& .${gridClasses.toolbarContainer}`]: {
                  p: 2,
                  gap: 1,
                },
              }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            This is a read-only view of students enrolled in your classes. Contact admin for changes.
          </Typography>
        </Box>
      </GlassCard>
    </Box>
  );
}
