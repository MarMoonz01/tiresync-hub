import { useState } from "react";
import { SalesForm } from "@/components/sales/SalesForm";
import { StockTable } from "@/components/sales/StockTable";
import { TRENDPanel } from "@/components/sales/TRENDPanel";
import { RecentSales } from "@/components/sales/RecentSales";
import { StockItem } from "@/hooks/useStockLookup";
import { useStockLookup } from "@/hooks/useStockLookup";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Sales() {
  const [selectedTire, setSelectedTire] = useState<StockItem | null>(null);
  const [activeTab, setActiveTab] = useState<"sell" | "stock">("sell");
  const isMobile = useIsMobile();

  // Flat lookup for selecting by ID (from REX/TREND)
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
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold">ขายยาง</h1>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sell" | "stock")}>
          <TabsList className="w-full rounded-none border-b border-border">
            <TabsTrigger value="sell" className="flex-1">บันทึกการขาย</TabsTrigger>
            <TabsTrigger value="stock" className="flex-1">เลือกยาง</TabsTrigger>
          </TabsList>

          <TabsContent value="sell" className="p-4">
            <SalesForm
              selectedTire={selectedTire}
              onSelectTireById={selectById}
              onComplete={() => setSelectedTire(null)}
            />
            <div className="mt-6">
              <RecentSales />
            </div>
          </TabsContent>

          <TabsContent value="stock" className="p-4 h-[calc(100vh-10rem)]">
            <StockTable
              onSelect={(t) => { setSelectedTire(t); setActiveTab("sell"); }}
              selectedId={selectedTire?.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">ขายยาง</h1>
      </header>

      <div className="p-6 grid grid-cols-2 gap-6 h-[calc(100vh-5rem)]">
        {/* Left: Sale form */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <SalesForm
            selectedTire={selectedTire}
            onSelectTireById={selectById}
            onComplete={() => setSelectedTire(null)}
          />
          <TRENDPanel onSuggest={selectById} />
          <RecentSales />
        </div>

        {/* Right: Stock table */}
        <div className="h-full overflow-hidden">
          <StockTable
            onSelect={setSelectedTire}
            selectedId={selectedTire?.id}
          />
        </div>
      </div>
    </div>
  );
}
