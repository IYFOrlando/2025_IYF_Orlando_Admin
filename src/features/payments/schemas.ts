import { z } from 'zod';

// Basic Payment Schema
// Validates the shape of data BEFORE it goes to Firestore
export const CreatePaymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number()
    .int("Amount must be in cents (integer)")
    .positive("Payment amount must be positive"),
  method: z.enum(['cash', 'zelle', 'check', 'discount', 'refund']),
  notes: z.string().optional()
});

// Distribution Payment Schema (for "Apply to all invoices")
export const DistributePaymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  totalAmount: z.number()
    .int("Amount must be in cents")
    .positive("Total payment amount must be positive"),
  method: z.enum(['cash', 'zelle', 'check'])
});

// Infer TS types from the schema so we don't have to duplicate them
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type DistributePaymentInput = z.infer<typeof DistributePaymentSchema>;
