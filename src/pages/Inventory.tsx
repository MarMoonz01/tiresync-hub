import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Upload, CircleDot, Package, Loader2, X,
  ChevronLeft, ChevronRight, RefreshCw, FileText, Send, Grid, List // Added Grid/List icons
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppLayout } from "@/components/layout/AppLayout";
import { TireCard } from "@/components/inventory/TireCard";
import { InventoryTable } from "@/components/inventory/InventoryTable"; // ✅ Import Table
import { EditTireDialog } from "@/components/inventory/EditTireDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTires, Tire } from "@/hooks/useTires";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn, formatTireSize } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
interface MasterTire {
  id: string;
  brand: string;
  model: string;
  size: string;
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Inventory() {
  const isMobile = useIsMobile();
  const { store, isStaff } = useAuth();
  const { canAdd, canEdit, canDelete } = usePermissions();
  const {
    tires, loading, deleteTire, updateDotQuantity,
    page, setPage, totalPages, totalCount,
    setSearchQuery, brandFilter, setBrandFilter,
    stockFilter, setStockFilter, toggleShare, fetchTires
  } = useTires();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Local UI State
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [localSearch, setLocalSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // Edit Dialog States (✅ เพิ่มส่วนนี้)
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTire, setEditingTire] = useState<Tire | null>(null);

  // Search States
  const [masterSearchQuery, setMasterSearchQuery] = useState("");
  const [masterResults, setMasterResults] = useState<MasterTire[]>([]);
  const [isSearchingMaster, setIsSearchingMaster] = useState(false);
  const [requestNote, setRequestNote] = useState("");

  const debouncedSearch = useDebouncedValue(localSearch, 400);
  const debouncedMasterSearch = useDebouncedValue(masterSearchQuery, 400);

  // Effects
  useEffect(() => { setSearchQuery(debouncedSearch); }, [debouncedSearch, setSearchQuery]);

  useEffect(() => {
    async function searchMaster() {
      if (!debouncedMasterSearch) { setMasterResults([]); return; }
      setIsSearchingMaster(true);
      try {
        const formattedSize = formatTireSize(debouncedMasterSearch);
        let conditions = `brand.ilike.%${debouncedMasterSearch}%,model.ilike.%${debouncedMasterSearch}%,size.ilike.%${debouncedMasterSearch}%`;

        if (formattedSize) {
          conditions += `,size.ilike.%${formattedSize}%`;
        }

        const { data } = await supabase
          .from('master_tires')
          .select('id, brand, model, size')
          .or(conditions)
          .limit(20);
        setMasterResults(data || []);
      } catch (error) { console.error("Master search error", error); }
      finally { setIsSearchingMaster(false); }
    }
    searchMaster();
  }, [debouncedMasterSearch]);

  // Handlers
  const handleSelectMaster = (master: MasterTire) => {
    setIsAddDialogOpen(false);
    navigate('/inventory/add', { state: { prefill: master } });
  };

  const handleSendRequest = async () => {
    if (!store) return;
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        toast({ title: "Session Expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from('master_tire_requests').insert({
        user_id: data.user.id, brand: "Unknown", model: "Unknown", size: "Unknown",
        note: requestNote + ` (Search term: ${masterSearchQuery})`, status: 'pending'
      });
      if (error) throw error;
      toast({ title: "Request Sent", description: "Your request has been sent to the moderator." });
      setIsRequestDialogOpen(false); setIsAddDialogOpen(false); setRequestNote(""); setMasterSearchQuery("");
    } catch (error) { toast({ title: "Error", description: "Failed to send request", variant: "destructive" }); }
  };

  // ✅ เปลี่ยน handleEdit เป็นเปิด Dialog แทน Navigate
  const handleEdit = (tire: Tire) => {
    setEditingTire(tire);
    setIsEditOpen(true);
  };

