import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStockImport } from "@/hooks/useStockImport";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockUploadDialog({ open, onOpenChange }: Props) {
  const { analyze, confirmImport, reset, parsing, importing, preview, error } = useStockImport();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    await analyze(file);
  };

  const handleConfirm = async () => {
    const res = await confirmImport();
    if (res.ok) {
      toast({ title: "นำเข้าสำเร็จ", description: `อัปเดตสต็อก ${res.count} รายการ` });
      handleClose();
    }
  };

  const handleClose = () => {
    reset();
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            อัปโหลดสต็อกจาก Excel
          </DialogTitle>
          <DialogDescription>
            ไฟล์ต้องมีคอลัมน์: ยี่ห้อ (brand), รุ่น (model), ขนาด (size), จำนวน, ราคาขาย และต้นทุน.
            ระบบจะจับคู่กับแคตตาล็อกกลางอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        {/* Upload zone */}
        {!preview && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="w-full border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 hover:bg-muted/40 transition-colors"
          >
            {parsing ? (
              <><Loader2 className="w-7 h-7 animate-spin text-primary" /><span className="text-sm text-muted-foreground">กำลังอ่านไฟล์...</span></>
            ) : (
              <>
                <Upload className="w-7 h-7 text-muted-foreground" />
                <span className="text-sm font-medium">คลิกเพื่อเลือกไฟล์ .xlsx</span>
                {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 p-3">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <Check className="w-4 h-4" />
                  <span className="text-2xl font-bold">{preview.matched.length}</span>
                </div>
                <p className="text-xs text-emerald-700/80 mt-0.5">จับคู่ได้ — จะนำเข้า</p>
              </div>
              <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 p-3">
                <div className="flex items-center gap-1.5 text-amber-700">
                  <X className="w-4 h-4" />
                  <span className="text-2xl font-bold">{preview.unmatched.length}</span>
                </div>
                <p className="text-xs text-amber-700/80 mt-0.5">ไม่พบในแคตตาล็อก — ข้าม</p>
              </div>
            </div>

            {preview.unmatched.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border text-xs">
                <p className="px-3 py-2 font-medium bg-muted/50 sticky top-0">รายการที่ข้าม (ไม่ตรงแคตตาล็อก)</p>
                {preview.unmatched.map((r, i) => (
                  <div key={i} className="px-3 py-1.5 border-t border-border/50 flex justify-between">
                    <span>{r.brand} {r.model} {r.size}</span>
                    <span className="text-muted-foreground">{r.quantity} เส้น</span>
                  </div>
                ))}
              </div>
            )}

            {preview.matched.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                ไม่มีรายการที่ตรงกับแคตตาล็อก — ตรวจสอบยี่ห้อ/รุ่น/ขนาดในไฟล์
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>ยกเลิก</Button>
          {preview && (
            <Button onClick={handleConfirm} disabled={importing || preview.matched.length === 0} className="gap-2">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              นำเข้า {preview.matched.length} รายการ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
