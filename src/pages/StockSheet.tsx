import { useState } from "react";
import { useStockSheet, useStockSheetMutations, SheetTire, DotBatch } from "@/hooks/useStockSheet";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet as SheetIcon, Search, Plus, Trash2, Loader2 } from "lucide-react";

const baht = (n: number | null | undefined) => "฿" + (n ?? 0).toLocaleString("en-US");
const POSITIONS = [1, 2, 3, 4];

interface DotEditor { tireId: string; position: number; dot?: DotBatch }

export default function StockSheet() {
  const [search, setSearch] = useState("");
  const { tyres, isLoading } = useStockSheet(search);
  const { upsertDot, deleteDot, addTire } = useStockSheetMutations();

  const [editor, setEditor] = useState<DotEditor | null>(null);
  const [dotCode, setDotCode] = useState("");
  const [dotQty, setDotQty] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [nt, setNt] = useState({ brand: "", model: "", size: "", load_index: "", sell_price: 0 });

  const openEditor = (tireId: string, position: number, dot?: DotBatch) => {
    setEditor({ tireId, position, dot });
    setDotCode(dot?.dot_code === "N/A" ? "" : dot?.dot_code ?? "");
    setDotQty(dot?.quantity ?? 0);
  };

  const saveDot = () => {
    if (!editor) return;
    upsertDot.mutate(
      { id: editor.dot?.id, tire_id: editor.tireId, position: editor.position, dot_code: dotCode.trim() || "N/A", quantity: dotQty },
      { onSuccess: () => setEditor(null) },
    );
  };

  const totalQty = (t: SheetTire) => t.dots.reduce((s, d) => s + d.quantity, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
        <div>
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <SheetIcon className="w-6 h-6 text-primary" /> สต็อก (ตาราง DOT)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการสต็อกแบบ DOT — สูงสุด 4 ล็อตต่อยาง</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> เพิ่มยาง
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 rounded-xl bg-secondary/60" placeholder="ค้นหา ขนาด / แบรนด์ / รุ่น" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                {["ขนาด", "แบรนด์ / รุ่น", "Load", "ราคา", "DOT 1", "DOT 2", "DOT 3", "DOT 4", "รวม"].map((h, i) => (
                  <th key={h} className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${i >= 3 ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">กำลังโหลด...</td></tr>}
              {!isLoading && tyres.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">ยังไม่มียาง — กด “เพิ่มยาง”</td></tr>}
              {tyres.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2.5 font-mono font-semibold tabular-nums whitespace-nowrap">{t.size}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold whitespace-nowrap">{t.brand}</p>
                    <p className="text-xs text-muted-foreground">{t.model ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{t.load_index ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center font-bold tabular-nums whitespace-nowrap">{baht(t.sell_price)}</td>
                  {POSITIONS.map((pos) => {
                    const dot = t.dots.find((d) => d.position === pos);
                    return (
                      <td key={pos} className="px-2 py-2 text-center">
                        {dot ? (
                          <button onClick={() => openEditor(t.id, pos, dot)}
                            className="inline-flex flex-col items-center px-2 py-1 rounded-lg hover:bg-primary/10 transition min-w-[64px]">
                            <span className="font-mono text-xs font-semibold">{dot.dot_code}</span>
                            <span className={`text-[11px] tabular-nums ${dot.quantity > 0 ? "text-emerald-600 font-bold" : "text-muted-foreground"}`}>{dot.quantity} เส้น</span>
                          </button>
                        ) : (
                          <button onClick={() => openEditor(t.id, pos)}
                            className="w-7 h-7 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition inline-flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-center font-extrabold tabular-nums">{totalQty(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOT editor */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>{editor?.dot ? "แก้ไข" : "เพิ่ม"} DOT (ล็อตที่ {editor?.position})</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">รหัส DOT</span>
              <Input className="mt-1 rounded-xl font-mono" placeholder="เช่น 1426" value={dotCode} onChange={(e) => setDotCode(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">จำนวน (เส้น)</span>
              <Input type="number" min={0} className="mt-1 rounded-xl tabular-nums" value={dotQty} onChange={(e) => setDotQty(Math.max(0, parseInt(e.target.value) || 0))} />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {editor?.dot && (
              <button onClick={() => deleteDot.mutate(editor.dot!.id, { onSuccess: () => setEditor(null) })}
                className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 transition mr-auto">
                <Trash2 className="w-4 h-4" /> ลบ
              </button>
            )}
            <button onClick={() => setEditor(null)} className="rounded-xl px-4 py-2 text-sm font-semibold border border-border hover:bg-secondary">ยกเลิก</button>
            <button onClick={saveDot} disabled={upsertDot.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {upsertDot.isPending && <Loader2 className="w-4 h-4 animate-spin" />} บันทึก
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add tyre */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>เพิ่มยางใหม่</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            {([["ขนาด", "size", "เช่น 185/65R15"], ["แบรนด์", "brand", "เช่น Michelin"], ["รุ่น", "model", "เช่น XM2+"], ["Load Index", "load_index", "เช่น 88H"]] as const).map(([label, key, ph]) => (
              <label key={key} className={key === "size" || key === "brand" ? "col-span-1" : "col-span-1"}>
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <Input className="mt-1 rounded-xl" placeholder={ph} value={(nt as Record<string, string | number>)[key] as string}
                  onChange={(e) => setNt((s) => ({ ...s, [key]: e.target.value }))} />
              </label>
            ))}
            <label className="col-span-2">
              <span className="text-xs font-semibold text-muted-foreground">ราคาขาย (฿)</span>
              <Input type="number" min={0} className="mt-1 rounded-xl tabular-nums" value={nt.sell_price}
                onChange={(e) => setNt((s) => ({ ...s, sell_price: parseFloat(e.target.value) || 0 }))} />
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button onClick={() => setAddOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold border border-border hover:bg-secondary">ยกเลิก</button>
            <button
              onClick={() => addTire.mutate(nt, { onSuccess: () => { setAddOpen(false); setNt({ brand: "", model: "", size: "", load_index: "", sell_price: 0 }); } })}
              disabled={!nt.brand.trim() || !nt.size.trim() || addTire.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {addTire.isPending && <Loader2 className="w-4 h-4 animate-spin" />} เพิ่ม
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
