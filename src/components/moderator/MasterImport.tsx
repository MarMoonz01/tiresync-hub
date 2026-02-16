import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseExcelFile, TireImportRow } from "@/lib/excelParser";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type ImportStep = 'UPLOAD' | 'REVIEW' | 'IMPORTING' | 'COMPLETED';

export function MasterImport() {
  const { toast } = useToast();

  // State
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [previewData, setPreviewData] = useState<TireImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, skipped: 0, failed: 0 });
  const [skippedItems, setSkippedItems] = useState<TireImportRow[]>([]); // New state for skipped items

  // 1. Handle File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseExcelFile(file);

      // กรองเฉพาะที่มีข้อมูลสำคัญ (Brand, Model, Size)
      const validRows = result.parsedData.filter(r => r.brand && r.size);

      if (validRows.length === 0) {
        toast({ title: "No Valid Data", description: "File is empty or missing required columns (Brand, Size).", variant: "destructive" });
        return;
      }

      setPreviewData(validRows);
      setStep('REVIEW'); // ไปหน้าตรวจสอบ

    } catch (error) {
      console.error(error);
      toast({ title: "Parse Error", description: "Failed to read Excel file.", variant: "destructive" });
    } finally {
      // Reset input value to allow re-uploading same file if needed
      e.target.value = '';
    }
  };

  // 2. Execute Import
  const handleConfirmImport = async () => {
    setStep('IMPORTING');
    setProgress(0);
    setStats({ total: previewData.length, success: 0, skipped: 0, failed: 0 });

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const skippedList: TireImportRow[] = [];

    // Batch Process (ทีละ 50 เพื่อไม่ให้ UI ค้าง และไม่ให้ Supabase Rate Limit)
    const batchSize = 50;
    const total = previewData.length;

    try {
      for (let i = 0; i < total; i += batchSize) {
        const batch = previewData.slice(i, i + batchSize);

        await Promise.all(batch.map(async (row) => {
          try {
            // เช็คว่ามีของเดิมอยู่แล้วไหม? (เพื่อไม่ให้ Duplicate)
            const { data: existing } = await supabase
              .from('master_tires')
              .select('id')
              .ilike('brand', row.brand)
              .ilike('model', row.model)
              .eq('size', row.size)
              .maybeSingle();

            if (!existing) {
              // ถ้าไม่มี -> สร้างใหม่
              const { error } = await supabase.from('master_tires').insert({
                brand: row.brand,
                model: row.model,
                size: row.size,
                load_index: row.load_index || null,
                speed_rating: row.speed_rating || null,
              });
              if (error) throw error;
              successCount++;
            } else {
              // ถ้ามีแล้ว -> ข้าม (หรือจะ Update ก็ได้ตาม Logic)
              skippedCount++;
              skippedList.push(row);
            }
          } catch (err) {
            console.error("Import row error:", err);
            failedCount++;
          }
        }));

        // Update Progress
        const currentProgress = Math.min(100, Math.round(((i + batch.length) / total) * 100));
        setProgress(currentProgress);

        // Delay เล็กน้อยเพื่อไม่ให้ถล่ม Database เกินไป
        await new Promise(res => setTimeout(res, 50));
      }

      setStats({ total, success: successCount, skipped: skippedCount, failed: failedCount });
      setSkippedItems(skippedList);
      setStep('COMPLETED');
      toast({ title: "Import Complete", description: `Added ${successCount} new master items.` });

    } catch (error) {
      console.error(error);
      toast({ title: "System Error", description: "Something went wrong during import.", variant: "destructive" });
      setStep('REVIEW'); // กลับไปหน้า Review ถ้าพัง
    }
  };

  // --- RENDER UI ---

  // 1. Upload View
  if (step === 'UPLOAD') {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Upload Master Database</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Upload Excel (.xlsx) file containing Master Catalog data.
            <br />Required columns: <b>Brand, Model, Size</b>
          </p>
          <div className="relative">
            <Button>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Select Excel File
            </Button>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 2. Review View
  if (step === 'REVIEW') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-muted/40 p-4 rounded-lg border">
          <div>
            <h3 className="font-semibold text-lg">Review Data</h3>
            <p className="text-sm text-muted-foreground">Found <b>{previewData.length}</b> valid items ready to import.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setStep('UPLOAD'); setPreviewData([]); }}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Import
            </Button>
          </div>
        </div>

        <Card>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Load Index</TableHead>
                  <TableHead>Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 100).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.brand}</TableCell>
                    <TableCell>{row.model}</TableCell>
                    <TableCell><Badge variant="outline">{row.size}</Badge></TableCell>
                    <TableCell>{row.load_index || '-'}</TableCell>
                    <TableCell>{row.speed_rating || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {previewData.length > 100 && (
            <div className="p-2 text-center text-xs text-muted-foreground border-t bg-muted/20">
              Showing first 100 of {previewData.length} rows...
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 3. Importing / Completed View
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center text-center space-y-6">
        {step === 'IMPORTING' ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="space-y-2 w-full max-w-md">
              <h3 className="text-xl font-semibold">Importing to Database...</h3>
              <p className="text-sm text-muted-foreground">Please wait while we process the data.</p>
              <Progress value={progress} className="h-2 w-full" />
              <p className="text-xs text-right text-muted-foreground">{progress}%</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">Import Completed!</h3>
              <p className="text-muted-foreground">The master catalog has been updated.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Rows</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-green-700">
                <div className="text-2xl font-bold">{stats.success}</div>
                <div className="text-xs opacity-80">Added New</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-orange-700">
                <div className="text-2xl font-bold">{stats.skipped}</div>
                <div className="text-xs opacity-80">Skipped (Duplicate)</div>
              </div>
            </div>

            {skippedItems.length > 0 && (
              <div className="w-full max-w-lg mt-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h4 className="font-semibold text-sm">Skipped Items (Duplicates)</h4>
                </div>
                <Card className="border-orange-200 bg-orange-50/50">
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="py-2 text-xs">Brand</TableHead>
                          <TableHead className="py-2 text-xs">Model</TableHead>
                          <TableHead className="py-2 text-xs">Size</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {skippedItems.map((item, idx) => (
                          <TableRow key={idx} className="border-b border-orange-100/50 hover:bg-orange-100/50">
                            <TableCell className="py-2 text-xs font-medium">{item.brand}</TableCell>
                            <TableCell className="py-2 text-xs">{item.model}</TableCell>
                            <TableCell className="py-2 text-xs">{item.size}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => { setStep('UPLOAD'); setPreviewData([]); setSkippedItems([]); }}>
                Back to Upload
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}