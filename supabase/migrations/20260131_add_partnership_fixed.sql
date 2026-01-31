-- 1. Create Partnership Status Enum
DO $$ BEGIN
    CREATE TYPE public.partnership_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Store Partnerships Table
CREATE TABLE IF NOT EXISTS public.store_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    receiver_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    status public.partnership_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(requester_store_id, receiver_store_id)
);

-- Enable RLS
ALTER TABLE public.store_partnerships ENABLE ROW LEVEL SECURITY;

-- Policies for Partnerships
DROP POLICY IF EXISTS "Stores can view their partnerships" ON public.store_partnerships;
CREATE POLICY "Stores can view their partnerships"
    ON public.store_partnerships FOR SELECT
    USING (
        requester_store_id = public.get_user_store_id(auth.uid()) OR 
        receiver_store_id = public.get_user_store_id(auth.uid())
    );

DROP POLICY IF EXISTS "Stores can create partnership requests" ON public.store_partnerships;
CREATE POLICY "Stores can create partnership requests"
    ON public.store_partnerships FOR INSERT
    WITH CHECK (requester_store_id = public.get_user_store_id(auth.uid()));

DROP POLICY IF EXISTS "Stores can update their partnerships" ON public.store_partnerships;
CREATE POLICY "Stores can update their partnerships"
    ON public.store_partnerships FOR UPDATE
    USING (
        requester_store_id = public.get_user_store_id(auth.uid()) OR 
        receiver_store_id = public.get_user_store_id(auth.uid())
    );

-- 3. Create Partnership Notifications Table (New name to avoid conflict)
CREATE TABLE IF NOT EXISTS public.partnership_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.partnership_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores can view their notifications" ON public.partnership_notifications;
CREATE POLICY "Stores can view their notifications"
    ON public.partnership_notifications FOR SELECT
    USING (store_id = public.get_user_store_id(auth.uid()));

DROP POLICY IF EXISTS "Stores can update their notifications" ON public.partnership_notifications;
CREATE POLICY "Stores can update their notifications"
    ON public.partnership_notifications FOR UPDATE
    USING (store_id = public.get_user_store_id(auth.uid()));

-- 4. Helper Function: Check partnership status
CREATE OR REPLACE FUNCTION public.check_partnership_status(_store_a UUID, _store_b UUID)
RETURNS public.partnership_status
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT status 
    FROM public.store_partnerships
    WHERE (requester_store_id = _store_a AND receiver_store_id = _store_b)
       OR (requester_store_id = _store_b AND receiver_store_id = _store_a)
    LIMIT 1;
$$;

-- 5. RPC: Get Partner Inventory (Securely)
CREATE OR REPLACE FUNCTION public.get_partner_inventory(_partner_store_id UUID)
RETURNS TABLE (
    id UUID,
    brand TEXT,
    model TEXT,
    size TEXT,
    price DECIMAL,
    quantity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _my_store_id UUID;
    _status public.partnership_status;
BEGIN
    -- Use existing function
    _my_store_id := public.get_user_store_id(auth.uid());
    
    -- Check if they are partners
    SELECT public.check_partnership_status(_my_store_id, _partner_store_id) INTO _status;
    
    IF _status = 'approved' THEN
        RETURN QUERY
        SELECT 
            t.id,
            t.brand,
            t.model,
            t.size,
            t.price,
            COALESCE(SUM(td.quantity), 0)::INTEGER as quantity
        FROM public.tires t
        LEFT JOIN public.tire_dots td ON t.id = td.tire_id
        WHERE t.store_id = _partner_store_id
        GROUP BY t.id, t.brand, t.model, t.size, t.price;
    ELSE
        RETURN;
    END IF;
END;
$$;

-- 6. Trigger for Notifications
CREATE OR REPLACE FUNCTION public.handle_partnership_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Notify Receiver about new request
        INSERT INTO public.partnership_notifications (store_id, type, title, message, reference_id)
        VALUES (
            NEW.receiver_store_id,
            'partnership_request',
            'New Partnership Request',
            'Another store wants to connect with you.',
            NEW.id
        );
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
        -- Notify Requester that request was accepted
        INSERT INTO public.partnership_notifications (store_id, type, title, message, reference_id)
        VALUES (
            NEW.requester_store_id,
            'partnership_accepted',
            'Partnership Accepted',
            'Your partnership request has been accepted.',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.handle_partnership_notification();