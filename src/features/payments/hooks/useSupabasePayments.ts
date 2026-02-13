import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type { Payment } from "../types";
import { logger } from "../../../lib/logger";

export function useSupabasePayments() {
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      const { data: semester } = await supabase
        .from("semesters")
        .select("id")
        .eq("name", "Spring 2026")
        .single();

      if (!semester) throw new Error("Semester not found");

      const { data: paymentsData, error: payError } = await supabase
        .from("payments")
        .select(
          `
            *,
            invoice:invoices!inner(semester_id),
            student:students(first_name, last_name)
        `,
        )
        .eq("invoice.semester_id", semester.id)
        .order("transaction_date", { ascending: false }); // Use transaction_date

      if (payError) throw payError;

      const mappedPayments: Payment[] = paymentsData.map((p: any) => ({
        id: p.id,
        invoiceId: p.invoice_id,
        studentId: p.student_id,
        amount: (p.amount || 0) * 100, // DB(Dollars) -> UI(Cents)
        method: p.method,
        notes: p.notes,
        createdAt: { seconds: new Date(p.created_at).getTime() / 1000 } as any, // Legacy compat
        date: p.transaction_date, // New field preference
        studentName: p.student
          ? `${p.student.first_name} ${p.student.last_name}`
          : "Unknown",
      }));

      setData(mappedPayments);
    } catch (err: any) {
      console.error("Error fetching Supabase payments:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // --- Mutations ---

  // Record Payment
  const recordPayment = async (paymentData: {
    invoiceId: string;
    studentId: string;
    amount: number;
    method: string;
    notes?: string;
    currentPaid: number; // In Cents
    currentTotal: number; // In Cents
  }) => {
    try {
      const amountDollars = paymentData.amount / 100;

      // 1. Insert Payment
      const { data: pay, error: payError } = await supabase
        .from("payments")
        .insert({
          invoice_id: paymentData.invoiceId,
          student_id: paymentData.studentId,
          amount: amountDollars, // Cents -> Dollars
          method: paymentData.method,
          notes: paymentData.notes,
          received_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (payError) throw payError;

      // 2. Update Invoice Balance
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .select("total, paid_amount")
        .eq("id", paymentData.invoiceId)
        .single();
      if (invError) throw invError;

      // Inv data is in Dollars
      const newPaid = (inv.paid_amount || 0) + amountDollars;
      const newBalance = (inv.total || 0) - newPaid;
      const computedStatus =
        newBalance <= 0.01 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

      await supabase
        .from("invoices")
        .update({
          paid_amount: newPaid,
          balance: newBalance,
          status: computedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentData.invoiceId);

      await fetchPayments();
      return pay.id;
    } catch (err: any) {
      logger.error("Error recording payment", err);
      throw err;
    }
  };

  // Delete Payment
  const deletePayment = async (
    paymentId: string,
    invoiceId: string,
    amount: number, // In Cents from UI
  ) => {
    try {
      // 1. Delete Payment
      const { error: delError } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);
      if (delError) throw delError;

      // 2. Update Invoice Balance (Revert)
      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .select("total, paid_amount")
        .eq("id", invoiceId)
        .single();

      const amountDollars = amount / 100;

      if (invError) {
        console.warn("Invoice not found during payment deletion");
      } else {
        const newPaid = Math.max(0, (inv.paid_amount || 0) - amountDollars);
        const newBalance = (inv.total || 0) - newPaid;
        const computedStatus =
          newBalance <= 0.01 ? "paid" : newPaid > 0 ? "partial" : "unpaid";

        await supabase
          .from("invoices")
          .update({
            paid_amount: newPaid,
            balance: newBalance,
            status: computedStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);
      }

      await fetchPayments();
      return true;
    } catch (err: any) {
      logger.error("Error deleting payment", err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchPayments,
    recordPayment,
    deletePayment,
  };
}