  const handleDelete = async (tireId: string) => { try { await deleteTire(tireId); toast({ title: "Tire deleted", description: "Removed from inventory" }); } catch (error) { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); } };
  const handleQuantityChange = async (dotId: string, change: number) => { try { await updateDotQuantity(dotId, change); } catch (error) { toast({ title: "Error", description: "Failed to update", variant: "destructive" }); } };
  const handleToggleShare = async (tireId: string, isShared: boolean) => { try { await toggleShare(tireId, isShared); toast({ title: isShared ? "Shared" : "Unshared", description: isShared ? "Visible to network" : "Private" }); } catch (error) { toast({ title: "Error", description: "Failed to update", variant: "destructive" }); } };
  const handleManualRefresh = async () => { setIsRefreshing(true); try { await fetchTires(); await new Promise(resolve => setTimeout(resolve, 500)); } finally { setIsRefreshing(false); } };
  const clearFilters = () => { setLocalSearch(""); setBrandFilter("all"); setStockFilter("all"); };
  const goToPage = (newPage: number) => { if (newPage >= 1 && newPage <= totalPages) { setPage(newPage); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const hasActiveFilters = debouncedSearch || brandFilter !== "all" || stockFilter !== "all";
  const brands = useMemo(() => { return [...new Set(tires.map((t) => t.brand))].sort(); }, [tires]);
  const stats = useMemo(() => {
    const totalStock = tires.reduce((sum, t) => sum + (t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0), 0);
    const outOfStock = tires.filter((t) => (t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0) === 0).length;
    const lowStock = tires.filter((t) => { const qty = t.tire_dots?.reduce((s, d) => s + d.quantity, 0) || 0; return qty > 0 && qty <= 4; }).length;
    return { totalTires: totalCount, totalStock, outOfStock, lowStock };
  }, [tires, totalCount]);

  if (!store) return <AppLayout><div className="page-container flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6"><CircleDot className="w-10 h-10 text-muted-foreground" /></div><h2 className="text-xl font-semibold mb-2">{isStaff ? "Waiting for Approval" : "No Store Found"}</h2>{!isStaff && <Link to="/store/setup"><Button>Set Up Store</Button></Link>}</div></AppLayout>;
  if (loading && !isRefreshing && tires.length === 0) return <AppLayout><div className="page-container flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h1 className="text-2xl font-bold text-foreground">Tire Vault</h1><p className="text-muted-foreground mt-1">{store.name} • {stats.totalTires} tires • {stats.totalStock} in stock</p></div>
            <div className="flex gap-2">
              {canAdd && (<><Link to="/import"><Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Import</Button></Link><Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Tire</Button></>)}
            </div>
          </motion.div>

          {/* Stats */}
          {tires.length > 0 && (
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="glass-card"><CardContent className="p-4"><div className="text-2xl font-bold">{stats.totalTires}</div><div className="text-sm text-muted-foreground">Total Tires</div></CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4"><div className="text-2xl font-bold text-success">{stats.totalStock}</div><div className="text-sm text-muted-foreground">In Stock</div></CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4"><div className="text-2xl font-bold text-warning">{stats.lowStock}</div><div className="text-sm text-muted-foreground">Low Stock</div></CardContent></Card>
              <Card className="glass-card"><CardContent className="p-4"><div className="text-2xl font-bold text-destructive">{stats.outOfStock}</div><div className="text-sm text-muted-foreground">Out of Stock</div></CardContent></Card>
            </motion.div>
          )}

          {/* Filters & List */}
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search inventory..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handleManualRefresh} disabled={isRefreshing}><RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} /></Button>

                {/* View Toggle (Desktop Only) */}
                {!isMobile && (
                  <div className="flex bg-muted/50 p-1 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8", viewMode === "grid" && "bg-background shadow-sm")}
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8", viewMode === "table" && "bg-background shadow-sm")}
                      onClick={() => setViewMode("table")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-primary/10" : ""}><Filter className="w-4 h-4" /></Button>
              </div>
            </div>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
                    <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Brand" /></SelectTrigger><SelectContent><SelectItem value="all">All Brands</SelectItem>{brands.map((brand) => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}</SelectContent></Select>
                    <Select value={stockFilter} onValueChange={setStockFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Stock Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Stock</SelectItem><SelectItem value="in">In Stock (5+)</SelectItem><SelectItem value="low">Low Stock (1-4)</SelectItem><SelectItem value="out">Out of Stock</SelectItem></SelectContent></Select>
                    {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-1" /> Clear</Button>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {hasActiveFilters && !showFilters && <div className="flex flex-wrap gap-2">{debouncedSearch && <Badge variant="secondary">Search: {debouncedSearch} <button onClick={() => setLocalSearch("")} className="ml-1"><X className="w-3 h-3" /></button></Badge>}{brandFilter !== "all" && <Badge variant="secondary">Brand: {brandFilter} <button onClick={() => setBrandFilter("all")} className="ml-1"><X className="w-3 h-3" /></button></Badge>}{stockFilter !== "all" && <Badge variant="secondary">Stock: {stockFilter} <button onClick={() => setStockFilter("all")} className="ml-1"><X className="w-3 h-3" /></button></Badge>}</div>}
          </motion.div>

          {tires.length === 0 && !hasActiveFilters ? (
            <motion.div variants={itemVariants}><Card className="glass-card"><CardContent className="py-16 text-center"><div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto"><Package className="w-10 h-10 text-muted-foreground" /></div><h2 className="text-xl font-semibold mb-2">No Tires Yet</h2><p className="text-muted-foreground mb-6">Start building your inventory</p>{canAdd && (<div className="flex justify-center gap-3"><Link to="/import"><Button variant="outline"><Upload className="w-4 h-4 mr-2" /> Import Excel</Button></Link><Button className="bg-gradient-to-r from-primary to-accent" onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Tire</Button></div>)}</CardContent></Card></motion.div>
          ) : tires.length === 0 ? (
            <motion.div variants={itemVariants}><Card className="glass-card"><CardContent className="py-12 text-center"><p className="text-muted-foreground mb-4">No tires match filters</p><Button variant="outline" onClick={clearFilters}>Clear Filters</Button></CardContent></Card></motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-3">
              {viewMode === "grid" ? (
                // GRID VIEW
                <AnimatePresence mode="popLayout">{tires.map((tire) => (<TireCard key={tire.id} tire={tire} onEdit={handleEdit} onDelete={handleDelete} onQuantityChange={handleQuantityChange} onToggleShare={handleToggleShare} canEdit={canEdit} canDelete={canDelete} />))}</AnimatePresence>
              ) : (
                // TABLE VIEW
                <InventoryTable
                  tires={tires}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onQuantityChange={handleQuantityChange}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              )}
              {totalPages > 1 && (<div className="flex items-center justify-center gap-2 pt-6"><Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button><span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button></div>)}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* --- CUSTOM ANIMATED DIALOGS --- */}

      {/* 1. Add Tire Search Dialog */}
      {/* 1. Add Tire Search Dialog */}
      <AnimatePresence>
        {isAddDialogOpen && (
          isMobile ? (
            <Drawer open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DrawerContent>
                <DrawerHeader className="text-left">
                  <DrawerTitle>Add Tire to Inventory</DrawerTitle>
                  <DrawerDescription>Search our Master Catalog to add products quickly.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pt-0 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search (Brand, Model, Size)" value={masterSearchQuery} onChange={e => setMasterSearchQuery(e.target.value)} className="pl-9" autoFocus />
                  </div>
                  <div className="text-xs text-muted-foreground px-1 flex justify-between">
                    <span>{isSearchingMaster ? "Searching..." : masterSearchQuery ? `Found ${masterResults.length} matches` : "Type to search..."}</span>
                    {masterResults.length === 0 && !isSearchingMaster && masterSearchQuery && (
                      <span className="text-orange-500 cursor-pointer hover:underline" onClick={() => setIsRequestDialogOpen(true)}>Not found? Request new</span>
                    )}
                  </div>
                  <ScrollArea className="h-[250px] border rounded-md p-1 bg-muted/10">
                    {masterResults.length === 0 && !isSearchingMaster ? (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 p-4 text-center">
                        <p className="text-sm">Product not found?</p>
                        <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(true)} className="border-dashed">
                          <FileText className="w-4 h-4 mr-2" /> Request New Product
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {masterResults.map(m => (
                          <div key={m.id} className="p-3 hover:bg-muted cursor-pointer rounded-lg flex justify-between items-center transition-colors group border border-transparent hover:border-border" onClick={() => handleSelectMaster(m)}>
                            <div><div className="font-semibold text-sm">{m.brand} {m.model}</div><div className="text-xs text-muted-foreground">{m.size}</div></div>
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Select</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <DialogPrimitive.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                      <h2 className="text-lg font-semibold leading-none tracking-tight">Add Tire to Inventory</h2>
                      <p className="text-sm text-muted-foreground">Search our Master Catalog to add products quickly.</p>
                      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogPrimitive.Close>
                    </div>

                    {/* Content */}
                    <div className="space-y-4 pt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search (Brand, Model, Size)" value={masterSearchQuery} onChange={e => setMasterSearchQuery(e.target.value)} className="pl-9" autoFocus />
                      </div>
                      <div className="text-xs text-muted-foreground px-1 flex justify-between">
                        <span>{isSearchingMaster ? "Searching..." : masterSearchQuery ? `Found ${masterResults.length} matches` : "Type to search..."}</span>
                        {masterResults.length === 0 && !isSearchingMaster && masterSearchQuery && (
                          <span className="text-orange-500 cursor-pointer hover:underline" onClick={() => setIsRequestDialogOpen(true)}>Not found? Request new</span>
                        )}
                      </div>
                      <ScrollArea className="h-[300px] border rounded-md p-1 bg-muted/10">
                        {masterResults.length === 0 && !isSearchingMaster ? (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 p-4 text-center">
                            <p className="text-sm">Product not found?</p>
                            <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(true)} className="border-dashed">
                              <FileText className="w-4 h-4 mr-2" /> Request New Product
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {masterResults.map(m => (
                              <div key={m.id} className="p-3 hover:bg-muted cursor-pointer rounded-lg flex justify-between items-center transition-colors group border border-transparent hover:border-border" onClick={() => handleSelectMaster(m)}>
                                <div><div className="font-semibold text-sm">{m.brand} {m.model}</div><div className="text-xs text-muted-foreground">{m.size}</div></div>
                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">Select</Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </motion.div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          )
        )}
      </AnimatePresence>

      {/* 2. Request Dialog (Styled similarly) */}
      <AnimatePresence>
        {isRequestDialogOpen && (
          isMobile ? (
            <Drawer open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
              {/* Keep Mobile Drawer */}
              <DrawerContent>
                <DrawerHeader className="text-left">
                  <DrawerTitle>Request New Product</DrawerTitle>
                  <DrawerDescription>Send a request to the moderator to add this product.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pt-0 space-y-4">
                  <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm border border-orange-200">
                    Product not in Master Catalog? Use this form to request it.
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Details</label>
                    <Textarea placeholder="E.g. Michelin Pilot Sport 5 225/45R17 (New 2024 model)" value={requestNote} onChange={e => setRequestNote(e.target.value)} rows={4} autoFocus />
                  </div>
                  <Button onClick={handleSendRequest} disabled={!requestNote.trim()} className="w-full"><Send className="w-4 h-4 mr-2" /> Send Request</Button>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <DialogPrimitive.Root open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
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
                      <p className="text-sm text-muted-foreground">Send a request to the moderator to add this product.</p>
                      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogPrimitive.Close>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-orange-50 text-orange-800 p-3 rounded-lg text-sm border border-orange-200">
                        Product not in Master Catalog? Use this form to request it.
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Product Details</label>
                        <Textarea placeholder="E.g. Michelin Pilot Sport 5 225/45R17 (New 2024 model)" value={requestNote} onChange={e => setRequestNote(e.target.value)} rows={4} autoFocus />
                      </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                      <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSendRequest} disabled={!requestNote.trim()}><Send className="w-4 h-4 mr-2" /> Send Request</Button>
                    </div>
                  </motion.div>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
          )
        )}
      </AnimatePresence>

      {/* 3. ✅ Edit Tire Dialog (ใส่เพิ่มเข้ามาท้ายสุด) */}
      <EditTireDialog
        tire={editingTire}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={fetchTires}
      />

    </AppLayout>
  );
}