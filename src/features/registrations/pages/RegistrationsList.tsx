import * as React from "react";
import {
  Box,
  Card,
  IconButton,
  Chip,
  Stack,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { PageHeader } from "../../../components/PageHeader";
import {
  DataGrid,
  GridToolbar,
  type GridColDef,
  gridClasses,
} from "@mui/x-data-grid";
import { useAuth } from "../../../context/AuthContext";
import { useTeacherContext } from "../../auth/context/TeacherContext";
import { useRegistrationsExpectedTotals } from "../hooks/useRegistrationExpectedTotal";
import { useSupabaseRegistrations } from "../hooks/useSupabaseRegistrations";
import { useSupabaseInvoices } from "../../payments/hooks/useSupabaseInvoices";
import { useSupabasePayments } from "../../payments/hooks/useSupabasePayments";
// latestInvoicePerStudent no longer used – we aggregate ALL invoices per student
import { deleteStudentData } from "../../../lib/supabaseRegistrations";
import type { Registration } from "../types";
import { usd } from "../../../lib/query";
import {
  confirmDelete,
  notifyError,
  notifySuccess,
} from "../../../lib/alerts";
import { computeAge } from "../../../lib/validations";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { Download, Trash2, Edit2, Plus, Users } from "lucide-react";
import { normalizeAcademy } from "../../../lib/normalization";
import RegistrationDrawer from "../components/RegistrationDrawer";

import AdminRegistrationForm from "../components/AdminRegistrationForm";

// --- Types & Helpers ---
type BillingAgg = {
  total: number;
  paid: number;
  balance: number;
  status: "unpaid" | "partial" | "paid" | "exonerated";
};
const isValidDate = (d: unknown): d is Date =>
  d instanceof Date && !isNaN(d.getTime());

// --- Animations ---
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// --- Styling ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Card
      elevation={0}
      sx={{
        background: isDark
          ? "rgba(30, 30, 30, 0.6)"
          : "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(16px)",
        borderRadius: 4,
        border: "1px solid",
        borderColor: isDark
          ? "rgba(255, 255, 255, 0.1)"
          : "rgba(255, 255, 255, 0.5)",
        boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const RegistrationsList = React.memo(function RegistrationsList({
  isAdmin = false,
  hasGmailAccess = false,
}: {
  isAdmin?: boolean;
  hasGmailAccess?: boolean;
}) {
  const {
    isTeacher,
    teacherProfile,
    isAdmin: contextIsAdmin,
  } = useTeacherContext();
  const { currentUser } = useAuth();
  const _userEmail = currentUser?.email;

  const forceIsAdmin = React.useMemo(
    () =>
      [
        "orlando@iyfusa.org",
        "jodlouis.dev@gmail.com",
        "michellemoralespradis@gmail.com",
      ].includes(_userEmail || ""),
    [_userEmail],
  );

  const effectiveIsAdmin = isAdmin || forceIsAdmin || contextIsAdmin;

  // --- Supabase Data Hooks ---
  const { data, loading, refetch: refetchRegistrations } = useSupabaseRegistrations();
  const { data: invoices, refetch: refetchInvoices } = useSupabaseInvoices();
  const { data: payments, refetch: refetchPayments } = useSupabasePayments();

  // --- Invoice Aggregation (Supabase-based, replaces Firebase onSnapshot) ---
  // Aggregates ALL invoices per student (not just latest) so totals are accurate
  const byStudent = React.useMemo(() => {
    const agg = new Map<string, BillingAgg>();
    if (!invoices) return agg;

    for (const inv of invoices) {
      const id = String(inv.studentId || "");
      if (!id) continue;
      if ((inv.status as string) === "void") continue; // skip voided

      const total = Number(inv.total || 0);
      const paid = Number(inv.paid || 0);

      const existing = agg.get(id);
      if (existing) {
        existing.total += total;
        existing.paid += paid;
        existing.balance = Math.max(existing.total - existing.paid, 0);
        // Recalculate status from aggregated values
        if (inv.status === "exonerated" && existing.status !== "paid") {
          existing.status = "exonerated";
        } else if (existing.paid <= 0) {
          existing.status = "unpaid";
        } else if (existing.balance > 0) {
          existing.status = "partial";
        } else {
          existing.status = "paid";
        }
      } else {
        const balance = Math.max(total - paid, 0);
        let status: "unpaid" | "partial" | "paid" | "exonerated" = "unpaid";
        if (inv.status === "exonerated") {
          status = "exonerated";
        } else if (paid <= 0) {
          status = "unpaid";
        } else if (balance > 0) {
          status = "partial";
        } else {
          status = "paid";
        }
        agg.set(id, { total, paid, balance, status });
      }
    }
    return agg;
  }, [invoices]);

  // Mobile check
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const rows = React.useMemo(() => {
    const raw = data ?? [];
    if (isTeacher && teacherProfile?.academies) {
      const assigned = teacherProfile.academies.map((a) =>
        normalizeAcademy(a.academyName),
      );
      return raw.filter((r) => {
        const academies = r.selectedAcademies?.length
          ? r.selectedAcademies
          : [r.firstPeriod, r.secondPeriod].filter((x: any) => x?.academy);
        return academies.some((a: any) =>
          assigned.includes(normalizeAcademy(a.academy || "")),
        );
      });
    }
    return raw;
  }, [data, isTeacher, teacherProfile]);

  const { expectedByRegId, loading: expectedLoading } =
    useRegistrationsExpectedTotals(rows);
  const [selection, setSelection] = React.useState<string[]>([]);

  // Derive status per row (same logic as drawer: expected from academies - paid)
  const rowStatus = React.useCallback(
    (id: string): "unpaid" | "partial" | "paid" | "exonerated" => {
      const b = byStudent.get(id);
      const paid = b?.paid ?? 0;
      const expected =
        expectedByRegId.get(id) ?? (expectedLoading ? (b?.total ?? 0) : 0);
      if (b?.status === "exonerated") return "exonerated";
      if (expectedLoading)
        return (b?.status ?? "unpaid") as
          | "unpaid"
          | "partial"
          | "paid"
          | "exonerated";
      const balance = Math.max(0, expected - paid);
      return (balance <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid") as
        | "unpaid"
        | "partial"
        | "paid"
        | "exonerated";
    },
    [byStudent, expectedByRegId, expectedLoading],
  );

  // Dialog State
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | undefined>(
    undefined,
  );
  const [initialData, setInitialData] = React.useState<
    Registration | undefined
  >(undefined);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedReg, setSelectedReg] = React.useState<Registration | null>(
    null,
  );

  // Payment Status Filter
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "paid" | "partial" | "unpaid"
  >("all");

  // Handlers for Form
  const handleCreate = () => {
    setEditingId(undefined);
    setInitialData(undefined);
    setFormOpen(true);
  };

  const handleEdit = (reg: Registration) => {
    setEditingId(reg.id);
    setInitialData(reg);
    setFormOpen(true);
  };

  // Refetch all data after mutations
  const handleRefreshAll = React.useCallback(() => {
    refetchRegistrations();
    refetchInvoices();
    refetchPayments();
  }, [refetchRegistrations, refetchInvoices, refetchPayments]);

  // Export Logic Map
  const paymentDataMap = React.useMemo(() => {
    const map = new Map<string, any>();
    invoices?.forEach((inv) => {
      const id = String(inv.studentId);
      const ex = map.get(id) || {
        totalFee: 0,
        paid: 0,
        balance: 0,
        lastPaymentDate: "",
        paymentMethod: "",
      };
      ex.totalFee += Number(inv.total || 0);
      ex.paid += Number(inv.paid || 0);
      ex.balance += Number(inv.balance || 0);
      map.set(id, ex);
    });
    payments?.forEach((p) => {
      const id = String(p.studentId);
      const ex = map.get(id);
      if (ex) {
        const date = p.createdAt?.seconds
          ? new Date(p.createdAt.seconds * 1000).toLocaleDateString()
          : new Date().toLocaleDateString();
        if (!ex.lastPaymentDate || date > ex.lastPaymentDate) {
          ex.lastPaymentDate = date;
          ex.paymentMethod = p.method || "";
        }
      }
    });
    return map;
  }, [invoices, payments]);

  /**
   * Delete a student and all related data via Supabase
   */
  const handleDeleteStudent = async (studentId: string) => {
    await deleteStudentData(studentId);
  };

  // --- Actions ---
  const handleBulkDelete = async () => {
    if (!effectiveIsAdmin) return;
    if (!selection.length)
      return notifyError("Nothing selected");
    const res = await confirmDelete(
      "Delete selected?",
      `You are about to delete ${selection.length} registration(s).`,
    );
    if (!res.isConfirmed) return;
    try {
      await Promise.all(selection.map((id) => handleDeleteStudent(String(id))));
      notifySuccess(
        "Deleted",
        `${selection.length} registration(s) and related data removed`,
      );
      setSelection([]);
      handleRefreshAll();
    } catch (e: any) {
      notifyError("Delete failed", e?.message);
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = rows.map((row: any, index: number) => {
        const pData = paymentDataMap.get(String(row.id)) || {
          totalFee: 0,
          paid: 0,
          balance: 0,
          lastPaymentDate: "",
          paymentMethod: "",
        };
        return {
          "#": index + 1,
          First: row.firstName || "",
          Last: row.lastName || "",
          Email: row.email || "",
          Age: computeAge(row.birthday) || "",
          Phone: row.cellNumber || "",
          Academies: (row.selectedAcademies || [])
            .map(
              (a: any) => `${a.academy || ""}${a.level ? ` (${a.level})` : ""}`,
            )
            .join(" | "),
          City: row.city || "",
          State: row.state || "",
          Zip: row.zipCode || "",
          Created: typeof row.createdAt === 'string'
            ? new Date(row.createdAt).toLocaleString()
            : row.createdAt?.seconds
              ? new Date(row.createdAt.seconds * 1000).toLocaleString()
              : "",
          Fee: usd(pData.totalFee),
          Paid: usd(pData.paid),
          Balance: usd(pData.balance),
          Status: rowStatus(String(row.id)).toUpperCase(),
        };
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");
      XLSX.writeFile(
        wb,
        `IYF_Registrations_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      notifySuccess("Exported", `${exportData.length} rows`);
    } catch (e: any) {
      notifyError("Export Failed", e.message);
    }
  };

  // --- Columns ---
  const columns = React.useMemo<GridColDef[]>(() => {
    const baseColumns: GridColDef[] = [
      {
        field: "id",
        headerName: "#",
        width: 60,
        align: "center",
        headerAlign: "center",
        valueGetter: (p) => p.api.getSortedRowIds().indexOf(p.id) + 1,
      },
      { field: "firstName", headerName: "First Name", minWidth: 120, flex: 1 },
      { field: "lastName", headerName: "Last Name", minWidth: 120, flex: 1 },
      { field: "email", headerName: "Email", minWidth: 200, flex: 1.2 },
      { field: "cellNumber", headerName: "Phone", width: 130 },
      { field: "gender", headerName: "Gender", width: 90 },
      {
        field: "age",
        headerName: "Age",
        width: 70,
        valueGetter: (p) => computeAge(p.row.birthday),
      },
      // Address only for admins
      ...(effectiveIsAdmin
        ? [{ field: "address", headerName: "Address", width: 200 }]
        : []),
      { field: "city", headerName: "City", width: 120 },
      { field: "state", headerName: "State", width: 100 },
      { field: "zipCode", headerName: "Zip", width: 90 },
      {
        field: "academies",
        headerName: "Academies",
        minWidth: 250,
        flex: 1.5,
        valueGetter: (p) => {
          const r = p.row as any;
          const list = r.selectedAcademies?.length
            ? r.selectedAcademies
            : [r.firstPeriod, r.secondPeriod].filter((x: any) => x?.academy);
          return list
            .map((a: any) => {
              const isKorean = a.academy?.includes("Korean");
              return isKorean && a.level
                ? `${a.academy} (${a.level})`
                : a.academy;
            })
            .join(", ");
        },
        renderCell: (p) => {
          const r = p.row as any;
          const list = r.selectedAcademies?.length
            ? r.selectedAcademies
            : [r.firstPeriod, r.secondPeriod].filter((x: any) => x?.academy);
          return (
            <Box sx={{ py: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {list.map((a: any, i: number) => {
                const isKorean = a.academy?.includes("Korean");
                const label =
                  isKorean && a.level ? `${a.academy} (${a.level})` : a.academy;
                return (
                  <Chip
                    key={i}
                    label={label}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1.5, borderColor: "divider" }}
                  />
                );
              })}
            </Box>
          );
        },
      },
      // Status/Payment only for admins
      ...(effectiveIsAdmin
        ? [
            {
              field: "paymentStatus",
              headerName: "Status",
              width: 140,
              renderCell: (p: any) => {
                const status = rowStatus(String(p.id));
                const b = byStudent.get(String(p.id));
                const paid = b?.paid ?? 0;
                const expected =
                  expectedByRegId.get(String(p.id)) ??
                  (expectedLoading ? (b?.total ?? 0) : 0);
                const balance = expectedLoading
                  ? (b?.balance ?? 0)
                  : Math.max(0, expected - paid);
                const color =
                  status === "paid"
                    ? "#4CAF50"
                    : status === "partial"
                      ? "#FF9800"
                      : "#F44336";
                const label =
                  status === "exonerated"
                    ? "Exonerated"
                    : status.charAt(0).toUpperCase() + status.slice(1);
                return (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: color,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ lineHeight: 1 }}
                      >
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {usd(balance)} due
                      </Typography>
                    </Box>
                  </Stack>
                );
              },
            },
          ]
        : []),
      {
        field: "createdAt",
        headerName: "Registered",
        width: 120,
        valueGetter: (p) => {
          const val = p.row.createdAt;
          if (!val) return "";
          // Handle string ISO dates (Supabase) or Firestore Timestamps
          const date = typeof val === 'string'
            ? new Date(val)
            : val.seconds
              ? new Date(val.seconds * 1000)
              : new Date(val);
          return isValidDate(date) ? date : "";
        },
        renderCell: (p) => {
          const val = p.value as Date;
          if (!val) return "-";
          return (
            <Typography variant="body2">{val.toLocaleDateString()}</Typography>
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                if (effectiveIsAdmin) {
                  handleEdit(p.row as Registration);
                }
              }}
              disabled={!effectiveIsAdmin}
            >
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                if (effectiveIsAdmin) {
                  setSelection([String(p.id)]);
                  handleBulkDelete();
                }
              }}
              disabled={!effectiveIsAdmin}
            >
              <Trash2 size={16} />
            </IconButton>
          </Stack>
        ),
      },
    ];
    return baseColumns;
  }, [
    effectiveIsAdmin,
    byStudent,
    expectedByRegId,
    expectedLoading,
    rowStatus,
  ]);

  // Filter rows by payment status (uses same logic as column and drawer)
  const filteredRows = React.useMemo(() => {
    if (statusFilter === "all") return rows;
    return rows.filter((row) => rowStatus(row.id) === statusFilter);
  }, [rows, statusFilter, rowStatus]);

  return (
    <Box
      component={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={{ height: "calc(100vh - 120px)", pb: 2 }}
    >
      <PageHeader
        title="Registrations"
        subtitle={
          effectiveIsAdmin
            ? "Manage student capabilities"
            : isTeacher
              ? "Teacher mode (Read-Only)"
              : "View only mode"
        }
        icon={<Users size={32} />}
        color="#2196F3"
      />

      <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {effectiveIsAdmin && (
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={handleCreate}
              sx={{
                borderRadius: 2,
                background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                py: { xs: 1, sm: 0.5 },
              }}
            >
              New Registration
            </Button>
          )}
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {(effectiveIsAdmin || hasGmailAccess) && (
              <Button
                variant="outlined"
                startIcon={<Download size={16} />}
                onClick={handleExportExcel}
                sx={{ borderRadius: 2, flex: 1 }}
              >
                Export
              </Button>
            )}
            {effectiveIsAdmin && selection.length > 0 && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={handleBulkDelete}
                sx={{ borderRadius: 2, flex: 1 }}
              >
                Delete ({selection.length})
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <GlassCard>
        {/* Payment Status Filter - Admin Only */}
        {effectiveIsAdmin && (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
                sx={{ mr: 1, mb: { xs: 0.5, sm: 0 } }}
              >
                PAYMENT STATUS:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {(["all", "paid", "partial", "unpaid"] as const).map(
                  (status) => {
                    const isActive = statusFilter === status;
                    const counts = {
                      all: rows.length,
                      paid: rows.filter((r) => rowStatus(r.id) === "paid")
                        .length,
                      partial: rows.filter((r) => rowStatus(r.id) === "partial")
                        .length,
                      unpaid: rows.filter((r) => rowStatus(r.id) === "unpaid")
                        .length,
                    };
                    const colors = {
                      all: "#2196F3",
                      paid: "#4CAF50",
                      partial: "#FF9800",
                      unpaid: "#F44336",
                    };
                    return (
                      <Chip
                        key={status}
                        label={`${status.charAt(0).toUpperCase() + status.slice(1)} (${counts[status]})`}
                        onClick={() => setStatusFilter(status)}
                        size="small"
                        sx={{
                          bgcolor: isActive ? colors[status] : "transparent",
                          color: isActive ? "white" : colors[status],
                          borderColor: colors[status],
                          border: "1px solid",
                          fontWeight: isActive ? 700 : 500,
                          px: 0.5,
                          "&:hover": {
                            bgcolor: isActive
                              ? colors[status]
                              : `${colors[status]}20`,
                          },
                        }}
                      />
                    );
                  },
                )}
              </Box>
            </Stack>
          </Box>
        )}

        {/* Content */}
        <Box sx={{ flex: 1, width: "100%", overflow: "hidden" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            checkboxSelection={effectiveIsAdmin}
            onRowSelectionModelChange={(m) =>
              effectiveIsAdmin && setSelection(m as string[])
            }
            rowSelectionModel={selection}
            disableRowSelectionOnClick
            columnVisibilityModel={{
              // Teacher specific hides (Requested by user)
              createdAt: effectiveIsAdmin,
              zipCode: effectiveIsAdmin,
              state: effectiveIsAdmin,
              // Mobile optimization
              id: !isMobile,
              email: !isMobile,
              gender: !isMobile,
              age: !isMobile,
              city: !isMobile,
            }}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: {
                  debounceMs: 500,
                  variant: "outlined",
                  size: "small",
                },
                printOptions: { disableToolbarButton: true },
                csvOptions: { disableToolbarButton: true }, // We have custom export
              },
            }}
            getRowHeight={() => "auto"}
            onRowClick={(params) => {
              setSelectedReg(params.row as Registration);
              setDrawerOpen(true);
            }}
            sx={{
              border: "none",
              [`& .${gridClasses.columnHeaders}`]: {
                bgcolor: "transparent",
                borderBottom: "1px solid",
                borderColor: "divider",
              },
              [`& .${gridClasses.row}:hover`]: {
                bgcolor: "action.hover",
                cursor: "pointer",
              },
              [`& .${gridClasses.cell}`]: {
                borderBottom: "1px solid",
                borderColor: "divider",
                py: 1,
              },
            }}
          />
        </Box>
      </GlassCard>

      {/* Admin Registration Form (Create/Edit) */}
      <AdminRegistrationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        docId={editingId}
        initial={initialData}
        onSuccess={handleRefreshAll}
      />

      <RegistrationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        registration={selectedReg}
        billingInfo={
          selectedReg ? byStudent.get(String(selectedReg.id)) : undefined
        }
        isAdmin={effectiveIsAdmin}
        onEdit={() => {
          if (selectedReg) {
            handleEdit(selectedReg);
            setDrawerOpen(false);
          }
        }}
        onDelete={async () => {
          if (selectedReg) {
            setDrawerOpen(false);
            const res = await confirmDelete(
              "Delete registration?",
              `Remove ${selectedReg.firstName} ${selectedReg.lastName}?`,
            );
            if (res.isConfirmed) {
              try {
                await handleDeleteStudent(selectedReg.id);
                notifySuccess(
                  "Deleted",
                  "Registration and related data removed",
                );
                setSelectedReg(null);
                handleRefreshAll();
              } catch (e: any) {
                notifyError("Error", e?.message);
              }
            }
          }
        }}
        onPaymentSuccess={handleRefreshAll}
      />
    </Box>
  );
});

export default RegistrationsList;
