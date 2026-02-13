
-- 1. Correct Invoice Paid Amounts from Payments
UPDATE invoices
SET 
    paid_amount = COALESCE((
        SELECT SUM(amount)
        FROM payments
        WHERE payments.invoice_id = invoices.id
    ), 0);

-- 2. Recalculate Balance
UPDATE invoices
SET balance = total - paid_amount;

-- 3. Update Status
UPDATE invoices
SET status = CASE
    WHEN balance <= 0.01 THEN 'paid'
    WHEN paid_amount > 0 AND balance > 0.01 THEN 'partial'
    ELSE 'unpaid'
END;
