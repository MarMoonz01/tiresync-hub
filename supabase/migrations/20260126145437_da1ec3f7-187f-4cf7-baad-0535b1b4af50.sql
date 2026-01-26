-- Create orders table to track interest expressions
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    seller_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    tire_id UUID NOT NULL REFERENCES public.tires(id) ON DELETE CASCADE,
    tire_dot_id UUID REFERENCES public.tire_dots(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC,
    status order_status NOT NULL DEFAULT 'interested',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their orders"
ON public.orders
FOR SELECT
USING (buyer_store_id = get_user_store_id(auth.uid()));

-- Buyers can create orders (express interest)
CREATE POLICY "Buyers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (buyer_store_id = get_user_store_id(auth.uid()));

-- Buyers can update their own orders
CREATE POLICY "Buyers can update their orders"
ON public.orders
FOR UPDATE
USING (buyer_store_id = get_user_store_id(auth.uid()));

-- Sellers can view orders for their products
CREATE POLICY "Sellers can view orders for their products"
ON public.orders
FOR SELECT
USING (seller_store_id = get_user_store_id(auth.uid()));

-- Sellers can update orders for their products
CREATE POLICY "Sellers can update orders for their products"
ON public.orders
FOR UPDATE
USING (seller_store_id = get_user_store_id(auth.uid()));

-- Admins can manage all orders
CREATE POLICY "Admins can manage all orders"
ON public.orders
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;