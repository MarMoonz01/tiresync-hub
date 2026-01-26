-- Create store_members table to track which users belong to which store
CREATE TABLE public.store_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- Enable RLS
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their store members
CREATE POLICY "Store owners can manage their members"
ON public.store_members
FOR ALL
USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

-- Users can view their own membership
CREATE POLICY "Users can view their own membership"
ON public.store_members
FOR SELECT
USING (user_id = auth.uid());

-- Admins can manage all store members
CREATE POLICY "Admins can manage all store members"
ON public.store_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_store_members_updated_at
BEFORE UPDATE ON public.store_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();