import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSaleForm } from "@/hooks/useSaleForm";
import { computeTotalRevenue } from "@/lib/saleMath";
import { StockItem } from "@/hooks/useStockLookup";
import { REXPanel } from "./REXPanel";
import { useQueryClient } from "@tanstack/react-query";
import { CircleDot, Check, X, ShoppingCart } from "lucide-react";

const SERVICES = [
  { id: "balance", label: "ถ่วงล้อ", price: 200 },
  { id: "align", label: "ตั้งศูนย์", price: 350 },
  { id: "rotate", label: "สลับยาง", price: 150 },
  { id: "valve", label: "เปลี่ยนจุ๊บ", price: 50 },
];

const baht = (n: number) => "฿" + (n ?? 0).toLocaleString("en-US");

interface SalesFormProps {
  selectedTire: StockItem | null;
  onSelectTireById: (id: string) => void;
  onComplete: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
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

  const serviceTotal = SERVICES.filter((s) => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0);
  const total = computeTotalRevenue(price, qty, serviceTotal);

  const toggleService = (id: string) =>
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

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
      setQty(1); setPrice(0); setSelectedServices([]);
      setCarModel(""); setPlate(""); setCustomerName(""); setPhone("");
      queryClient.invalidateQueries({ queryKey: ["stock-lookup"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sales"] });
      onComplete();
    }
  };

  if (!selectedTire) {
    return (
      <div className="rounded-2xl border border-border bg-card shadow-soft p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">เลือกยางเพื่อเริ่มการขาย</p>
      </div>
    );
  }

  const inputCls = "rounded-xl bg-card";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card shadow-soft p-5 flex flex-col gap-4">
      {/* selected tyre chip */}
      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15">
        <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><CircleDot className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{selectedTire.brand} {selectedTire.model}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{selectedTire.size} · คงเหลือ {selectedTire.quantity} เส้น</p>
        </div>
        <button type="button" onClick={onComplete} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-secondary"><X className="w-4 h-4" /></button>
      </div>

      <REXPanel carModel={carModel} onSuggest={onSelectTireById} />

      {/* qty + price */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="จำนวน (เส้น)">
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 py-2.5 bg-secondary text-lg leading-none">−</button>
            <input type="number" min={1} max={selectedTire.quantity} value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(selectedTire.quantity, parseInt(e.target.value) || 1)))}
              className="flex-1 min-w-0 text-center font-bold tabular-nums bg-transparent outline-none py-2.5" />
            <button type="button" onClick={() => setQty((q) => Math.min(selectedTire.quantity, q + 1))} className="w-10 py-2.5 bg-secondary text-lg leading-none">+</button>
          </div>
        </Field>
        <Field label="ราคาต่อเส้น (฿)">
          <div className="flex items-center gap-1.5 px-3 border border-border rounded-xl bg-card">
            <span className="text-muted-foreground">฿</span>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="flex-1 min-w-0 bg-transparent outline-none py-2.5 tabular-nums" />
          </div>
        </Field>
      </div>

      {/* services as toggle buttons */}
      <Field label="บริการเสริม">
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map((s) => {
            const on = selectedServices.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition ${on ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
                <span className={`w-4 h-4 rounded-[5px] border flex items-center justify-center ${on ? "bg-primary border-primary text-white" : "border-border"}`}>{on && <Check className="w-3 h-3" strokeWidth={3} />}</span>
                <span className="flex-1">{s.label}</span>
                <span className="text-muted-foreground tabular-nums">+{s.price}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* vehicle + customer */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="รุ่นรถ"><Input className={inputCls} placeholder="เช่น Toyota Camry" value={carModel} onChange={(e) => setCarModel(e.target.value)} /></Field>
        <Field label="ทะเบียนรถ"><Input className={inputCls} placeholder="เช่น กข 1234" value={plate} onChange={(e) => setPlate(e.target.value)} /></Field>
        <Field label="ชื่อลูกค้า"><Input className={inputCls} placeholder="ชื่อ-นามสกุล" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
        <Field label="เบอร์โทร"><Input className={inputCls} placeholder="0812345678" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>

      {/* total + submit (dark bar) */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-foreground text-background">
        <div>
          <p className="text-[11px] opacity-65 font-semibold">ยอดรวม</p>
          <p className="text-2xl font-extrabold tabular-nums">{baht(total)}</p>
        </div>
        <button type="submit" disabled={submitting || qty < 1 || qty > selectedTire.quantity}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white px-5 py-3 text-sm font-bold disabled:opacity-50 hover:opacity-90 transition">
          <Check className="w-4 h-4" strokeWidth={2.5} /> {submitting ? "กำลังบันทึก..." : "บันทึกการขาย"}
        </button>
      </div>
    </form>
  );
}
