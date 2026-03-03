-- Transactional RPC for walk-in lunch sales.
-- This reduces client round-trips and guarantees atomicity.

CREATE OR REPLACE FUNCTION public.create_walkin_lunch_sale(
  p_semester_id UUID,
  p_buyer_name TEXT,
  p_buyer_email TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit_price NUMERIC(10, 2),
  p_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL,
  p_received_by UUID DEFAULT NULL
)
RETURNS TABLE(invoice_id UUID, payment_id UUID, total NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_payment_id UUID;
  v_total NUMERIC(10, 2);
BEGIN
  IF p_semester_id IS NULL THEN
    RAISE EXCEPTION 'p_semester_id is required';
  END IF;
  IF COALESCE(trim(p_buyer_name), '') = '' THEN
    RAISE EXCEPTION 'p_buyer_name is required';
  END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'p_quantity must be >= 1';
  END IF;
  IF p_unit_price IS NULL OR p_unit_price <= 0 THEN
    RAISE EXCEPTION 'p_unit_price must be > 0';
  END IF;
  IF p_method NOT IN ('cash', 'zelle', 'check', 'card') THEN
    RAISE EXCEPTION 'p_method must be one of cash, zelle, check, card';
  END IF;

  v_total := ROUND((p_quantity::NUMERIC * p_unit_price)::NUMERIC, 2);

  INSERT INTO public.invoices (
    semester_id,
    student_id,
    buyer_name,
    buyer_email,
    status,
    subtotal,
    discount_amount,
    discount_note,
    total,
    paid_amount,
    balance,
    due_date
  )
  VALUES (
    p_semester_id,
    NULL,
    trim(p_buyer_name),
    NULLIF(trim(COALESCE(p_buyer_email, '')), ''),
    'paid',
    v_total,
    0,
    'Walk-in lunch sale',
    v_total,
    v_total,
    0,
    CURRENT_DATE
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id,
    type,
    description,
    quantity,
    unit_price,
    amount
  )
  VALUES (
    v_invoice_id,
    'lunch_single',
    format('Walk-in Lunch x %s - %s', p_quantity, trim(p_buyer_name)),
    p_quantity,
    p_unit_price,
    v_total
  );

  INSERT INTO public.payments (
    invoice_id,
    student_id,
    amount,
    method,
    received_by,
    notes,
    transaction_date
  )
  VALUES (
    v_invoice_id,
    NULL,
    v_total,
    p_method,
    p_received_by,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_payment_id;

  RETURN QUERY
  SELECT v_invoice_id, v_payment_id, v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_walkin_lunch_sale(
  UUID, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, UUID
) TO authenticated, service_role;
