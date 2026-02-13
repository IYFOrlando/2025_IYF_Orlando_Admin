import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import { AccessDenied } from "../../../components/AccessDenied";
import SchoolIcon from "@mui/icons-material/School";
import { PageHeader } from "../../../components/PageHeader";
import Swal from "sweetalert2";
import { supabase } from "../../../lib/supabase";
import { useSupabaseAcademies } from "../../academies/hooks/useSupabaseAcademies";
import { useTeachers } from "../hooks/useTeachers";

// Internal types for the UI logic
interface TeacherEntity {
  id: string; // auth/profile id or email
  email: string;
  name: string;
  phone?: string;
  assignments: Array<{
    academyId: string;
    academyName: string;
    levelName?: string | null; // null = main teacher
  }>;
}

export default function TeachersManagementPage() {
  const { isAdmin, impersonate } = useTeacherContext();
  const {
    academies,
    loading: loadingAcademies,
    refresh: refreshAcademies,
  } = useSupabaseAcademies();
  const {
    teachers: profileTeachers,
    loading: loadingProfiles,
    refreshTeachers,
  } = useTeachers();

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherEntity | null>(
    null,
  );
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

  // Assignment Dialog
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [assignData, setAssignData] = useState({
    teacherEmail: "",
    academyId: "",
    levelName: "ALL", // 'ALL' for academy main teacher, otherwise specific level
  });

  // Derived list of unique teachers combining Profiles and Assignments
  // We want to list ALL teachers who have assignments + ALL teachers in the profile list
  // Merging them by email
  const teachersList = useMemo(() => {
    const map = new Map<string, TeacherEntity>();

    // 1. Add all from Profiles
    profileTeachers.forEach((pt) => {
      const id = pt.email.toLowerCase().trim();
      map.set(id, {
        id: pt.id || id,
        email: pt.email,
        name: pt.name,
        phone: pt.phone,
        assignments: [],
      });
    });

    // 2. Add/Merge from Assignments (Academies)
    academies?.forEach((aca) => {
      // Check Main Teacher
      if (aca.teacher?.email) {
        const id = aca.teacher.email.toLowerCase().trim();
        if (!map.has(id)) {
          // If not in profiles, create a temporary entry
          map.set(id, {
            id: id,
            email: aca.teacher.email,
            name: aca.teacher.name || "Unknown",
            phone: aca.teacher.phone || "",
            assignments: [],
          });
        }

        // Push assignment
        map.get(id)!.assignments.push({
          academyId: aca.id,
          academyName: aca.name || aca.id,
          levelName: null,
        });
      }

      // Check Levels
      if (aca.levels) {
        aca.levels.forEach((lvl) => {
          if (lvl.teacher?.email) {
            const id = lvl.teacher.email.toLowerCase().trim();
            if (!map.has(id)) {
              map.set(id, {
                id: id,
                email: lvl.teacher.email,
                name: lvl.teacher.name || "Unknown",
                phone: lvl.teacher.phone || "",
                assignments: [],
              });
            }
            map.get(id)!.assignments.push({
              academyId: aca.id,
              academyName: aca.name || aca.id,
              levelName: lvl.name,
            });
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [academies, profileTeachers]);

  if (!isAdmin) {
    return <AccessDenied />;
  }

  const isLoading = loading || loadingAcademies || loadingProfiles;

  const filteredTeachers = teachersList.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEdit = (teacher: TeacherEntity) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone || "",
    });
    setOpenDialog(true);
  };

  const handleSaveTeacher = async () => {
    if (!editingTeacher) return;

    // Validate email if provided
    if (formData.email && !formData.email.includes("@")) {
      Swal.fire("Error", "Please enter a valid email address", "error");
      return;
    }

    try {
      setLoading(true);
      const newEmail = formData.email.toLowerCase().trim();
      const oldEmail = editingTeacher.email.toLowerCase().trim();
      const emailChanged = newEmail !== oldEmail;

      // 1. Upsert Profile via Supabase
      // We need to resolve the ID. If editing existing, we might have ID.
      // If email changed, we essentially treat it as a new/different user context unless we find the ID for the new email.
      // Strategy: Updates here generally mean updating the Profile metadata.
      // If email changes, it's tricky because Auth email change requires re-verification.
      // For simplified admin:
      // - We update the Profile Name/Phone.
      // - If email changed, we update all Assignments to point to the new email.

      // Update assignments first if email changed
      if (emailChanged) {
        // This is a heavy operation: find all places where oldEmail is used and update to newEmail
        // In Supabase, we update `teacher_email` on academies and levels.

        // Update Academies
        await supabase
          .from("academies")
          .update({ teacher_email: newEmail })
          .ilike("teacher_email", oldEmail);

        // Update Levels
        await supabase
          .from("levels")
          .update({ teacher_email: newEmail })
          .ilike("teacher_email", oldEmail);
      }

      // Now ensure Profile exists/updates for the TARGET email
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .single();

      if (existingProfile) {
        await supabase
          .from("profiles")
          .update({
            full_name: formData.name,
            phone: formData.phone,
          })
          .eq("id", existingProfile.id);
      } else {
        // If no profile, we can't easily insert ID-less profile if RLS/Auth enforces it.
        // But our migration script logic suggests we need Auth user.
        // For now, if profile missing, we just skip profile update and rely on email in tables.
        // Or we create a shadow profile if allowed? No, best to warn.
        console.warn(
          "Profile not found for email, treating as assignments only update.",
        );
      }

      // Update Academies/Levels metadata if name/phone changed? No, we store teacher_email FK logic effectively.
      // The UI derives Name/Phone from Profile. So updating Profile is enough.

      await refreshAcademies();
      await refreshTeachers();

      Swal.fire("Success", "Teacher updated", "success");
      setOpenDialog(false);
    } catch (error: any) {
      console.error(error);
      Swal.fire("Error", "Failed to update teacher: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssign = (teacherEmail = "") => {
    setAssignData({ teacherEmail, academyId: "", levelName: "ALL" });
    setOpenAssignDialog(true);
  };

  const handleAssign = async () => {
    const { teacherEmail, academyId, levelName } = assignData;
    if (!teacherEmail || !academyId) return;

    const emailToUse = teacherEmail.toLowerCase().trim();

    try {
      setLoading(true);

      // 1. Ensure Profile Exists (optional but good)
      // If not, we can still assign, but name won't show up nicely until they sign up or we migrate them.

      // 2. Perform Assignment
      if (levelName === "ALL") {
        // Assign to Academy
        const { error } = await supabase
          .from("academies")
          .update({ teacher_email: emailToUse })
          .eq("id", academyId);
        if (error) throw error;
      } else {
        // Assign to Level
        // Need to find level ID by name + academyId
        // or we can select first? Select by name match.
        const { data: lvl, error: findError } = await supabase
          .from("levels")
          .select("id")
          .eq("academy_id", academyId)
          .eq("name", levelName)
          .single();

        if (findError) throw findError;

        const { error } = await supabase
          .from("levels")
          .update({ teacher_email: emailToUse })
          .eq("id", lvl.id);
        if (error) throw error;
      }

      await refreshAcademies();
      await refreshTeachers();

      Swal.fire("Assigned", "Teacher assigned successfully", "success");
      setOpenAssignDialog(false);
    } catch (err: any) {
      console.error(err);
      Swal.fire("Error", "Assignment failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Sync is no longer needed as we read directly from Source of Truth
  const handleFullSync = async () => {
    Swal.fire(
      "Info",
      "Sync not needed with Supabase (Direct DB access)",
      "info",
    );
  };

  return (
    <Box>
      <PageHeader
        icon={<SchoolIcon fontSize="inherit" />}
        title="Teacher Management"
        subtitle="Manage teachers, assignments, and sync with academies"
        color="#7b1fa2" // Purple
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={handleFullSync} // Kept for UI continuity but disabled logic
            sx={{ borderRadius: 3, textTransform: "none", display: "none" }} // Hidden
            disabled
          >
            Push Index Sync
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenAssign("")}
            sx={{ borderRadius: 3, textTransform: "none" }}
          >
            Assign / Add Teacher
          </Button>
        </Stack>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search teachers..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
          sx={{ bgcolor: "background.paper", borderRadius: 1 }}
        />
      </Box>

      <TableContainer
        component={Paper}
        sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
      >
        <Table>
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell>Name / Contact</TableCell>
              <TableCell>Assignments</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTeachers.map((teacher) => (
              <TableRow key={teacher.id || teacher.email} hover>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        bgcolor: "primary.light",
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "primary.contrastText",
                      }}
                    >
                      {teacher.name.charAt(0)}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {teacher.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={teacher.email ? "text.secondary" : "error.main"}
                      >
                        {teacher.email || "(No email - Click edit to add)"}
                      </Typography>
                      {teacher.phone && (
                        <Typography variant="caption" display="block">
                          {teacher.phone}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {teacher.assignments.map((asg, i) => (
                      <Chip
                        key={i}
                        label={`${asg.academyName} ${asg.levelName ? `(${asg.levelName})` : ""}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {teacher.email && (
                    <Tooltip title="View as Teacher">
                      <IconButton
                        size="small"
                        onClick={() => impersonate(teacher.email)}
                        color="info"
                        sx={{ mr: 1 }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit Contact Info">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(teacher)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {filteredTeachers.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No teachers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Teacher</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            helperText="Changing email will update assignments for this teacher."
          />
          <TextField
            label="Phone"
            fullWidth
            margin="normal"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTeacher} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openAssignDialog}
        onClose={() => setOpenAssignDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Assign Teacher</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Teacher Email"
              fullWidth
              value={assignData.teacherEmail}
              onChange={(e) =>
                setAssignData({ ...assignData, teacherEmail: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Academy</InputLabel>
              <Select
                value={assignData.academyId}
                label="Academy"
                onChange={(e) =>
                  setAssignData({
                    ...assignData,
                    academyId: e.target.value,
                    levelName: "ALL",
                  })
                }
              >
                {academies &&
                  academies.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name || a.id}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {assignData.academyId &&
              academies &&
              academies.find((a) => a.id === assignData.academyId)?.levels && (
                <FormControl fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={assignData.levelName}
                    label="Level"
                    onChange={(e) =>
                      setAssignData({
                        ...assignData,
                        levelName: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="ALL">Entire Academy (Main)</MenuItem>
                    {academies
                      .find((a) => a.id === assignData.academyId)
                      ?.levels?.map((l) => (
                        <MenuItem key={l.name} value={l.name}>
                          {l.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
