import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBroadcast } from "@/hooks/useBroadcast";
import { BroadcastRequest } from "@/types/broadcast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";
import { Megaphone, Search, Package, X, HandCoins, Loader2, Filter } from "lucide-react";

// Components
import { CreateRequestDialog } from "./CreateRequestDialog";
import { ViewOffersDialog } from "./ViewOffersDialog";

export function BroadcastBoard() {
  const { fetchRequests, fetchMyRequests, submitOffer } = useBroadcast();
  const [feed, setFeed] = useState<BroadcastRequest[]>([]);
  const [myRequests, setMyRequests] = useState<BroadcastRequest[]>([]);
  const [filter, setFilter] = useState("");
  
  // State สำหรับเปิดดูข้อเสนอ (View Offers)
  const [selectedRequestForView, setSelectedRequestForView] = useState<string | null>(null);

  const loadData = async () => {
    const [feedData, myData] = await Promise.all([fetchRequests(), fetchMyRequests()]);
    setFeed(feedData || []);
    setMyRequests(myData || []);
  };

  useEffect(() => { loadData(); }, []);

  // Filter Logic: กรองข้อมูลใน Feed
  const filteredFeed = feed.filter(r => 
    r.title.toLowerCase().includes(filter.toLowerCase()) || 
    r.tire_width?.includes(filter) ||
    r.tire_diameter?.includes(filter) ||
    (r as any).brand?.toLowerCase().includes(filter.toLowerCase()) // ถ้ามี field brand
  );

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <Megaphone className="w-6 h-6 text-primary" />
            Broadcast Center
          </h2>
          <p className="text-muted-foreground">Find or sell tires within the partner network.</p>
        </div>
        <CreateRequestDialog onPosted={loadData} />
      </div>

      {/* --- Main Tabs --- */}
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="feed">Community Feed</TabsTrigger>
          <TabsTrigger value="my_requests">My Requests ({myRequests.length})</TabsTrigger>
        </TabsList>

        {/* ============ TAB 1: COMMUNITY FEED ============ */}
        <TabsContent value="feed" className="space-y-4">
          <div className="relative max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input 
               placeholder="Filter by size, brand (e.g. 215, Michelin)..." 
               value={filter} 
               onChange={e => setFilter(e.target.value)} 
               className="pl-10 bg-card"
             />
          </div>
          
          {filteredFeed.length === 0 ? (
             <Card className="border-dashed bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Package className="w-10 h-10 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="font-semibold text-lg">No active requests found</h3>
                  <p className="text-muted-foreground text-sm mt-1">Try adjusting your filter or check back later.</p>
                </CardContent>
             </Card>
          ) : (
             <div className="grid gap-4">
               {filteredFeed.map((req) => (
                  <RequestCard 
                    key={req.id} 
                    req={req} 
                    onSubmitOffer={async (id, data) => {
                        await submitOffer(id, data);
                        loadData();
                    }} 
                  />
               ))}
             </div>
          )}
        </TabsContent>

        {/* ============ TAB 2: MY REQUESTS ============ */}
        <TabsContent value="my_requests" className="space-y-4">
           {myRequests.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">You haven't posted any requests yet.</p>
                <Button variant="link" onClick={() => document.querySelector<HTMLElement>('[data-state="closed"]')?.click()}>
                  Post your first request
                </Button>
              </div>
           ) : (
             myRequests.map((req) => (
              <Card key={req.id} className="overflow-hidden border hover:border-primary/30 transition-all">
                <CardContent className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-5">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">{req.title}</h3>
                        <Badge variant={req.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                          {req.status}
                        </Badge>
                     </div>
                     <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <span>Posted: {new Date(req.created_at).toLocaleDateString()}</span>
                        <span>Qty: {req.quantity}</span>
                        {req.urgency_level === 'urgent' && <span className="text-red-500 font-medium">Urgent</span>}
                     </div>
                  </div>

                  <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                     <div className="text-right px-2">
                       <div className="text-2xl font-bold text-primary leading-none">
                         {req.offer_count || 0}
                       </div>
                       <div className="text-[10px] text-muted-foreground uppercase font-medium mt-1">Offers</div>
                     </div>
                     
                     <Button 
                        variant="outline" 
                        size="sm"
                        className="h-9 hover:bg-background hover:text-primary transition-colors"
                        onClick={() => setSelectedRequestForView(req.id)}
                        disabled={!req.offer_count || req.offer_count === 0}
                     >
                        View Offers
                     </Button>
                  </div>
                </CardContent>
              </Card>
             ))
           )}
        </TabsContent>
      </Tabs>

      {/* Dialog: View Offers (แยกออกมาเพื่อ Performance) */}
      <ViewOffersDialog 
        open={!!selectedRequestForView} 
        requestId={selectedRequestForView}
        onOpenChange={(open) => !open && setSelectedRequestForView(null)}
      />
    </div>
  );
}

