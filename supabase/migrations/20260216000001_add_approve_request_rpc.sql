-- Fix #4: Atomic approve-and-add-to-catalog RPC function
-- Ensures master_tire insert + request status update happen in a single transaction.
-- If either step fails, both are rolled back.

CREATE OR REPLACE FUNCTION public.approve_master_tire_request(
    _request_id UUID,
    _brand TEXT,
    _model TEXT,
    _size TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _new_id UUID;
BEGIN
    -- Verify the request exists and is still pending
    IF NOT EXISTS (
        SELECT 1 FROM public.master_tire_requests
        WHERE id = _request_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Request not found or already processed';
    END IF;

    -- Insert new master tire
    INSERT INTO public.master_tires (brand, model, size)
    VALUES (_brand, _model, _size)
    RETURNING id INTO _new_id;

    -- Update request status to approved
    UPDATE public.master_tire_requests
    SET status = 'approved', updated_at = now()
    WHERE id = _request_id;

    RETURN _new_id;
END;
$$;
