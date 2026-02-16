import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  Send,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wand2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  parseExcelFile,
  TireImportRow
} from "@/lib/excelParser";
import { normalizeSearch, formatTireSize } from "@/lib/utils";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Types
type Step = "upload" | "review" | "importing" | "complete";

interface ReviewItem extends TireImportRow {
  status: 'READY' | 'UNKNOWN' | 'SKIP' | 'REQUESTED';
  matchedMasterId?: string;
  matchedMasterName?: string;
  requestNote?: string;
  originalIndex?: number;
}

interface MasterTire {
  id: string;
  brand: string;
  model: string;
  size: string;
  normBrand?: string;
  normModel?: string;
  formattedSize?: string;
}

const ITEMS_PER_PAGE = 10;

export default function Import() {
  const { store } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [masterCache, setMasterCache] = useState<MasterTire[]>([]);

  // Pagination State
  const [unmappedPage, setUnmappedPage] = useState(1);
  const [readyPage, setReadyPage] = useState(1);

  // Import Progress State
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; requested: number }>({ success: 0, failed: 0, requested: 0 });

  // Dialog States
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestNote, setRequestNote] = useState("");

  // --- File Handling ---

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Invalid file type", description: "Please upload Excel or CSV file", variant: "destructive" });
      return;
    }

    try {
      // 1. Parsing
      const result = await parseExcelFile(selectedFile);

      // 2. Fetch Master Catalog
      const { data: allMastersRaw } = await supabase.from('master_tires').select('id, brand, model, size');

      // Pre-process master cache for faster matching
      const allMasters = (allMastersRaw || []).map(m => ({
        ...m,
        normBrand: normalizeSearch(m.brand),
        normModel: normalizeSearch(m.model),
        formattedSize: normalizeSearch(m.size)
      }));

      setMasterCache(allMasters);

      // 3. Robust Matching Logic
      const processed: ReviewItem[] = result.parsedData.map((row, idx) => {
        const rowNormBrand = normalizeSearch(row.brand);
        const rowNormModel = normalizeSearch(row.model);
        const rowNormSize = normalizeSearch(row.size);
        const fmtSize = formatTireSize(row.size);
        const rowNormFmtSize = fmtSize ? normalizeSearch(fmtSize) : null;

        const match = allMasters.find(m => {
          const brandMatch = m.normBrand === rowNormBrand;
          // Loose model matching: check if one contains the other
          const modelMatch = m.normModel === rowNormModel || (m.normModel && rowNormModel && (m.normModel.includes(rowNormModel) || rowNormModel.includes(m.normModel)));

          const sizeMatch = m.formattedSize === rowNormSize || (rowNormFmtSize && m.formattedSize === rowNormFmtSize);

          return brandMatch && sizeMatch && modelMatch;
        });

        if (match) {
          return {
            ...row,
            originalIndex: idx,
            status: 'READY',
            matchedMasterId: match.id,
            matchedMasterName: `${match.brand} ${match.model} ${match.size}`
          };
        } else {
          return { ...row, originalIndex: idx, status: 'UNKNOWN' };
        }
      });

      setReviewItems(processed);
      setStep("review");
      toast({ title: "File parsed", description: `Found ${result.parsedData.length} items.` });

    } catch (error) {
      console.error("Error parsing file:", error);
      toast({ title: "Parse error", description: "Failed to parse file.", variant: "destructive" });
    }
  };

  // --- Actions ---

  const handleDeleteAllUnmapped = () => {
    if (confirm("Are you sure you want to remove ALL unmapped items from the list?")) {
      const newItems = reviewItems.filter(i => i.status !== 'UNKNOWN');
      setReviewItems(newItems);
      toast({ title: "Removed Unmapped", description: "All unmapped items have been removed." });
    }
  };

  const handleRequestAllUnmapped = () => {
    if (confirm("Request ALL unmapped items to be added to Master Catalog?")) {
      const newItems = reviewItems.map(i => {
        if (i.status === 'UNKNOWN') {
          return { ...i, status: 'REQUESTED' as const, requestNote: "Bulk Request from Import" };
        }
        return i;
      });
      setReviewItems(newItems);
      toast({ title: "Requested All", description: "All unmapped items marked as Requested." });
    }
  };

  const handleAutoMap = () => {
    let mappedCount = 0;
    const newItems = reviewItems.map(item => {
      if (item.status === 'UNKNOWN') {
        const rowNormBrand = normalizeSearch(item.brand);
        const rowNormModel = normalizeSearch(item.model);
        const rowNormSize = normalizeSearch(item.size);

        // Find match where Size matches AND (Brand OR Model matches)
        const matches = masterCache.filter(m => {
          const sizeMatch = m.formattedSize?.includes(rowNormSize) || rowNormSize.includes(m.formattedSize || "xxx");
          const brandMatch = m.normBrand === rowNormBrand;
          return sizeMatch && brandMatch;
        });

        if (matches.length > 0) {
          // Pick best match by model similarity
          const bestMatch = matches.find(m => m.normModel?.includes(rowNormModel) || rowNormModel.includes(m.normModel || "xxx")) || matches[0];

          mappedCount++;
          return {
            ...item,
            status: 'READY' as const,
            matchedMasterId: bestMatch.id,
            matchedMasterName: `${bestMatch.brand} ${bestMatch.model} ${bestMatch.size} (Auto-Mapped)`
          };
        }
      }
      return item;
    });

    if (mappedCount > 0) {
      setReviewItems(newItems);
      toast({ title: "Auto Map Complete", description: `Successfully mapped ${mappedCount} items.` });
    } else {
      toast({ title: "Auto Map", description: "No additional matches found." });
    }
  };

  const openSearch = (index: number) => {
    setActiveIndex(index);
    setSearchQuery(reviewItems[index].brand);
    setSearchDialogOpen(true);
  };

  const handleManualMap = (master: MasterTire) => {
    if (activeIndex === null) return;
    const newItems = [...reviewItems];
    newItems[activeIndex] = {
      ...newItems[activeIndex],
      status: 'READY',
      matchedMasterId: master.id,
      matchedMasterName: `${master.brand} ${master.model} ${master.size}`
    };
    setReviewItems(newItems);
    setSearchDialogOpen(false);
    setActiveIndex(null);
  };

  const handleConfirmRequest = () => {
    if (activeIndex === null) return;
    const newItems = [...reviewItems];
    newItems[activeIndex] = {
      ...newItems[activeIndex],
      status: 'REQUESTED',
      requestNote: requestNote
    };
    setReviewItems(newItems);
    setRequestDialogOpen(false);
    setActiveIndex(null);
  };

  const openRequest = (index: number) => {
    setActiveIndex(index);
    setRequestNote(`Request: ${reviewItems[index].brand} ${reviewItems[index].model}`);
    setRequestDialogOpen(true);
  }

  const handleSkip = (index: number) => {
    const newItems = [...reviewItems];
    newItems[index].status = 'SKIP';
    setReviewItems(newItems);
  };

  // --- Import Process ---

  const startImport = async () => {
    if (!store) return;
    setStep("importing");
    setImporting(true);
    setImportProgress(0);

    let success = 0;
    let failed = 0;
    let requested = 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < reviewItems.length; i++) {
      const item = reviewItems[i];

      // Skip validity checks
      if (item.status === 'SKIP' || item.status === 'UNKNOWN') continue;

      try {
        if (item.status === 'REQUESTED') {
          if (!item.requestNote) item.requestNote = "Import Request";
          await supabase.from('master_tire_requests').insert({
            user_id: user.id,
            brand: item.brand,
            model: item.model,
            size: item.size,
            note: item.requestNote,
            status: 'pending'
          });
          requested++;
        }
        else if (item.status === 'READY' && item.matchedMasterId) {
          let tireId: string;

          const { data: existingTire } = await supabase
            .from('tires')
            .select('id')
            .eq('store_id', store.id)
            .eq('master_tire_id', item.matchedMasterId)
            .maybeSingle();

          if (existingTire) {
            tireId = existingTire.id;
            if (item.price > 0) {
              await supabase.from('tires').update({ price: item.price }).eq('id', tireId);
            }
          } else {
            const { data: newTire, error } = await supabase
              .from('tires')
              .insert({
                store_id: store.id,
                master_tire_id: item.matchedMasterId,
                price: item.price,
                brand: item.brand, model: item.model, size: item.size
              })
              .select('id')
              .single();

            if (error) throw error;
            if (!newTire) throw new Error("Failed to create tire");
            tireId = newTire.id;
          }

          // Process DOTs
          for (const d of item.dots) {
            const { data: existingDot } = await supabase
              .from('tire_dots')
              .select('id')
              .eq('tire_id', tireId)
              .eq('dot_code', d.code)
              .maybeSingle();

            if (existingDot) {
              await supabase.from('tire_dots').update({
                quantity: d.quantity,
                promotion: d.promotion
              }).eq('id', existingDot.id);
            } else {
              await supabase.from('tire_dots').insert({
                tire_id: tireId,
                dot_code: d.code,
                quantity: d.quantity,
                promotion: d.promotion
              });
            }
          }
          success++;
        }
      } catch (error) {
        console.error("Import error details:", error);
        failed++;
      }

      setImportProgress(((i + 1) / reviewItems.length) * 100);
      setImportResults({ success, failed, requested });
    }

    setImporting(false);
    setStep("complete");
  };

  const searchResults = masterCache.filter(m =>
    m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.size.includes(searchQuery)
  ).slice(0, 10);

  if (!store) {
    return (
      <AppLayout>
        <div className="page-container flex flex-col items-center justify-center py-16 text-center">
          <Upload className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Store Found</h2>
          <p className="text-muted-foreground mb-6">Create a store profile to start importing.</p>
          <Link to="/store/setup"><Button>Set Up Store</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-container pb-20">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 max-w-5xl mx-auto">

          {/* Header */}
          <motion.div variants={itemVariants}>
            <Link to="/inventory" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Inventory
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Import Inventory</h1>
            <p className="text-muted-foreground mt-1">Upload Excel to sync stock with the Master Catalog.</p>
          </motion.div>

          {/* Steps */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-4 mb-2 text-sm">
              {["Upload", "Review & Match", "Import"].map((label, idx) => {
                const stepIdx = ["upload", "review", "importing"].indexOf(step === "complete" ? "importing" : step);
                const isComplete = idx < stepIdx || step === "complete";
                const isCurrent = idx === stepIdx;
                return (
                  <div key={label} className={`flex items-center gap-2 ${isCurrent ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isComplete ? "bg-green-500 text-white" : isCurrent ? "bg-primary text-white" : "bg-muted"}`}>
                      {isComplete ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    {label}
                    {idx < 2 && <div className="w-8 h-[1px] bg-muted-foreground/30" />}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* --- MAIN CONTENT AREA --- */}
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="glass-card">
                  <CardContent className="p-8">
                    <div
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                    >
                      <input type="file" onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-lg">Drop your Excel file here</p>
                          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card mt-6">
                  <CardHeader><CardTitle className="text-base">File Requirements</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Required columns: <b>Size, Brand</b></li>
                      <li>Optional: Model, Load Index, Price</li>
                      <li>Unlimited DOTs supported (e.g., DOT 1, Qty 1, DOT 2, Qty 2...)</li>
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "review" && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">

                {/* 1. Summary Card */}
                <Card className="glass-card bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2"><CardTitle className="text-lg">Pre-Import Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(reviewItems.reduce((acc, item) => {
                        const brand = item.brand || "Unknown";
                        if (!acc[brand]) acc[brand] = new Set();
                        acc[brand].add(item.size);
                        return acc;
                      }, {} as Record<string, Set<string>>)).slice(0, 6).map(([brand, sizes]) => (
                        <div key={brand} className="bg-background/80 p-3 rounded-md border text-sm shadow-sm">
                          <div className="font-bold text-primary mb-1 flex justify-between">
                            {brand}
                            <Badge variant="secondary" className="text-[10px] h-5">{sizes.size} sizes</Badge>
                          </div>
                          <div className="text-muted-foreground text-xs leading-relaxed truncate">
                            {Array.from(sizes).join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-4 text-sm font-medium pt-2 border-t justify-between items-center">
                      <div className="flex gap-4">
                        <div className="text-muted-foreground">Total: <span className="text-foreground">{reviewItems.length}</span></div>
                        <div className="text-green-600">Ready: <span className="font-bold">{reviewItems.filter(i => i.status !== 'UNKNOWN').length}</span></div>
                        <div className="text-red-500">Unmapped: <span className="font-bold">{reviewItems.filter(i => i.status === 'UNKNOWN').length}</span></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAutoMap} className="gap-2 text-primary border-primary/30 hover:bg-primary/5">
                        <Wand2 className="w-4 h-4" /> Auto Map
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Helper logic for splitting */}
                {(() => {
                  const itemsWithIndex = reviewItems.map((item, index) => ({ ...item, listIndex: index }));
                  const unmapped = itemsWithIndex.filter(i => i.status === 'UNKNOWN');
                  const mapped = itemsWithIndex.filter(i => i.status !== 'UNKNOWN');

                  // Pagination Logic
                  const unmappedTotalPages = Math.ceil(unmapped.length / ITEMS_PER_PAGE);
                  const unmappedPaginated = unmapped.slice((unmappedPage - 1) * ITEMS_PER_PAGE, unmappedPage * ITEMS_PER_PAGE);

                  const readyTotalPages = Math.ceil(mapped.length / ITEMS_PER_PAGE);
                  const readyPaginated = mapped.slice((readyPage - 1) * ITEMS_PER_PAGE, readyPage * ITEMS_PER_PAGE);

                  return (
                    <>
                      {/* 2. Unmapped Items (Action Needed) */}
                      {unmapped.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="font-bold text-red-500 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" /> Action Needed ({unmapped.length})
                            </h3>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 px-2" variant="destructive" onClick={handleDeleteAllUnmapped}>
                                <Trash2 className="w-3 h-3 mr-1" /> Delete All Unmapped
                              </Button>
                              <Button size="sm" className="h-7 px-2" variant="secondary" onClick={handleRequestAllUnmapped}>
                                <FileText className="w-3 h-3 mr-1" /> Request All
                              </Button>
                            </div>
                          </div>
                          <Card className="glass-card overflow-hidden border-red-200 shadow-sm">
                            <div className="overflow-x-auto">
                              <UITable>
                                <TableHeader className="bg-red-50/50">
                                  <TableRow>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead>Excel Data (Brand / Model / Size)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {unmappedPaginated.map((item) => (
                                    <TableRow key={item.listIndex} className="hover:bg-red-50/30">
                                      <TableCell><Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">Unknown</Badge></TableCell>
                                      <TableCell>
                                        <div className="font-medium text-base">{item.brand} {item.model}</div>
                                        <div className="text-sm text-muted-foreground">{item.size}</div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                          <Button size="sm" variant="default" onClick={() => openSearch(item.listIndex)} className="h-8"><Search className="w-3 h-3 mr-1" /> Map</Button>
                                          <Button size="sm" variant="secondary" onClick={() => openRequest(item.listIndex)} className="h-8"><FileText className="w-3 h-3 mr-1" /> Request</Button>
                                          <Button size="sm" variant="ghost" onClick={() => handleSkip(item.listIndex)} className="h-8 w-8 p-0 text-muted-foreground"><X className="w-4 h-4" /></Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </UITable>
                            </div>
                            {/* Unmapped Pagination */}
                            {unmappedTotalPages > 1 && (
                              <div className="flex items-center justify-between p-2 border-t bg-muted/20">
                                <Button variant="ghost" size="sm" disabled={unmappedPage === 1} onClick={() => setUnmappedPage(p => p - 1)}>
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground">Page {unmappedPage} of {unmappedTotalPages}</span>
                                <Button variant="ghost" size="sm" disabled={unmappedPage === unmappedTotalPages} onClick={() => setUnmappedPage(p => p + 1)}>
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </Card>
                        </div>
                      )}

                      {/* 3. Ready Items */}
                      <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" /> Ready to Import ({mapped.length})
                          </h3>
                        </div>
                        <Card className="glass-card overflow-hidden">
                          <div className="overflow-x-auto">
                            <UITable>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[50px]">Status</TableHead>
                                  <TableHead>Import As</TableHead>
                                  <TableHead className="text-center">Qty</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mapped.length === 0 ? (
                                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No valid items yet.</TableCell></TableRow>
                                ) : (
                                  readyPaginated.map((item) => (
                                    <TableRow key={item.listIndex} className={item.status === 'SKIP' ? 'opacity-50 bg-muted/50' : ''}>
                                      <TableCell>
                                        {item.status === 'READY' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                        {item.status === 'REQUESTED' && <Send className="w-5 h-5 text-orange-500" />}
                                        {item.status === 'SKIP' && <XCircle className="w-5 h-5 text-muted-foreground" />}
                                      </TableCell>
                                      <TableCell>
                                        {item.status === 'READY' ? (
                                          <div>
                                            <div className="font-medium text-green-700">{item.matchedMasterName}</div>
                                            <div className="text-xs text-muted-foreground">Matched from: {item.brand} {item.model}</div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="font-medium">{item.brand} {item.model} {item.size}</div>
                                            <div className="text-xs text-orange-500">{item.status === 'REQUESTED' ? 'Will verify by Moderator' : 'Skipped'}</div>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center font-mono text-sm">
                                        {item.dots.reduce((sum, d) => sum + d.quantity, 0)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.status === 'READY' && (
                                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                                            const n = [...reviewItems]; n[item.listIndex].status = 'UNKNOWN'; n[item.listIndex].matchedMasterId = undefined; setReviewItems(n);
                                          }}>Unmap</Button>
                                        )}
                                        {item.status !== 'READY' && (item.status === 'SKIP' ? (
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                            const n = [...reviewItems]; n[item.listIndex].status = 'UNKNOWN'; setReviewItems(n);
                                          }}>Undo Skip</Button>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Pending</span>
                                        ))}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </UITable>
                          </div>
                          {readyTotalPages > 1 && (
                            <div className="flex items-center justify-between p-2 border-t bg-muted/20">
                              <Button variant="ghost" size="sm" disabled={readyPage === 1} onClick={() => setReadyPage(p => p - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="text-xs text-muted-foreground">Page {readyPage} of {readyTotalPages}</span>
                              <Button variant="ghost" size="sm" disabled={readyPage === readyTotalPages} onClick={() => setReadyPage(p => p + 1)}>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </Card>
                      </div>
                    </>
                  );
                })()}

                <div className="flex justify-between pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t z-10">
                  <Button variant="outline" onClick={() => setStep('upload')}><ArrowLeft className="w-4 h-4 mr-2" /> Cancel</Button>
                  <Button onClick={startImport} disabled={reviewItems.every(i => i.status === 'SKIP') || reviewItems.some(i => i.status === 'UNKNOWN')} className="bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-primary/25">
                    Confirm Import ({reviewItems.filter(i => i.status !== 'UNKNOWN' && i.status !== 'SKIP').length} Items) <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {(step === "importing" || step === "complete") && (
              <motion.div key="importing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Card className="glass-card">
                  <CardContent className="py-12 flex flex-col items-center text-center">
                    {step === "importing" ? (
                      <>
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                        <h2 className="text-xl font-semibold mb-2">Importing Inventory...</h2>
                        <p className="text-muted-foreground mb-6">Processing {importResults.success + importResults.failed} of {reviewItems.length}</p>
                        <Progress value={importProgress} className="w-full max-w-md h-2" />
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Import Complete!</h2>
                        <div className="flex gap-6 mb-8">
                          <div className="text-center"><div className="text-2xl font-bold text-green-600">{importResults.success}</div><div className="text-xs text-muted-foreground">Imported</div></div>
                          <div className="text-center"><div className="text-2xl font-bold text-orange-500">{importResults.requested}</div><div className="text-xs text-muted-foreground">Requested</div></div>
                          <div className="text-center"><div className="text-2xl font-bold text-red-500">{importResults.failed}</div><div className="text-xs text-muted-foreground">Failed</div></div>
                        </div>
                        <Button onClick={() => setStep("upload")} variant="outline">Import Another File</Button>
                        <Button onClick={() => navigate('/inventory')} className="ml-2">Go to Inventory</Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dialogs - Outside main AnimatePresence to avoid conflicts */}
          <AnimatePresence>
            {searchDialogOpen && (
              <DialogPrimitive.Root open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
                <DialogPrimitive.Portal>
                  <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                  <DialogPrimitive.Content asChild>
                    <motion.div
                      initial="hidden" animate="visible" exit="exit"
                      variants={{
                        hidden: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" },
                        visible: { opacity: 1, scale: 1, x: "-50%", y: "-50%", transition: { type: "spring", stiffness: 300, damping: 25 } },
                        exit: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%", transition: { duration: 0.2 } }
                      }}
                      className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
                    >
                      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Search Master Catalog</h2>
                        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                      </div>

                      <div className="space-y-4 pt-2">
                        <Input placeholder="Search Brand, Model, Size..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                        <ScrollArea className="h-[200px] border rounded-md p-2 bg-muted/10">
                          {searchResults.length === 0 ? <div className="text-center py-4 text-muted-foreground">No matches found</div> :
                            searchResults.map(m => (
                              <div key={m.id} className="p-2 hover:bg-muted cursor-pointer rounded flex justify-between items-center transition-colors group border border-transparent hover:border-border" onClick={() => handleManualMap(m)}>
                                <div><div className="font-medium">{m.brand} {m.model}</div><div className="text-xs text-muted-foreground">{m.size}</div></div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Select</Button>
                              </div>
                            ))
                          }
                        </ScrollArea>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>Cancel</Button>
                      </div>
                    </motion.div>
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              </DialogPrimitive.Root>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {requestDialogOpen && (
              <DialogPrimitive.Root open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogPrimitive.Portal>
                  <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                  <DialogPrimitive.Content asChild>
                    <motion.div
                      initial="hidden" animate="visible" exit="exit"
                      variants={{
                        hidden: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" },
                        visible: { opacity: 1, scale: 1, x: "-50%", y: "-50%", transition: { type: "spring", stiffness: 300, damping: 25 } },
                        exit: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%", transition: { duration: 0.2 } }
                      }}
                      className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
                    >
                      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <h2 className="text-lg font-semibold leading-none tracking-tight">Request New Product</h2>
                        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </DialogPrimitive.Close>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm border border-orange-200">
                          This product is not in the Master Catalog. A request will be sent to the moderator.
                        </div>
                        <Textarea placeholder="Add a note (e.g. New 2024 model)" value={requestNote} onChange={e => setRequestNote(e.target.value)} rows={4} autoFocus />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmRequest}>Send Request</Button>
                      </div>
                    </motion.div>
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              </DialogPrimitive.Root>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AppLayout>
  );
}