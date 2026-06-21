import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSaleForm } from "@/hooks/useSaleForm";
import { computeTotalRevenue } from "@/lib/saleMath";
import { StockItem } from "@/hooks/useStockLookup";
import { REXPanel } from "./REXPanel";
import { useQueryClient } from "@tanstack/react-query";

const SERVICES = [
  { id: "balance", label: "ถ่วงล้อ", price: 200 },
  { id: "align", label: "ตั้งศูนย์", price: 350 },
  { id: "rotate", label: "สลับยาง", price: 150 },
  { id: "valve", label: "เปลี่ยนจุ๊บ", price: 50 },
];

interface SalesFormProps {
  selectedTire: StockItem | null;
  onSelectTireById: (id: string) => void;
  onComplete: () => void;
}

export function SalesForm({ selectedTire, onSelectTireById, onComplete }: SalesFormProps) {
  const { submitSale, submitting } = useSaleForm();
  const queryClient = useQueryClient();

  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [carModel, setCarModel] = useState("");
  const [plate, setPlate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (selectedTire) {
      setPrice(selectedTire.sell_price);
      setQty(1);
    }
  }, [selectedTire?.id]);

  const serviceTotal = SERVICES.filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const total = computeTotalRevenue(price, qty, serviceTotal);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTire) return;

    const result = await submitSale({
      tire_id: selectedTire.id,
      quantity_sold: qty,
      sell_price: price,
      services: selectedServices,
      service_total: serviceTotal,
      plate_number: plate,
      car_model: carModel,
      customer_name: customerName,
      phone,
    });

    if (result?.success) {
      // Reset form
      setQty(1);
      setPrice(0);
      setSelectedServices([]);
      setCarModel("");
      setPlate("");
      setCustomerName("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["stock-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sales"] });
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Tire info */}
      <div className="rounded-lg border border-border p-4 bg-muted/20">
        {selectedTire ? (
          <div>
            <p className="font-semibold">{selectedTire.brand} {selectedTire.model}</p>
            <p className="text-sm text-muted-foreground">{selectedTire.size} · คงเหลือ {selectedTire.quantity} เส้น</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">เลือกยางจากตารางด้านขวา</p>
        )}
      </div>

      {selectedTire && (
        <>
          {/* REX suggestion */}
          <REXPanel carModel={carModel} onSuggest={onSelectTireById} />

          {/* Qty + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>จำนวน (เส้น)</Label>
              <Input
                type="number"
                min={1}
                max={selectedTire.quantity}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label>ราคาต่อเส้น (฿)</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <Label className="mb-2 block">บริการเสริม</Label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedServices.includes(s.id)}
                    onCheckedChange={() => toggleService(s.id)}
                  />
                  {s.label} (+฿{s.price})
                </label>
              ))}
            </div>
          </div>

          {/* Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>รุ่นรถ</Label>
              <Input
                placeholder="เช่น Toyota Camry"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
              />
            </div>
            <div>
              <Label>ทะเบียนรถ</Label>
              <Input
                placeholder="เช่น กข 1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
              />
            </div>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ชื่อลูกค้า</Label>
              <Input
                placeholder="ชื่อ-นามสกุล"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label>เบอร์โทร</Label>
              <Input
                placeholder="0812345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Total + submit */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">ยอดรวม</p>
              <p className="text-2xl font-bold text-primary">฿{total.toLocaleString()}</p>
            </div>
            <Button
              type="submit"
              disabled={submitting || qty < 1 || qty > selectedTire.quantity}
              size="lg"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกการขาย"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
