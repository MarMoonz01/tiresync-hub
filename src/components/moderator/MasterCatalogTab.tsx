import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Pencil, Trash2, Loader2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
// ✅ เพิ่ม Imports สำหรับ Animation และ Dialog Primitive
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { formatTireSize } from "@/lib/utils";

// Define interfaces
interface MasterTire {
  id: string;
  brand: string;
  model: string;
  size: string;
  load_index?: string | null;
  speed_rating?: string | null;
  created_at: string;
}

// ✅ กำหนด Animation Variants (ใช้ชุดเดียวกับ Dialog อื่นๆ เพื่อความสม่ำเสมอ)
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%" },
  visible: {
    opacity: 1, scale: 1, x: "-50%", y: "-50%",
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.95, x: "-50%", y: "-40%", transition: { duration: 0.2 } },
};

export function MasterCatalogTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false); // เปลี่ยนชื่อ state ให้สื่อความหมาย
  const [editingItem, setEditingItem] = useState<MasterTire | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    brand: "", model: "", size: "", load_index: "", speed_rating: ""
  });

  // 1. Fetch Master Data
  const { data: masterTires, isLoading } = useQuery({
    queryKey: ['master-tires', searchTerm],
    queryFn: async () => {
      let query = supabase.from('master_tires').select('*').order('brand', { ascending: true });
      if (searchTerm) {
        const formattedSize = formatTireSize(searchTerm);
        let conditions = `brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%`;

        // ถ้าเป็นเลข 7 หลัก ให้หาแบบ Format ด้วย (เช่นหา 225/75R14 จาก 2257514)
        if (formattedSize) {
          conditions += `,size.ilike.%${formattedSize}%`;
        }

        query = query.or(conditions);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as MasterTire[];
    }
  });

  // 2. Mutations (Create/Update/Delete)
  const upsertMasterTire = useMutation({
    mutationFn: async (data: Omit<MasterTire, 'id' | 'created_at'> & { id?: string }) => {
      const { error } = await supabase.from('master_tires').upsert(data).select().single();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingItem ? "Updated successfully" : "Created successfully");
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['master-tires'] });
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    }
  });

  const deleteMasterTire = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('master_tires').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['master-tires'] });
    }
  });

  // 3. Delete ALL Mutation (✅ เพิ่มใหม่)
  const deleteAllMasterTires = useMutation({
    mutationFn: async () => {
      // ใช้เงื่อนไข id != '0000...' เพื่อลบทุก rows (Supabase ต้องมี WHERE clause สำหรับ delete)
      const { error } = await supabase.from('master_tires').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ล้างข้อมูล Master Catalog เรียบร้อยแล้ว");
      queryClient.invalidateQueries({ queryKey: ['master-tires'] });
      queryClient.invalidateQueries({ queryKey: ['master-tires-count'] }); // อัปเดตตัวเลขหน้า Dashboard
    },
    onError: (error) => {
      toast.error("ลบข้อมูลไม่สำเร็จ: " + error.message);
    }
  });

  // Handlers
  const handleOpenCreate = () => {
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: MasterTire) => {
    setEditingItem(item);
    setFormData({
      brand: item.brand,
      model: item.model,
      size: item.size,
      load_index: item.load_index || "",
      speed_rating: item.speed_rating || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.brand || !formData.model || !formData.size) {
      toast.error("Brand, Model, and Size are required.");
      return;
    }
    upsertMasterTire.mutate({
      id: editingItem?.id,
      brand: formData.brand,
      model: formData.model,
      size: formData.size,
      load_index: formData.load_index || null,
      speed_rating: formData.speed_rating || null
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item? This might affect existing inventory items tied to it.")) {
      deleteMasterTire.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({ brand: "", model: "", size: "", load_index: "", speed_rating: "" });
  };

  const handleExport = async () => {
    try {
      toast.info("Exporting data...");

      const { data, error } = await supabase
        .from('master_tires')
        .select('brand, model, size, load_index, speed_rating')
        .order('brand', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("No data to export");
        return;
      }

      // Map data to simpler format for Excel
      const rows = data.map(item => ({
        Brand: item.brand,
        Model: item.model,
        Size: item.size,
        LoadIndex: item.load_index,
        SpeedRating: item.speed_rating
      }));

      // Create Worksheet & Workbook
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MasterTires");

      // Save File
      XLSX.writeFile(wb, `Master_Catalog_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Export successful!");

    } catch (err: any) {
      console.error(err);
      toast.error("Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4 p-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brand, model, size..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button
            variant="destructive"
            variant="outline"
            className="text-destructive hover:bg-destructive hover:text-white border-destructive/50"
            onClick={() => {
              if (confirm("⚠️ อันตราย: คุณแน่ใจหรือไม่ว่าจะลบข้อมูลสินค้าทั้งหมดใน Master Catalog? \n\nการกระทำนี้ไม่สามารถย้อนกลับได้")) {
                if (confirm("ยืนยันครั้งสุดท้าย: ลบทั้งหมดจริงหรือไม่?")) {
                  deleteAllMasterTires.mutate();
                }
              }
            }}
            disabled={masterTires?.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete All
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add New Item
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-background/50 backdrop-blur-sm">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Specs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : masterTires?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No items found.</TableCell></TableRow>
              ) : (
                masterTires?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.brand}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell><Badge variant="outline">{item.size}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.load_index || '-'}/{item.speed_rating || '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* ✅ Custom Animated Dialog สำหรับ Create/Edit */}
      <AnimatePresence>
        {isDialogOpen && (
          <DialogPrimitive.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay asChild>
                <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="hidden" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild>
                <motion.div
                  variants={contentVariants} initial="hidden" animate="visible" exit="exit"
                  className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg gap-4 border bg-background p-0 shadow-lg duration-200 sm:rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-muted/30 p-6 pb-4 border-b relative">
                    <h2 className="text-lg font-bold tracking-tight">
                      {editingItem ? "Edit Master Item" : "Add New Master Item"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {editingItem ? "Update item details in the master catalog." : "Create a new standard tire entry."}
                    </p>
                    <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setIsDialogOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand <span className="text-red-500">*</span></Label>
                        <Input id="brand" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. Michelin" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model <span className="text-red-500">*</span></Label>
                        <Input id="model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. Pilot Sport 5" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="size">Size <span className="text-red-500">*</span></Label>
                      <Input id="size" value={formData.size} onChange={e => setFormData({ ...formData, size: e.target.value })} placeholder="e.g. 225/45R17" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="load_index">Load Index</Label>
                        <Input id="load_index" value={formData.load_index} onChange={e => setFormData({ ...formData, load_index: e.target.value })} placeholder="e.g. 91" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="speed_rating">Speed Rating</Label>
                        <Input id="speed_rating" value={formData.speed_rating} onChange={e => setFormData({ ...formData, speed_rating: e.target.value })} placeholder="e.g. V" />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 pt-2 border-t bg-background flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={upsertMasterTire.isPending}>
                      {upsertMasterTire.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        )}
      </AnimatePresence>
    </div>
  );
}