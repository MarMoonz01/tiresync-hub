-- 1. Add master_tire_id to tires table
ALTER TABLE public.tires 
ADD COLUMN IF NOT EXISTS master_tire_id UUID REFERENCES public.master_tires(id);

CREATE INDEX IF NOT EXISTS idx_tires_master_tire_id ON public.tires(master_tire_id);

-- 2. Create master_tire_requests table
CREATE TABLE IF NOT EXISTS public.master_tire_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    size TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.master_tire_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for master_tire_requests (safely)
DO $$
BEGIN
    -- Policy: Users can create requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Users can create requests'
    ) THEN
        CREATE POLICY "Users can create requests" 
        ON public.master_tire_requests 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Policy: Users can view their own requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Users can view own requests'
    ) THEN
        CREATE POLICY "Users can view own requests" 
        ON public.master_tire_requests 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;

    -- Policy: Moderators/Admins can view all requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Moderators can view all requests'
    ) THEN
        CREATE POLICY "Moderators can view all requests" 
        ON public.master_tire_requests 
        FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;

    -- Policy: Moderators/Admins can update requests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'master_tire_requests' AND policyname = 'Moderators can update requests'
    ) THEN
        CREATE POLICY "Moderators can update requests" 
        ON public.master_tire_requests 
        FOR UPDATE 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;
END $$;

-- 5. Add triggers for updated_at (safely)
DROP TRIGGER IF EXISTS update_master_tire_requests_updated_at ON public.master_tire_requests;
CREATE TRIGGER update_master_tire_requests_updated_at
    BEFORE UPDATE ON public.master_tire_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
