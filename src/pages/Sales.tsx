import { useState } from "react";
import { SalesForm } from "@/components/sales/SalesForm";
import { StockTable } from "@/components/sales/StockTable";
import { TRENDPanel } from "@/components/sales/TRENDPanel";
import { RecentSales } from "@/components/sales/RecentSales";
import { StockItem } from "@/hooks/useStockLookup";
import { useStockLookup } from "@/hooks/useStockLookup";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart } from "lucide-react";

export default function Sales() {
  const [selectedTire, setSelectedTire] = useState<StockItem | null>(null);
  const [activeTab, setActiveTab] = useState<"sell" | "stock">("sell");
  const isMobile = useIsMobile();

  const { data: allStock = [] } = useStockLookup("");
  const selectById = (id: string) => {
    const tire = allStock.find((t) => t.id === id);
    if (tire) {
      setSelectedTire(tire);
      if (isMobile) setActiveTab("sell");
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen pb-20">
        <div className="p-4">
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 mb-4">
            <ShoppingCart className="w-6 h-6 text-primary" /> ขายยาง
          </h1>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sell" | "stock")}>
            <TabsList className="w-full grid grid-cols-2 rounded-xl">
              <TabsTrigger value="sell" className="rounded-lg">บันทึกการขาย</TabsTrigger>
              <TabsTrigger value="stock" className="rounded-lg">เลือกยาง</TabsTrigger>
            </TabsList>

            <TabsContent value="sell" className="pt-4 space-y-4">
              <SalesForm selectedTire={selectedTire} onSelectTireById={selectById} onComplete={() => setSelectedTire(null)} />
              <RecentSales />
            </TabsContent>

            <TabsContent value="stock" className="pt-4 h-[calc(100vh-12rem)]">
              <StockTable onSelect={(t) => { setSelectedTire(t); setActiveTab("sell"); }} selectedId={selectedTire?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> ขายยาง
          </h1>
          <p className="text-sm text-muted-foreground mt-1">เลือกยาง บันทึกการขาย — สต็อกอัปเดตทันที</p>
        </div>

        <div className="grid grid-cols-2 gap-5 items-start">
          {/* picker */}
          <div className="h-[calc(100vh-13rem)]">
            <StockTable onSelect={setSelectedTire} selectedId={selectedTire?.id} />
          </div>
          {/* form */}
          <div className="flex flex-col gap-4">
            <SalesForm selectedTire={selectedTire} onSelectTireById={selectById} onComplete={() => setSelectedTire(null)} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <TRENDPanel onSuggest={selectById} />
          <RecentSales />
        </div>
      </div>
    </div>
  );
}
