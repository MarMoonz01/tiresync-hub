import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RequestItem {
  id: string;
  brand: string;
  model: string;
  size: string;
  note: string;
  status: string;
  user_id: string;
  created_at: string;
}

export function MasterRequestList() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form State สำหรับแก้ไขก่อน Approve
  const [formData, setFormData] = useState({ brand: "", model: "", size: "" });

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('master_tire_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleOpenApprove = (req: RequestItem) => {
    setSelectedReq(req);
    setFormData({ brand: req.brand, model: req.model, size: req.size });
    setIsDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReq) return;
    try {
      const { data, error } = await supabase.rpc('approve_master_tire_request', {
        _request_id: selectedReq.id,
        _brand: formData.brand,
        _model: formData.model,
        _size: formData.size,
      });

      if (error) throw error;

      toast({ title: "Approved", description: "Added to Master Catalog successfully." });
      setIsDialogOpen(false);
      fetchRequests();

    } catch (error: any) {
      const message = error?.message?.includes('already processed')
        ? "This request was already processed."
        : error?.message?.includes('unique constraint')
        ? "This tire already exists in the Master Catalog."
        : "Failed to approve.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this request?")) return;
    try {
      const { error } = await supabase.from('master_tire_requests').update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      toast({ title: "Rejected", description: "Request has been rejected." });
      fetchRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">No pending requests</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested Data</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div className="font-medium">{req.brand} {req.model}</div>
                    <div className="text-sm text-muted-foreground">{req.size}</div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{req.note || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleReject(req.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleOpenApprove(req)}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Approve Dialog (ให้ Moderator แก้ไขคำผิดก่อน Save ได้) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Add to Catalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm flex gap-2">
               <AlertCircle className="w-5 h-5 shrink-0" />
               Review the data before adding to Master Catalog. Correct any typos from user.
             </div>
             <div className="grid gap-2">
               <Label>Brand</Label>
               <Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
             </div>
             <div className="grid gap-2">
               <Label>Model</Label>
               <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
             </div>
             <div className="grid gap-2">
               <Label>Size</Label>
               <Input value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Confirm & Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}