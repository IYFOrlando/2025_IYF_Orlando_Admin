import * as React from "react";
import {
  Card,
  CardContent,
  Stack,
  Box,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { PageHeader } from "../../../components/PageHeader";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SchoolIcon from "@mui/icons-material/School";
import PrintIcon from "@mui/icons-material/Print";
import PersonIcon from "@mui/icons-material/Person";
import { supabase } from "../../../lib/supabase";
import { useSupabaseRegistrations } from "../../registrations/hooks/useSupabaseRegistrations";
import type { Registration } from "../../registrations/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../../../assets/logo/IYF_logo.png";
// import { db } from "../../../lib/firebase"; // Removed legacy firebase
import { normalizeAcademy, normalizeLevel } from "../../../lib/normalization";
import { computeAge } from "../../../lib/validations";

import { useSupabaseAcademies } from "../hooks/useSupabaseAcademies";
import type { Academy } from "../hooks/useAcademies";

const AcademiesPage = React.memo(function AcademiesPage() {
  const {
    data: registrations,
    loading: regsLoading,
    error: regsError,
  } = useSupabaseRegistrations();
  const {
    academies,
    loading: academiesLoading,
    error: academiesError,
  } = useSupabaseAcademies();

  const loading = regsLoading || academiesLoading;
  const error = regsError || academiesError;

  const [teacherDialogOpen, setTeacherDialogOpen] = React.useState(false);
  const [selectedAcademy, setSelectedAcademy] = React.useState<string>("");
  const [selectedLevel, setSelectedLevel] = React.useState<string>("");
  const [teacherName, setTeacherName] = React.useState("");
  const [teacherEmail, setTeacherEmail] = React.useState("");
  const [teacherPhone, setTeacherPhone] = React.useState("");
  const [teacherCredentials, setTeacherCredentials] = React.useState("");

  // Removed legacy teacher state.
  // Using hook state.

  // Get registrations (omitted changes to getRegistrationsForAcademy in this chunk, targeting only the state and handleTeacherSave)
  // Wait, I can't skip lines in ReplacementContent safely if I'm replacing a huge block.
  // I need to be precise.

  // Actually, I'll execute the REMOVAL of state first.

  // Teachers and Academies are now fetched via useSupabaseAcademies hook
  // which handles the joining and normalization internally.

  // Helper to deduplicate registrations, keeping only the most recent one for each student
  // MOVED TO src/lib/registrations.ts
  // const deduplicateRegistrations = React.useCallback((regs: Registration[]) => { ... }, []);

  // Get registrations for a specific academy (using selectedAcademies - 2026 structure)
  const getRegistrationsForAcademy = React.useCallback(
    (academyName: string, level?: string) => {
      const filtered =
        registrations?.filter((reg) => {
          // NEW STRUCTURE (2026): Check selectedAcademies array
          if (
            (reg as any).selectedAcademies &&
            Array.isArray((reg as any).selectedAcademies)
          ) {
            return (reg as any).selectedAcademies.some((academyData: any) => {
              const matchesAcademy =
                normalizeAcademy(academyData.academy || "") ===
                normalizeAcademy(academyName);
              if (level) {
                const matchesLevel =
                  normalizeLevel(academyData.level || "") ===
                  normalizeLevel(level);
                return matchesAcademy && matchesLevel;
              }
              return matchesAcademy;
            });
          }

          // LEGACY STRUCTURE: Support firstPeriod/secondPeriod for backward compatibility
          const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || "");
          const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || "");
          const matchesAcademy =
            p1Academy === normalizeAcademy(academyName) ||
            p2Academy === normalizeAcademy(academyName);

          if (level) {
            const p1Level = normalizeLevel(reg?.firstPeriod?.level || "");
            const p2Level = normalizeLevel(reg?.secondPeriod?.level || "");
            const matchesLevel =
              p1Level === normalizeLevel(level) ||
              p2Level === normalizeLevel(level);
            return matchesAcademy && matchesLevel;
          }

          return matchesAcademy;
        }) || [];

      // Return filtered list directly without second-pass deduplication
      // This ensures counts match the Reports page (which shows all DB records)
      return filtered;
    },
    [registrations],
  );

  // For Korean Language, group by levels
  const getKoreanRegistrationsByLevel = React.useCallback(
    (academyName: string) => {
      // Note: getRegistrationsForAcademy already deduplicates, but since we are potentially
      // dealing with a subset, we should rely on that deduplication.
      // However, here we are iterating over the raw 'registrations' again essentially?
      // Wait, getRegistrationsForAcademy calls filters then deduplicates.

      // For efficiency and consistency, let's get the raw filtered list for this academy first,
      // then organize by level, THEN deduplicate each level bucket.
      // OR: just deduplicate valid registrations for this academy first.

      // Let's implement logic similar to getRegistrationsForAcademy but partitioning by level.

      const academyRegs =
        registrations?.filter((reg) => {
          // Filter just for this academy first (legacy + new)
          if (
            (reg as any).selectedAcademies &&
            Array.isArray((reg as any).selectedAcademies)
          ) {
            return (reg as any).selectedAcademies.some(
              (academyData: any) =>
                normalizeAcademy(academyData.academy || "") ===
                normalizeAcademy(academyName),
            );
          }
          const p1 = normalizeAcademy(reg?.firstPeriod?.academy || "");
          const p2 = normalizeAcademy(reg?.secondPeriod?.academy || "");
          return (
            p1 === normalizeAcademy(academyName) ||
            p2 === normalizeAcademy(academyName)
          );
        }) || [];

      const byLevel: Record<string, Registration[]> = {};

      academyRegs.forEach((reg) => {
        let level: string | null = null;

        // NEW STRUCTURE
        if (
          (reg as any).selectedAcademies &&
          Array.isArray((reg as any).selectedAcademies)
        ) {
          const academyData = (reg as any).selectedAcademies.find(
            (a: any) =>
              normalizeAcademy(a.academy || "") ===
              normalizeAcademy(academyName),
          );
          level = academyData?.level || null;
        } else {
          // LEGACY STRUCTURE
          const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || "");

          if (p1Academy === normalizeAcademy(academyName)) {
            level = reg?.firstPeriod?.level || null;
          } else {
            // If not first period, must be second (filtered above)
            level = reg?.secondPeriod?.level || null;
          }
        }

        // Fallback: inference from academy name if level is missing (legacy) or is "N/A"
        // Fallback: inference from academy name if level is missing (legacy) or is "N/A"
        // This maps standalone "Korean Conversation" academy registrations (which have N/A level) to the "Korean Conversation" level bucket
        if (
          !level ||
          level.toLowerCase() === "n/a" ||
          normalizeLevel(level) === "No Level"
        ) {
          // Check specifically for conversation/movie in the raw academy names
          // This handles cases where 'find' might have returned a generic 'Korean Language' entry first
          const hasConversation = (reg as any).selectedAcademies?.some(
            (a: any) => a.academy?.toLowerCase().includes("conversation"),
          );
          const hasMovie = (reg as any).selectedAcademies?.some((a: any) =>
            a.academy?.toLowerCase().includes("movie"),
          );

          // Also check legacy fields
          const legacyAc1 = (reg?.firstPeriod?.academy || "").toLowerCase();
          const legacyAc2 = (reg?.secondPeriod?.academy || "").toLowerCase();
          const legacyHasConversation =
            legacyAc1.includes("conversation") ||
            legacyAc2.includes("conversation");
          const legacyHasMovie =
            legacyAc1.includes("movie") || legacyAc2.includes("movie");

          if (hasMovie || legacyHasMovie) level = "K-Movie Conversation";
          else if (hasConversation || legacyHasConversation)
            level = "Korean Conversation";
        }

        const normalizedLevel = normalizeLevel(level);
        if (!byLevel[normalizedLevel]) {
          byLevel[normalizedLevel] = [];
        }
        byLevel[normalizedLevel].push(reg);
      });

      // Deduplicate each level's list
      // REMOVED (2026): Allow duplicates to show so they match reports and can be managed
      // Object.keys(byLevel).forEach((key) => {
      //   byLevel[key] = deduplicateRegistrations(byLevel[key]);
      // });

      return byLevel;
    },
    [registrations],
  );

  const studentCols = React.useMemo<GridColDef[]>(
    () => [
      {
        field: "id",
        headerName: "#",
        width: 60,
        type: "number",
        valueGetter: (params) => {
          const allRows = params.api.getSortedRowIds();
          return allRows.indexOf(params.row.id) + 1;
        },
      },
      { field: "firstName", headerName: "First Name", minWidth: 120, flex: 1 },
      { field: "lastName", headerName: "Last Name", minWidth: 120, flex: 1 },
      {
        field: "age",
        headerName: "Age",
        width: 80,
        type: "number",
        valueGetter: (params) => computeAge((params.row as any).birthday),
      },
      { field: "email", headerName: "Email", minWidth: 200, flex: 1 },
      {
        field: "cellNumber",
        headerName: "Phone Number",
        minWidth: 140,
        flex: 1,
      },
      { field: "city", headerName: "City", minWidth: 120, flex: 1 },
      { field: "state", headerName: "State", width: 100 },
    ],
    [],
  );

  const handleTeacherSave = React.useCallback(async () => {
    if (selectedAcademy && teacherName.trim()) {
      try {
        const email = teacherEmail.trim().toLowerCase();

        // 1. Upsert Profile (to ensure teacher exists and has updated info)
        if (email) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                email: email,
                full_name: teacherName.trim(),
                phone: teacherPhone.trim(),
                credentials: teacherCredentials.trim(),
                role: "teacher", // Ensure they are a teacher
                updated_at: new Date().toISOString(),
              },
              { onConflict: "email" },
            );

          if (profileError) throw profileError;
        }

        // 2. Link to Academy or Level
        const targetAcademy = academies.find(
          (a) => normalizeAcademy(a.name) === normalizeAcademy(selectedAcademy),
        );

        if (targetAcademy) {
          if (selectedLevel) {
            // Find Level ID
            const targetLevel = targetAcademy.levels?.find(
              (l) => normalizeLevel(l.name) === normalizeLevel(selectedLevel),
            );
            if (targetLevel) {
              // Need ID... see note below
              // We will fetch levels again to find ID if not present, OR update hook.
              // IMPORTANT: I must update Hook to include ID in Level object.
              const { data: levelData } = await supabase
                .from("levels")
                .select("id")
                .eq("academy_id", targetAcademy.id)
                .eq("name", selectedLevel)
                .single();

              if (levelData) {
                const { error: lError } = await supabase
                  .from("levels")
                  .update({ teacher_email: email })
                  .eq("id", levelData.id);
                if (lError) throw lError;
              }
            }
          } else {
            // Update Academy
            const { error: acError } = await supabase
              .from("academies")
              .update({ teacher_email: email })
              .eq("id", targetAcademy.id);
            if (acError) throw acError;
          }
        }

        // Refresh page or trigger re-fetch?
        // Ideally the subscription or re-fetch happens.
        // For now, reload.
        window.location.reload();
      } catch (error: any) {
        console.error("Error saving teacher:", error);
        alert("Error saving teacher information: " + error.message);
      }
    }
  }, [
    selectedAcademy,
    selectedLevel,
    teacherName,
    teacherEmail,
    teacherPhone,
    teacherCredentials,
    academies,
  ]);

  const openTeacherDialog = React.useCallback(
    (academyName: string, level?: string) => {
      setSelectedAcademy(academyName);
      setSelectedLevel(level || "");

      // Find existing teacher from hook data
      const academy = academies.find(
        (a) => normalizeAcademy(a.name) === normalizeAcademy(academyName),
      );
      let existingTeacher = academy?.teacher;

      if (level && academy?.levels) {
        const lvl = academy.levels.find(
          (l) => normalizeLevel(l.name) === normalizeLevel(level),
        );
        if (lvl) existingTeacher = lvl.teacher;
      }

      if (existingTeacher) {
        setTeacherName(existingTeacher.name || "");
        setTeacherEmail(existingTeacher.email || "");
        setTeacherPhone(existingTeacher.phone || "");
        setTeacherCredentials(existingTeacher.credentials || "");
      } else {
        setTeacherName("");
        setTeacherEmail("");
        setTeacherPhone("");
        let defaultCredentials = "";
        const normalizedAcademy = academyName.toLowerCase();
        if (
          normalizedAcademy.includes("korean") &&
          normalizedAcademy.includes("cooking")
        ) {
          defaultCredentials =
            "Experience working in Korean Restaurant many years";
        } else if (
          normalizedAcademy.includes("korean") &&
          normalizedAcademy.includes("language")
        ) {
          defaultCredentials =
            "Native Korean speaker with many years of experience teaching Korean language";
        }
        setTeacherCredentials(defaultCredentials);
      }
      setTeacherDialogOpen(true);
    },
    [academies],
  );

  const getTeacherForAcademy = React.useCallback(
    (academyName: string, level?: string) => {
      const academy = academies.find(
        (a) => normalizeAcademy(a.name) === normalizeAcademy(academyName),
      );
      if (!academy) return undefined;

      if (level && academy.levels) {
        const lvl = academy.levels.find(
          (l) => normalizeLevel(l.name) === normalizeLevel(level),
        );
        if (lvl) return lvl.teacher;
      }
      return academy.teacher;
    },
    [academies],
  );

  // Removed resolveAssignedTeacher as getTeacherForAcademy now handles live data via hook.

  const generatePDF = React.useCallback(
    (academyName: string, registrations: Registration[], level?: string) => {
      const doc = new jsPDF();
      const teacher = getTeacherForAcademy(academyName, level);

      const logoSize = 30;
      const logoX = 20;
      const logoY = 15;

      try {
        doc.addImage(logoImage, "JPEG", logoX, logoY, logoSize, logoSize);
      } catch (error) {
        // Logo could not be added, continue without it
      }

      doc.setFontSize(16);
      doc.text("IYF Orlando - Academy Report", 105, 25, { align: "center" });

      doc.setFontSize(20);
      doc.text(`${academyName}`, 105, 40, { align: "center" });

      if (level) {
        doc.setFontSize(12);
        doc.text(`Level: ${level}`, 105, 50, { align: "center" });
      }

      let startY = 65;
      if (teacher) {
        doc.setFontSize(11);
        doc.text(`Teacher: ${teacher.name}`, 20, startY);

        if (teacher.email) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Email: ${teacher.email}`, 20, startY + 8);
        }
        if (teacher.phone) {
          doc.text(`Phone: ${teacher.phone}`, 20, startY + 16);
        }

        startY += 25;
      }

      const tableData = registrations.map((reg, index) => [
        (index + 1).toString(),
        reg.firstName || "",
        reg.lastName || "",
        computeAge(reg.birthday) || "",
        reg.email || "",
        reg.cellNumber || "",
        reg.city || "",
        reg.state || "",
      ]);

      autoTable(doc, {
        head: [
          [
            "#",
            "First Name",
            "Last Name",
            "Age",
            "Email",
            "Phone",
            "City",
            "State",
          ],
        ],
        body: tableData,
        startY: startY,
        styles: { fontSize: 9 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
        },
        margin: { top: 10 },
      });

      const tableEndY =
        (doc as any).lastAutoTable.finalY ||
        startY + registrations.length * 10 + 20;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Students: ${registrations.length}`, 20, tableEndY + 10);

      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        20,
        doc.internal.pageSize.height - 10,
      );
      doc.text(`Page ${pageCount}`, 190, doc.internal.pageSize.height - 10, {
        align: "right",
      });

      const filename = level
        ? `${academyName}_${level}_report.pdf`
        : `${academyName}_report.pdf`;
      doc.save(filename);
    },
    [getTeacherForAcademy],
  );

  const renderAcademySection = React.useCallback(
    (academy: Academy) => {
      if (academy.hasLevels && academy.levels && academy.levels.length > 0) {
        // Academy with levels (like Korean Language)
        const koreanByLevel = getKoreanRegistrationsByLevel(academy.name);
        const levels = academy.levels.sort((a, b) => a.order - b.order);

        return (
          <Accordion key={academy.id} defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <SchoolIcon color="primary" />
                <Typography variant="h6">{academy.name}</Typography>
                <Chip
                  label={`${Object.values(koreanByLevel).reduce((sum, regs) => sum + regs.length, 0)} students`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  startIcon={<PrintIcon />}
                  variant="contained"
                  size="small"
                  onClick={() =>
                    generatePDF(
                      academy.name,
                      Object.values(koreanByLevel).flat(),
                    )
                  }
                >
                  Export All Levels PDF
                </Button>
              </Stack>

              {levels.map((level) => {
                const levelRegistrations =
                  koreanByLevel[normalizeLevel(level.name)] || [];
                const teacher = getTeacherForAcademy(academy.name, level.name);

                return (
                  <Box key={level.name} sx={{ mb: 3 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" color="primary">
                          {level.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({level.schedule})
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {teacher && (
                          <Chip
                            label={`Teacher: ${teacher.name}${teacher.email ? ` (${teacher.email})` : ""}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                            title={
                              teacher.phone
                                ? `Phone: ${teacher.phone}`
                                : undefined
                            }
                          />
                        )}
                        <Chip
                          label={`${levelRegistrations.length} students`}
                          size="small"
                        />
                        <Button
                          startIcon={<PersonIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            openTeacherDialog(academy.name, level.name)
                          }
                        >
                          {teacher ? "Edit Teacher" : "Add Teacher"}
                        </Button>
                        <Button
                          startIcon={<PrintIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            generatePDF(
                              academy.name,
                              levelRegistrations,
                              level.name,
                            )
                          }
                        >
                          Export PDF
                        </Button>
                      </Stack>
                    </Stack>
                    <Box
                      sx={{
                        height: 300,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        position: "relative",
                        minHeight: 0,
                      }}
                    >
                      <DataGrid
                        rows={levelRegistrations}
                        columns={studentCols}
                        loading={loading}
                        disableRowSelectionOnClick
                        getRowId={(r) => r.id}
                        slots={{ toolbar: GridToolbar }}
                        density="compact"
                        initialState={{
                          sorting: {
                            sortModel: [{ field: "lastName", sort: "asc" }],
                          },
                        }}
                        paginationMode="client"
                        pageSizeOptions={[25, 50, 100]}
                        sx={{
                          flex: 1,
                          minHeight: 0,
                          "& .MuiDataGrid-root": {
                            border: "none",
                          },
                          "& .MuiDataGrid-cell": {
                            borderBottom: "1px solid #e0e0e0",
                            cursor: "default",
                          },
                          "& .MuiDataGrid-columnHeaders": {
                            backgroundColor: "#f5f5f5",
                            borderBottom: "2px solid #e0e0e0",
                          },
                          "& .MuiDataGrid-footerContainer": {
                            borderTop: "2px solid #e0e0e0",
                            backgroundColor: "#f5f5f5",
                          },
                          "& .MuiDataGrid-row:hover": {
                            backgroundColor: "#f8f9fa",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}

              {/* Render any unassigned/orphaned levels that weren't caught in the configured levels loop */}
              {(() => {
                const processedLevels = new Set(
                  academy.levels?.map((l) => normalizeLevel(l.name)) || [],
                );
                const allLevels = Object.keys(koreanByLevel);
                const unassignedLevels = allLevels.filter(
                  (l) => !processedLevels.has(l) && l !== "No Level",
                );
                const noLevelStudents = koreanByLevel["No Level"] || [];

                return (
                  <>
                    {/* Unassigned/Unknown Levels */}
                    {unassignedLevels.map((levelName) => {
                      const levelRegistrations = koreanByLevel[levelName] || [];
                      if (levelRegistrations.length === 0) return null;

                      return (
                        <Box key={`unassigned-${levelName}`} sx={{ mb: 4 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{
                              mb: 1,
                              px: 2,
                              py: 1,
                              bgcolor: "#fff3e0",
                              borderRadius: 1,
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                color="warning.main"
                              >
                                {levelName} (Unconfigured Level)
                              </Typography>
                              <Chip
                                label={`${levelRegistrations.length} students`}
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            </Stack>
                            <Button
                              startIcon={<PrintIcon />}
                              variant="outlined"
                              size="small"
                              color="warning"
                              onClick={() =>
                                generatePDF(
                                  academy.name,
                                  levelRegistrations,
                                  levelName,
                                )
                              }
                            >
                              Export PDF
                            </Button>
                          </Stack>
                          <Box
                            sx={{
                              height: 300,
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <DataGrid
                              rows={levelRegistrations}
                              columns={studentCols}
                              loading={loading}
                              disableRowSelectionOnClick
                              getRowId={(r) => r.id}
                              slots={{ toolbar: GridToolbar }}
                              density="compact"
                            />
                          </Box>
                        </Box>
                      );
                    })}

                    {/* Explicit No Level Bucket */}
                    {noLevelStudents.length > 0 && (
                      <Box key="no-level" sx={{ mb: 4 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{
                            mb: 1,
                            px: 2,
                            py: 1,
                            bgcolor: "#ffebee",
                            borderRadius: 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              color="error.main"
                            >
                              Unassigned Level
                            </Typography>
                            <Chip
                              label={`${noLevelStudents.length} students`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          </Stack>
                          <Button
                            startIcon={<PrintIcon />}
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() =>
                              generatePDF(
                                academy.name,
                                noLevelStudents,
                                "Unassigned",
                              )
                            }
                          >
                            Export PDF
                          </Button>
                        </Stack>
                        <Box
                          sx={{
                            height: 300,
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <DataGrid
                            rows={noLevelStudents}
                            columns={studentCols}
                            loading={loading}
                            disableRowSelectionOnClick
                            getRowId={(r) => r.id}
                            slots={{ toolbar: GridToolbar }}
                            density="compact"
                          />
                        </Box>
                      </Box>
                    )}
                  </>
                );
              })()}
            </AccordionDetails>
          </Accordion>
        );
      } else {
        // Academy without levels
        const academyRegistrations = getRegistrationsForAcademy(academy.name);
        const teacher = getTeacherForAcademy(academy.name);

        return (
          <Accordion key={academy.id} defaultExpanded={false}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: "100%" }}
              >
                <SchoolIcon color="primary" />
                <Typography variant="h6">{academy.name}</Typography>
                <Chip
                  label={`${academyRegistrations.length} students`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {teacher && (
                  <Chip
                    label={`Teacher: ${teacher.name}${teacher.email ? ` (${teacher.email})` : ""}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    title={
                      teacher.phone ? `Phone: ${teacher.phone}` : undefined
                    }
                  />
                )}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  startIcon={<PersonIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => openTeacherDialog(academy.name)}
                >
                  {teacher ? "Edit Teacher" : "Add Teacher"}
                </Button>
                <Button
                  startIcon={<PrintIcon />}
                  variant="contained"
                  size="small"
                  onClick={() =>
                    generatePDF(academy.name, academyRegistrations)
                  }
                >
                  Export PDF
                </Button>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Schedule: {academy.schedule}
              </Typography>

              <Typography variant="h6" gutterBottom>
                Student List
              </Typography>
              <Box
                sx={{
                  height: 400,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 0,
                }}
              >
                <DataGrid
                  rows={academyRegistrations}
                  columns={studentCols}
                  loading={loading}
                  disableRowSelectionOnClick
                  getRowId={(r) => r.id}
                  slots={{ toolbar: GridToolbar }}
                  density="compact"
                  initialState={{
                    sorting: {
                      sortModel: [{ field: "lastName", sort: "asc" }],
                    },
                  }}
                  paginationMode="client"
                  pageSizeOptions={[10, 25, 50, 100]}
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    "& .MuiDataGrid-root": {
                      border: "none",
                    },
                    "& .MuiDataGrid-cell": {
                      borderBottom: "1px solid #e0e0e0",
                      cursor: "default",
                    },
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f5f5f5",
                      borderBottom: "2px solid #e0e0e0",
                    },
                    "& .MuiDataGrid-footerContainer": {
                      borderTop: "2px solid #e0e0e0",
                      backgroundColor: "#f5f5f5",
                    },
                    "& .MuiDataGrid-row:hover": {
                      backgroundColor: "#f8f9fa",
                    },
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      }
    },
    [
      getKoreanRegistrationsByLevel,
      getRegistrationsForAcademy,

      openTeacherDialog,
      generatePDF,
      studentCols,
      loading,
    ],
  );

  return (
    <Box>
      <PageHeader
        title="Academy Registrations"
        subtitle="View student registrations organized by academy"
        icon={<SchoolIcon fontSize="inherit" />}
        color="#1976d2"
      />

      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          {/* teachersLoading block removed */}
          {academiesLoading && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Loading academies...
            </Alert>
          )}

          {academies.length === 0 && !academiesLoading && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              No academies found. Please ensure academies are configured in the
              academies_2026_spring collection.
            </Alert>
          )}

          <Stack spacing={2}>
            {academies.map((academy) => renderAcademySection(academy))}
          </Stack>

          {/* Teacher Dialog */}
          <Dialog
            open={teacherDialogOpen}
            onClose={() => setTeacherDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {getTeacherForAcademy(selectedAcademy, selectedLevel)
                ? "Edit Teacher"
                : "Add Teacher"}
              {selectedLevel
                ? ` - ${selectedAcademy} (${selectedLevel})`
                : ` - ${selectedAcademy}`}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Teacher Name"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  type="email"
                  fullWidth
                />
                <TextField
                  label="Phone"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Credentials / Background"
                  value={teacherCredentials}
                  onChange={(e) => setTeacherCredentials(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder={(() => {
                    const normalized = selectedAcademy.toLowerCase();
                    if (
                      normalized.includes("korean") &&
                      normalized.includes("cooking")
                    ) {
                      return "Experience working in Korean Restaurant many years";
                    } else if (
                      normalized.includes("korean") &&
                      normalized.includes("language")
                    ) {
                      return "e.g., Native Korean speaker with many years of experience teaching Korean language";
                    }
                    return "e.g., Certified Teacher, Master's Degree in Education, etc.";
                  })()}
                  helperText="Instructor credentials required for elective courses (courses with service rate)"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTeacherDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleTeacherSave}
                disabled={!teacherName.trim()}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </Box>
  );
});

export default AcademiesPage;
