import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface SaleRow {
  id: string;
  tire_name: string;
  quantity_sold: number;
  total_revenue: number;
  car_model: string | null;
  created_at: string;
}

export function RecentSales() {
  const { store } = useAuth();

  const { data: sales = [] } = useQuery<SaleRow[]>({
    queryKey: ["recent-sales", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("sales_log_staff_view")
        .select("id, tire_name, quantity_sold, total_revenue, car_model, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as SaleRow[];
    },
    enabled: !!store?.id,
    staleTime: 30_000,
  });

  if (sales.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold">รายการขายล่าสุด</p>
      </div>
      <div className="divide-y divide-border">
        {sales.map((sale) => (
          <div key={sale.id} className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{sale.tire_name}</p>
              <p className="text-xs text-muted-foreground">
                {sale.car_model ?? "ไม่ระบุรถ"} · {sale.quantity_sold} เส้น
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">฿{sale.total_revenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(sale.created_at), { addSuffix: true, locale: th })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
