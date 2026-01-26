-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'store_member', 'pending');

-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('interested', 'approved', 'shipped', 'delivered', 'cancelled');

-- Create user roles table (for secure role checking)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    status user_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create stores table
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create tires table
CREATE TABLE public.tires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    size TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT,
    load_index TEXT,
    speed_rating TEXT,
    price DECIMAL(10, 2),
    is_shared BOOLEAN NOT NULL DEFAULT false,
    network_price DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tires
ALTER TABLE public.tires ENABLE ROW LEVEL SECURITY;

-- Create tire DOT codes table (up to 4 DOT codes per tire)
CREATE TABLE public.tire_dots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tire_id UUID REFERENCES public.tires(id) ON DELETE CASCADE NOT NULL,
    dot_code TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    promotion TEXT,
    position INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1 AND position <= 4),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (tire_id, position)
);

-- Enable RLS on tire_dots
ALTER TABLE public.tire_dots ENABLE ROW LEVEL SECURITY;

-- Create stock logs table
CREATE TABLE public.stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tire_dot_id UUID REFERENCES public.tire_dots(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stock_logs
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND status = 'approved'
    )
$$;

-- Create function to get user's store
CREATE OR REPLACE FUNCTION public.get_user_store_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.stores WHERE owner_id = _user_id LIMIT 1
$$;

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tires_updated_at
    BEFORE UPDATE ON public.tires
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tire_dots_updated_at
    BEFORE UPDATE ON public.tire_dots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    -- Assign 'pending' role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Approved users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stores
CREATE POLICY "Store owners can manage their store"
    ON public.stores FOR ALL
    TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Approved users can view all stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can manage all stores"
    ON public.stores FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tires
CREATE POLICY "Store owners can manage their tires"
    ON public.tires FOR ALL
    TO authenticated
    USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "Approved users can view shared tires"
    ON public.tires FOR SELECT
    TO authenticated
    USING (public.is_approved(auth.uid()) AND is_shared = true);

CREATE POLICY "Admins can manage all tires"
    ON public.tires FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tire_dots
CREATE POLICY "Store owners can manage their tire dots"
    ON public.tire_dots FOR ALL
    TO authenticated
    USING (tire_id IN (
        SELECT t.id FROM public.tires t
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Approved users can view shared tire dots"
    ON public.tire_dots FOR SELECT
    TO authenticated
    USING (tire_id IN (
        SELECT id FROM public.tires WHERE is_shared = true
    ) AND public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage all tire dots"
    ON public.tire_dots FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stock_logs
CREATE POLICY "Store owners can view their stock logs"
    ON public.stock_logs FOR SELECT
    TO authenticated
    USING (tire_dot_id IN (
        SELECT td.id FROM public.tire_dots td
        JOIN public.tires t ON td.tire_id = t.id
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Store owners can insert stock logs"
    ON public.stock_logs FOR INSERT
    TO authenticated
    WITH CHECK (tire_dot_id IN (
        SELECT td.id FROM public.tire_dots td
        JOIN public.tires t ON td.tire_id = t.id
        JOIN public.stores s ON t.store_id = s.id
        WHERE s.owner_id = auth.uid()
    ));

CREATE POLICY "Admins can manage all stock logs"
    ON public.stock_logs FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));