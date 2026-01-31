import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Check, X, Loader2, Store, UserMinus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/layout/AppLayout";
import { StoreCard } from "@/components/network/StoreCard";
import { StockComparisonDialog } from "@/components/network/StockComparisonDialog";
import { PartnerRequestDialog } from "@/components/network/PartnerRequestDialog";
import { StoreDetailsDialog } from "@/components/network/StoreDetailsDialog";
import { useNetworkStores } from "@/hooks/useNetworkStores";
import { usePartnerships } from "@/hooks/usePartnerships";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Network() {
  const { store: myStore } = useAuth();
  const { stores: allStores, loading: allStoresLoading, setSearchQuery } = useNetworkStores();
  const { 
    partners, 
    requests, 
    loading: partnersLoading, 
    sendRequest, 
    respondToRequest,
    removePartnership 
  } = usePartnerships();
  
  const [searchParams] = useSearchParams();
  
  // ✅ 1. เพิ่ม state เพื่อบอกว่า "คำนวณแท็บเสร็จแล้วนะ"
  const [isTabInitialized, setIsTabInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState("discover");
  
  const [localSearch, setLocalSearch] = useState("");
  
  // States for Dialogs
  const [comparePartner, setComparePartner] = useState<any>(null);
  const [selectedRequestStore, setSelectedRequestStore] = useState<any>(null);
  const [viewStore, setViewStore] = useState<any>(null);

  // State สำหรับ Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'cancel_request' | 'disconnect_partner';
    id: string;
    name: string;
  }>({ open: false, type: 'cancel_request', id: '', name: '' });

  // ✅ 2. LOGIC ใหม่: รอ partnersLoading เสร็จก่อน แล้วค่อยเลือกแท็บทีเดียว
  useEffect(() => {
    // ถ้าข้อมูลยังโหลดไม่เสร็จ หรือเคย initialize ไปแล้ว ให้หยุด
    if (partnersLoading || isTabInitialized) return;

    const tabParam = searchParams.get('tab');
    
    if (tabParam && (tabParam === 'discover' || tabParam === 'partners' || tabParam === 'requests')) {
      // กรณี URL บังคับมา
      setActiveTab(tabParam);
    } else if (partners.length > 0) {
      // กรณีมี Partners -> ไปหน้า Partners
      setActiveTab('partners');
    } else {
      // กรณีไม่มี Partners -> ไปหน้า Discover (Default)
      setActiveTab('discover');
    }

    // บอกว่าพร้อมแสดงผลแล้ว
    setIsTabInitialized(true);
  }, [partners, partnersLoading, searchParams, isTabInitialized]);

  const debouncedSearch = useDebouncedValue(localSearch, 400);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // ✅ 3. ถ้ายังคำนวณแท็บไม่เสร็จ ให้แสดง Loading กลางจอ (ป้องกันการกระพริบสลับแท็บ)
  if (partnersLoading || !isTabInitialized) {
    return (
      <AppLayout>
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse text-sm">Loading network...</p>
        </div>
      </AppLayout>
    );
  }

  // --- Logic เดิม ---
  const incomingRequests = requests.filter(r => r.receiver_store_id === myStore?.id);
  const outgoingRequests = requests.filter(r => r.requester_store_id === myStore?.id);

  const availableStores = allStores.filter(s => {
    const isSelf = s.id === myStore?.id;
    const isPartner = partners.some(p => p.id === s.id);
    const hasRequest = requests.some(r => 
      (r.receiver_store_id === s.id || r.requester_store_id === s.id)
    );
    return !isSelf && !isPartner && !hasRequest;
  });

  const handleSendRequest = async (storeId: string) => {
    await sendRequest(storeId);
    setSelectedRequestStore(null);
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.id) {
      await removePartnership(confirmDialog.id);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Partner Network</h1>
              <p className="text-muted-foreground mt-1">
                Connect with trusted tire businesses to expand your reach
              </p>
            </div>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <motion.div variants={itemVariants}>
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
                <TabsTrigger value="discover">Discover</TabsTrigger>
                <TabsTrigger value="partners">
                  My Partners
                  {partners.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{partners.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {incomingRequests.length > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{incomingRequests.length}</Badge>}
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Search Bar */}
            {activeTab !== 'requests' && (
              <motion.div variants={itemVariants} className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'partners' ? "Search your partners..." : "Search stores..."}
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </motion.div>
            )}

            {/* --- TAB: DISCOVER --- */}
            <TabsContent value="discover" className="mt-0 space-y-4">
              {allStoresLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : availableStores.length === 0 ? (
                <motion.div variants={itemVariants}>
                  <Card className="glass-card">
                    <CardContent className="py-16 text-center">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto">
                        <Users className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">{debouncedSearch ? "No stores found" : "No new stores available"}</h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        {debouncedSearch ? "Try adjusting your search terms." : "You've connected with all available stores."}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableStores.map((store) => (
                    <div 
                      key={store.id} 
                      className="cursor-pointer transition-transform hover:scale-[1.01]"
                      onClick={() => setSelectedRequestStore(store)}
                    >
                      <StoreCard store={store} />
                    </div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            {/* --- TAB: MY PARTNERS --- */}
            <TabsContent value="partners" className="mt-0 space-y-4">
              {partners.length === 0 ? (
                <motion.div variants={itemVariants}>
                  <Card className="glass-card">
                    <CardContent className="py-16 text-center">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6 mx-auto">
                        <Store className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">No Partners Yet</h2>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">Connect with other stores to compare stock.</p>
                      <Button onClick={() => setActiveTab('discover')}>Find Partners</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partners
                    .filter(p => p.name.toLowerCase().includes(localSearch.toLowerCase()))
                    .map((partner) => (
                    <div key={partner.id} className="relative group h-full">
                      <StoreCard 
                        store={partner} 
                        onCompare={() => setComparePartner(partner)} 
                        onClick={() => setViewStore(partner)}
                      />
                      
                      {/* Disconnect Button */}
                      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <Button 
                           variant="secondary" 
                           size="icon" 
                           className="h-8 w-8 rounded-full shadow-md bg-white/90 hover:bg-destructive/10 hover:text-destructive border border-border/50 backdrop-blur-sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             setConfirmDialog({ 
                               open: true, 
                               type: 'disconnect_partner', 
                               id: partner.partnershipId, 
                               name: partner.name 
                             });
                           }}
                           title="Disconnect Partner"
                         >
                           <UserMinus className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </TabsContent>

            {/* --- TAB: REQUESTS --- */}
            <TabsContent value="requests" className="mt-0 space-y-8">
              {/* Incoming */}
              <motion.div variants={itemVariants}>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                  Incoming Requests {incomingRequests.length > 0 && <Badge variant="secondary">{incomingRequests.length}</Badge>}
                </h3>
                {incomingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No incoming requests.</p>
                ) : (
                  <div className="grid gap-3 max-w-2xl">
                    {incomingRequests.map(req => (
                      <Card key={req.id} className="overflow-hidden">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                              {req.requester?.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{req.requester?.name}</div>
                              <div className="text-xs text-muted-foreground">Wants to be your partner</div>
                              <div className="text-[10px] text-muted-foreground mt-1">{new Date(req.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={() => respondToRequest(req.id, 'rejected')}>
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white" onClick={() => respondToRequest(req.id, 'approved')}>
                              <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Outgoing */}
              <motion.div variants={itemVariants}>
                <h3 className="font-semibold mb-4 text-muted-foreground pt-4 border-t border-border/40">Sent Requests</h3>
                {outgoingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No pending sent requests.</p>
                ) : (
                  <div className="grid gap-3 max-w-2xl opacity-90">
                    {outgoingRequests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                              {req.receiver?.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{req.receiver?.name}</div>
                              <div className="text-xs text-muted-foreground">Waiting for approval...</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-muted/50">Pending</Badge>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-muted-foreground hover:text-destructive h-8 px-2"
                              onClick={() => setConfirmDialog({
                                open: true,
                                type: 'cancel_request',
                                id: req.id,
                                name: req.receiver?.name || 'Store'
                              })}
                            >
                              <span className="sr-only">Cancel</span>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Confirm Dialog */}
          <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmDialog.type === 'cancel_request' ? "Cancel Request?" : "Remove Partner?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmDialog.type === 'cancel_request' 
                    ? `Are you sure you want to cancel the partnership request to ${confirmDialog.name}?`
                    : `Are you sure you want to disconnect from ${confirmDialog.name}? You will no longer see their stock.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmAction} 
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  {confirmDialog.type === 'cancel_request' ? "Yes, Cancel Request" : "Yes, Disconnect"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* --- DIALOGS SECTION --- */}
          
          <PartnerRequestDialog 
            store={selectedRequestStore}
            open={!!selectedRequestStore}
            onOpenChange={(open) => !open && setSelectedRequestStore(null)}
            onSendRequest={handleSendRequest}
            loading={partnersLoading}
          />
          
          <StockComparisonDialog 
            open={!!comparePartner} 
            partner={comparePartner} 
            onOpenChange={(open) => !open && setComparePartner(null)} 
          />

          <StoreDetailsDialog 
            store={viewStore}
            open={!!viewStore}
            onOpenChange={(open) => !open && setViewStore(null)}
          />

        </motion.div>
      </div>
    </AppLayout>
  );
}