// =========================================================================
// Sub-component: Request Card (Item ใน Feed พร้อมปุ่ม Offer แบบเด้งดึ๋ง)
// =========================================================================
function RequestCard({ req, onSubmitOffer }: { req: BroadcastRequest, onSubmitOffer: (id: string, data: any) => Promise<void> }) {
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!price) return;
        setIsSubmitting(true);
        try {
            await onSubmitOffer(req.id, { price, dot: "", notes });
            setOpen(false);
            setPrice(""); 
            setNotes("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="hover:shadow-lg transition-all duration-300 group border-border/60 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-5">
                {/* Left: Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        {req.urgency_level === 'urgent' && (
                            <Badge variant="destructive" className="animate-pulse shadow-sm">URGENT</Badge>
                        )}
                        <h3 className="font-semibold text-lg text-foreground tracking-tight">{req.title}</h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                      <span className="font-medium flex items-center gap-1.5 text-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md">
                         Store: {req.stores?.name}
                      </span>
                      <span>•</span>
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-normal bg-background/50">Qty: {req.quantity}</Badge>
                      {req.tire_width && <Badge variant="outline" className="font-normal bg-background/50">W: {req.tire_width}</Badge>}
                      {req.tire_diameter && <Badge variant="outline" className="font-normal bg-background/50">R: {req.tire_diameter}</Badge>}
                    </div>
                    
                    {req.notes && (
                        <div className="mt-3 text-sm text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/30">
                            <span className="font-medium text-xs uppercase tracking-wide opacity-70 block mb-0.5">Note:</span> 
                            {req.notes}
                        </div>
                    )}
                </div>
                
                {/* Right: Action */}
                <div className="flex items-center justify-end md:justify-center md:border-l md:pl-6 border-border/50">
                  <Dialog open={open} onOpenChange={setOpen}>
                      <DialogTrigger asChild>
                          <Button className="w-full md:w-auto gap-2 bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:text-primary hover:border-primary/30 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-sm transition-all group-hover:scale-105">
                             <HandCoins className="w-4 h-4" />
                             Offer Help
                          </Button>
                      </DialogTrigger>
                      
                      {/* 🔥 Spring Animation Dialog (แบบเด้งดึ๋ง) */}
                      <DialogContent className="
                        sm:max-w-[420px] p-0 
                        bg-transparent border-none shadow-none 
                        !animate-none !transition-none 
                        data-[state=open]:!animate-none data-[state=closed]:!animate-none 
                        [&>button]:hidden overflow-visible
                      ">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 450, 
                                damping: 25, 
                                mass: 0.6 
                            }}
                            className="bg-background p-6 rounded-2xl shadow-2xl border relative overflow-hidden"
                          >
                              {/* Close Button */}
                              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 bg-muted/50 opacity-70 transition-all hover:opacity-100 hover:bg-muted focus:outline-none">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                              </DialogPrimitive.Close>

                              <DialogHeader className="mb-6">
                                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-3">
                                    <HandCoins className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <DialogTitle className="text-xl font-bold">Send Offer</DialogTitle>
                                  <p className="text-sm text-muted-foreground mt-1">
                                      Offering to <span className="font-semibold text-foreground">{req.stores?.name}</span>
                                  </p>
                              </DialogHeader>

                              <div className="space-y-5">
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Your Price (Per Unit)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">฿</span>
                                        <Input 
                                            type="number" 
                                            value={price} 
                                            onChange={e => setPrice(e.target.value)} 
                                            placeholder="0.00" 
                                            className="pl-8 h-12 text-lg font-medium bg-muted/30 focus:bg-background border-transparent focus:border-primary transition-all"
                                            autoFocus
                                        />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Details / Condition</Label>
                                    <Input 
                                        value={notes} 
                                        onChange={e => setNotes(e.target.value)} 
                                        placeholder="e.g. DOT 23, New condition, Ready to ship"
                                        className="h-11 bg-muted/30 focus:bg-background border-transparent focus:border-primary transition-all" 
                                    />
                                  </div>

                                  <Button 
                                    onClick={handleSubmit} 
                                    className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98] transition-all" 
                                    disabled={!price || isSubmitting}
                                  >
                                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Offer Now"}
                                  </Button>
                              </div>
                          </motion.div>
                      </DialogContent>
                  </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}