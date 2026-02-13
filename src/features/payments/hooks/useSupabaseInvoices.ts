import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { Invoice } from "../types";
import { logger } from "../../../lib/logger";

// Helper to get active semester
async function getActiveSemesterId() {
  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("name", "Spring 2026")
    .single();
  if (error || !data) throw new Error("Active semester not found");
  return data.id;
}

export function useSupabaseInvoices() {
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const semesterId = await getActiveSemesterId();

      const { data: invoicesData, error: invError } = await supabase
        .from("invoices")
        .select(
          `
            *,
            student:students (first_name, last_name, email),
            items:invoice_items (*)
        `,
        )
        .eq("semester_id", semesterId)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      const mappedInvoices: Invoice[] = invoicesData.map((inv: any) => ({
        id: inv.id,
        studentId: inv.student_id,
        studentName: inv.student
          ? `${inv.student.first_name} ${inv.student.last_name}`
          : "Unknown",
        lines: inv.items.map((item: any) => ({
          academy: item.description,
          unitPrice: (item.unit_price || 0) * 100, // DB(Dollars) -> UI(Cents)
          qty: item.quantity,
          amount: (item.amount || 0) * 100, // DB(Dollars) -> UI(Cents)
          period: null,
          level: null,
        })),
        subtotal: (inv.subtotal || 0) * 100, // DB(Dollars) -> UI(Cents)
        discountAmount: (inv.discount_amount || 0) * 100, // DB(Dollars) -> UI(Cents)
        discountNote: inv.discount_note,
        total: (inv.total || 0) * 100, // DB(Dollars) -> UI(Cents)
        paid: (inv.paid_amount || 0) * 100, // DB(Dollars) -> UI(Cents)
        balance: (inv.balance || 0) * 100, // DB(Dollars) -> UI(Cents)
        status: inv.status,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at || inv.created_at,
        lunch: { semesterSelected: false, singleQty: 0 },
        lunchAmount: inv.items
          .filter((i: any) => i.type.includes("lunch"))
          .reduce((s: number, i: any) => s + (i.amount || 0) * 100, 0),
      }));

      setData(mappedInvoices);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // --- Transformations ---

  // Create Invoice
  const createInvoice = async (
    invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">,
  ) => {
    try {
      const semesterId = await getActiveSemesterId();

      // 1. Insert Invoice
      // UI sends Cents, DB expects Dollars -> Divide by 100
      const { data: inv, error: insError } = await supabase
        .from("invoices")
        .insert({
          semester_id: semesterId,
          student_id: invoiceData.studentId,
          status: invoiceData.status,
          subtotal: invoiceData.subtotal / 100,
          discount_amount: (invoiceData.discountAmount ?? 0) / 100,
          discount_note: invoiceData.discountNote,
          total: invoiceData.total / 100,
          paid_amount: invoiceData.paid / 100,
          balance: invoiceData.balance / 100,
          due_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (insError) throw insError;

      // 2. Insert Items
      const itemsToInsert = [];

      // Academy Lines
      if (invoiceData.lines) {
        for (const line of invoiceData.lines) {
          itemsToInsert.push({
            invoice_id: inv.id,
            type: "tuition",
            description: line.academy + (line.level ? ` - ${line.level}` : ""),
            academy_id: null,
            quantity: line.qty,
            unit_price: line.unitPrice / 100,
            amount: line.amount / 100,
          });
        }
      }

      // Lunch Items
      if (invoiceData.lunchAmount && invoiceData.lunchAmount > 0) {
        itemsToInsert.push({
          invoice_id: inv.id,
          type: "lunch_semester",
          description: "Lunch Service",
          quantity: 1,
          unit_price: invoiceData.lunchAmount / 100,
          amount: invoiceData.lunchAmount / 100,
        });
      }

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      await fetchInvoices();
      return inv.id;
    } catch (err: any) {
      logger.error("Error creating invoice", err);
      throw err;
    }
  };

  // Update Invoice
  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      // Map UI fields to DB columns (Cents -> Dollars)
      const dbUpdates: any = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paid !== undefined)
        dbUpdates.paid_amount = updates.paid / 100;
      if (updates.balance !== undefined)
        dbUpdates.balance = updates.balance / 100;
      if (updates.total !== undefined) dbUpdates.total = updates.total / 100;

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("invoices")
        .update(dbUpdates)
        .eq("id", id);
      if (error) throw error;

      await fetchInvoices();
      return true;
    } catch (err: any) {
      logger.error("Error updating invoice", err);
      throw err;
    }
  };

  // Delete Invoice
  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      // Items cascade delete? Yes, configured in schema.
      // Payments cascade delete? Yes, configured in schema.

      await fetchInvoices();
      return true;
    } catch (err: any) {
      logger.error("Error deleting invoice", err);
      throw err;
    }
  };

  // Get invoice by ID (Helper)
  const getInvoiceById = useCallback(
    (id: string) => {
      return data.find((i) => i.id === id);
    },
    [data],
  );

  const getInvoicesByStudentId = useCallback(
    (studentId: string) => {
      return data.filter((i) => i.studentId === studentId);
    },
    [data],
  );

  return {
    data,
    loading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesByStudentId,
  };
}
