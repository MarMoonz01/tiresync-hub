-- Create master_tires table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.master_tires (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    size TEXT NOT NULL,
    load_index TEXT,
    speed_rating TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Add unique constraint to prevent duplicates
    CONSTRAINT master_tires_brand_model_size_key UNIQUE (brand, model, size)
);

-- Enable RLS
ALTER TABLE public.master_tires ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'master_tires' AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.master_tires
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'master_tires' AND policyname = 'Enable write access for moderators and admins'
    ) THEN
        CREATE POLICY "Enable write access for moderators and admins" ON public.master_tires
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'moderator')
            )
        );
    END IF;
END
$$;
