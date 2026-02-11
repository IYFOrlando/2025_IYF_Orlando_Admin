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
  Alert,
} from "@mui/material";
import { useRegistrations } from "../../registrations/hooks/useRegistrations";
import { format } from "date-fns";

import { normalizeAcademy } from "../../../lib/normalization";
import { useAcademies } from "../../academies/hooks/useAcademies";

interface InvalidAcademyRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string;
  createdAt: string;
  period: "P1" | "P2" | string;
  invalidAcademy: string;
  issue: string;
}

export default function InvalidAcademiesReportPage() {
  const {
    data: registrations,
    loading: regLoading,
    error: regError,
  } = useRegistrations();
  const {
    academies,
    loading: academiesLoading,
    error: academiesError,
  } = useAcademies();

  const invalidRecords = React.useMemo(() => {
    if (!registrations || !academies) return [];

    const validNormalizedAcademies = new Set(
      academies.map((a) => normalizeAcademy(a.name)),
    );
    // Add N/A and empty string as valid 'no selection'
    validNormalizedAcademies.add("n/a");
    validNormalizedAcademies.add("");
    validNormalizedAcademies.add("no selection");

    const invalid: InvalidAcademyRecord[] = [];

    registrations.forEach((reg) => {
      const createdAt =
        reg.createdAt?.toDate?.() || new Date(reg.createdAt || Date.now());
      const dateDisplay = format(createdAt, "MMM dd, yyyy");

      const checkAcademy = (
        academyName: string | undefined,
        period: "P1" | "P2",
      ) => {
        if (!academyName) return; // Treated as empty/valid in this logic or caught by 'empty' check if needed?
        // Logic below handles empty/missing specifically if needed, but here we validate EXISTING strings

        const normalized = normalizeAcademy(academyName);
        if (!validNormalizedAcademies.has(normalized)) {
          // Double check simple case-insensitive if normalization is too aggressive?
          // normalizeAcademy handles lowercasing and trimming.

          // Allow "Korean Conversation" if "Korean Language" exists?
          // normalizeAcademy maps "Korean Conversation" -> "Korean Language" usually?
          // Let's rely on strict normalization match against CONFIG.
          invalid.push({
            id: reg.id,
            firstName: reg.firstName || "",
            lastName: reg.lastName || "",
            email: reg.email || "",
            cellNumber: reg.cellNumber || "",
            createdAt: dateDisplay,
            period,
            invalidAcademy: academyName,
            issue: `Invalid academy: "${academyName}" (Normalized: ${normalized})`,
          });
        }
      };

      // Check Period 1
      if (reg.firstPeriod?.academy) {
        checkAcademy(reg.firstPeriod.academy, "P1");
      }

      // Check Period 2
      if (reg.secondPeriod?.academy) {
        checkAcademy(reg.secondPeriod.academy, "P2");
      }

      // Check New Structure (selectedAcademies)
      if (
        (reg as any).selectedAcademies &&
        Array.isArray((reg as any).selectedAcademies)
      ) {
        (reg as any).selectedAcademies.forEach((sel: any, idx: number) => {
          if (sel.academy) {
            const normalized = normalizeAcademy(sel.academy);
            if (!validNormalizedAcademies.has(normalized)) {
              invalid.push({
                id: reg.id,
                firstName: reg.firstName || "",
                lastName: reg.lastName || "",
                email: reg.email || "",
                cellNumber: reg.cellNumber || "",
                createdAt: dateDisplay,
                period: `Selection ${idx + 1}` as any,
                invalidAcademy: sel.academy,
                issue: `Invalid academy: "${sel.academy}"`,
              });
            }
          }
        });
      }

      // Check for empty - Optional? The original code flagged empty.
      // "No academy selected" might be valid if they didn't pick P2?
      // Original code: if period 1/2 exists but academy string is empty?
      // "if (reg.firstPeriod && (!reg.firstPeriod.academy ...))"
      // If reg.firstPeriod is defined (object) but academy field is empty string.
      // We can keep that logic.

      if (
        reg.firstPeriod &&
        (reg.firstPeriod.academy === undefined ||
          reg.firstPeriod.academy === "")
      ) {
        // This might flag legitimate "I only want P2" or "No P1" if the object structure implies usage.
        // But usually firstPeriod object always exists? I'll assume valid to flag.
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || "",
          lastName: reg.lastName || "",
          email: reg.email || "",
          cellNumber: reg.cellNumber || "",
          createdAt: dateDisplay,
          period: "P1",
          invalidAcademy: "(Empty)",
          issue: "No academy selected for Period 1",
        });
      }

      if (
        reg.secondPeriod &&
        (reg.secondPeriod.academy === undefined ||
          reg.secondPeriod.academy === "")
      ) {
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || "",
          lastName: reg.lastName || "",
          email: reg.email || "",
          cellNumber: reg.cellNumber || "",
          createdAt: dateDisplay,
          period: "P2",
          invalidAcademy: "(Empty)",
          issue: "No academy selected for Period 2",
        });
      }
    });

    return invalid.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [registrations, academies]);

  const loading = regLoading || academiesLoading;
  const error = regError || academiesError;

  const uniqueEmails = React.useMemo(() => {
    return [...new Set(invalidRecords.map((record) => record.email))].filter(
      Boolean,
    );
  }, [invalidRecords]);

  const generateEmailList = () => {
    const emails = uniqueEmails.join(", ");
    navigator.clipboard.writeText(emails);
    alert("Email list copied to clipboard!");
  };

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
        <Typography color="error">Error loading data: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Invalid Academies Report
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Invalid Records
              </Typography>
              <Typography variant="h3">{invalidRecords.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unique Emails to Contact
              </Typography>
              <Typography variant="h3">{uniqueEmails.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valid Academies
              </Typography>
              <Typography variant="h6">
                {academies.map((a) => a.name).join(", ")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email List */}
      {uniqueEmails.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title="Emails to Contact"
            subheader={`${uniqueEmails.length} unique emails that need to be contacted`}
            action={
              <Chip
                label="Copy All Emails"
                onClick={generateEmailList}
                color="primary"
                clickable
              />
            }
          />
          <CardContent>
            <Typography
              variant="body2"
              sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
            >
              {uniqueEmails.join(", ")}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Invalid Records Table */}
      <Card>
        <CardHeader
          title="Invalid Academy Records"
          subheader="Records with academies that don't exist or are empty"
        />
        <CardContent>
          {invalidRecords.length === 0 ? (
            <Alert severity="success">
              No invalid academy records found! All registrations have valid
              academies.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Email</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Phone</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Period</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Invalid Academy</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Issue</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Registration Date</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invalidRecords.map((record) => (
                    <TableRow key={`${record.id}-${record.period}`}>
                      <TableCell>
                        <strong>
                          {record.firstName} {record.lastName}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`mailto:${record.email}`}
                          style={{ color: "inherit" }}
                        >
                          {record.email}
                        </a>
                      </TableCell>
                      <TableCell>{record.cellNumber}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.period}
                          color={
                            record.period === "P1" ? "primary" : "secondary"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.invalidAcademy}
                          color="error"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="error">
                          {record.issue}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
