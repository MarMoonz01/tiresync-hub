import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, 
  Search, 
  ShoppingBag, 
  ArrowLeft, 
  Loader2, 
  MapPin, 
  Phone,
  Eye,
  PackageX,
  Gauge,
  Layers,
  ArrowRight,
  Disc 
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"; // <--- Import Pagination Components
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// --- Hooks ---
import { useMarketplaceProducts, MarketplaceProduct } from "@/hooks/useMarketplaceProducts";

// --- Components ---
import { StoreProductDetailDialog } from "@/components/marketplace/ProductDetailDialog";
import { BroadcastBoard } from "@/components/marketplace/BroadcastBoard";
import { ProductGroupDialog } from "@/components/marketplace/ProductGroupDialog";

// ... (MarketplaceStoreCard component code - keep unchanged) ...
const MarketplaceStoreCard = ({ store, onClick }: { store: any, onClick: () => void }) => {
  const initials = store.name.substring(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        y: -5, 
        scale: 1.02,
        transition: { type: "spring", stiffness: 400, damping: 10 } 
      }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer group h-full"
      onClick={onClick}
    >
      <Card className="h-full overflow-hidden border-border/50 hover:shadow-xl transition-all duration-300 bg-card">
        <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
            <div className="absolute -bottom-8 left-6">
                <div className="h-16 w-16 rounded-xl border-4 border-background bg-white shadow-sm overflow-hidden">
                    <Avatar className="h-full w-full rounded-lg">
                        <AvatarImage src={store.logo_url} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </div>
        <CardContent className="pt-10 pb-6 px-6">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {store.name}
                </h3>
                {store.is_active && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]">
                        Verified
                    </Badge>
                )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                {store.description || "Professional tire service provider."}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{store.address || "Location not specified"}</span>
            </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ... (ProductItemCard component code - keep unchanged) ...
const ProductItemCard = ({ product, onClick }: { product: any, onClick: () => void }) => {
    const totalStock = product.tire_dots?.reduce((sum: number, dot: any) => sum + dot.quantity, 0) || 0;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 400, damping: 10 }
            }}
            whileTap={{ scale: 0.95 }}
            className="cursor-pointer group h-full"
            onClick={onClick}
        >
            <Card className="h-full border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col bg-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl -mr-4 -mt-4 transition-all group-hover:from-primary/10" />

                <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <Badge variant="outline" className="font-semibold bg-background/50 backdrop-blur-sm">
                            {product.brand}
                        </Badge>
                        <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${totalStock > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {totalStock > 0 ? `${totalStock} Stock` : 'Out'}
                        </div>
                    </div>

                    <div className="mb-4 relative z-10">
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-tight mb-2">
                            {product.size}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                           {product.model || "Standard Model"}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                             {product.load_index && product.speed_rating && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                    <Gauge className="w-3 h-3" />
                                    {product.load_index}{product.speed_rating}
                                </div>
                             )}
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-border/50 flex justify-between items-end relative z-10">
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Network Price</p>
                            <span className="text-lg font-bold text-primary">
                                {product.network_price ? `฿${product.network_price.toLocaleString()}` : "N/A"}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full">
                            <Eye className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

// ... (AggregatedProductCard component code - keep unchanged) ...
const AggregatedProductCard = ({ product, onClick }: { product: MarketplaceProduct, onClick: () => void }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ 
                y: -8, 
                scale: 1.02,
                transition: { type: "spring", stiffness: 350, damping: 25 }
            }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="cursor-pointer h-full"
            onClick={onClick}
        >
            <Card className="h-full border-border/40 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card flex flex-col overflow-hidden group rounded-2xl">
                <div className="h-32 bg-slate-50 dark:bg-slate-900/50 relative flex items-center justify-center group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50 transition-colors">
                    <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-white/90 text-slate-700 hover:bg-white shadow-sm backdrop-blur-sm border-slate-200 dark:bg-black/50 dark:text-slate-200 dark:border-slate-700">
                             {product.brand}
                        </Badge>
                    </div>
                    
                    <motion.div 
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                    >
                         <Disc className="w-16 h-16 text-slate-300 dark:text-slate-600 group-hover:text-primary/40 transition-colors" />
                    </motion.div>

                    <div className="absolute bottom-2 left-3 flex gap-1">
                        {product.storeCount > 1 && (
                            <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                {product.storeCount} Stores
                            </Badge>
                        )}
                    </div>
                </div>

                <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="mb-3">
                        <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors leading-tight">
                            {product.size}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                {product.model || "Various Models"}
                             </span>
                             {(product.load_index || product.speed_rating) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                   {product.load_index}{product.speed_rating}
                                </span>
                             )}
                        </div>
                    </div>

                    <div className="mt-auto pt-3 flex items-end justify-between border-t border-dashed border-slate-200 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Best Price</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                                    ฿{product.minPrice?.toLocaleString()}
                                </span>
                                {product.maxPrice && product.maxPrice > product.minPrice! && (
                                    <span className="text-xs text-muted-foreground line-through">
                                        ฿{product.maxPrice?.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button size="icon" className="h-9 w-9 rounded-full bg-primary text-white shadow-md shadow-primary/20 group-hover:scale-110 transition-transform">
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ==========================================
// 4. MAIN PAGE: Marketplace
// ==========================================

export default function Marketplace() {
  // --- State 1: Product-Centric View (Default) ---
  const { 
    products: aggregatedProducts, 
    loading: loadingAggregated, 
    searchQuery: productSearch, 
    setSearchQuery: setProductSearch,
    refetch: refetchProducts,
    page, // <--- รับค่า page มา
    totalPages, // <--- รับค่า totalPages มา
    goToPage // <--- รับฟังก์ชันเปลี่ยนหน้ามา
  } = useMarketplaceProducts();
  
  const [selectedGroupProduct, setSelectedGroupProduct] = useState<MarketplaceProduct | null>(null);

  // --- State 2: Store-Centric View ---
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const debouncedStoreSearch = useDebouncedValue(storeSearchQuery, 400);
  
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [loadingStoreProducts, setLoadingStoreProducts] = useState(false);
  
  const [selectedStoreProduct, setSelectedStoreProduct] = useState<any>(null);

  // ... (Effects for fetching stores - keep unchanged) ...
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let myStoreId = null;

        if (user) {
            const { data: myStore } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user.id)
                .single();
            if (myStore) {
                myStoreId = myStore.id;
            } else {
                const { data: staffStore } = await supabase
                    .from('store_members')
                    .select('store_id')
                    .eq('user_id', user.id)
                    .eq('is_approved', true)
                    .single();
                if (staffStore) myStoreId = staffStore.store_id;
            }
        }

        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .order('name');
          
        if (error) throw error;
        const otherStores = data ? data.filter(store => store.id !== myStoreId) : [];
        setStores(otherStores);

      } catch (err) {
        console.error("Error fetching marketplace stores:", err);
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  }, []);

  // ... (Effects for fetching store products - keep unchanged) ...
  useEffect(() => {
    if (!selectedStore) {
        setStoreProducts([]);
        return;
    }

    const fetchStoreProducts = async () => {
        setLoadingStoreProducts(true);
        try {
            const { data, error } = await supabase
                .from('tires')
                .select(`*, tire_dots (id, quantity, dot_code)`)
                .eq('store_id', selectedStore.id)
                .eq('is_shared', true); 

            if (error) throw error;
            setStoreProducts(data || []);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setLoadingStoreProducts(false);
        }
    };

    fetchStoreProducts();
  }, [selectedStore]);

  // --- Filter Logic ---
  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(debouncedStoreSearch.toLowerCase())
  );

  const filteredStoreProducts = storeProducts.filter(p => {
    const fullName = `${p.brand} ${p.model || ''} ${p.size}`.toLowerCase();
    return fullName.includes(debouncedStoreSearch.toLowerCase());
  });

  // --- Handlers ---
  const handleStoreSelect = (store: any) => {
    setStoreSearchQuery(""); 
    setSelectedStore(store);
  };

  const handleBackToStores = () => {
    setStoreSearchQuery("");
    setSelectedStore(null);
  };

  return (
    <AppLayout>
      <div className="page-container space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <Tabs defaultValue="products" className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <TabsList className="grid w-full sm:w-[450px] grid-cols-3">
                    <TabsTrigger value="products">All Products</TabsTrigger>
                    <TabsTrigger value="stores">Browse Stores</TabsTrigger>
                    <TabsTrigger value="broadcast">Broadcast 📢</TabsTrigger>
                </TabsList>
            </div>

            {/* ============ TAB 1: ALL PRODUCTS ============ */}
            <TabsContent value="products" className="mt-0 space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Header & Search */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <ShoppingBag className="w-6 h-6 text-primary" />
                                Marketplace Inventory
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                Search for tires across {aggregatedProducts.length > 0 ? aggregatedProducts.length : 'all'} grouped items.
                            </p>
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search Brand, Size (e.g. 265/60)..." 
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-10 h-11 bg-background"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    {loadingAggregated ? (
                        <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
                    ) : aggregatedProducts.length === 0 ? (
                        <div className="text-center py-32 border-2 border-dashed rounded-xl bg-slate-50/50">
                            <PackageX className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground font-medium">No products match your search.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {aggregatedProducts.map((product) => (
                                    <AggregatedProductCard 
                                        key={product.productKey} 
                                        product={product} 
                                        onClick={() => setSelectedGroupProduct(product)}
                                    />
                                ))}
                            </div>

                            {/* --- Pagination UI --- */}
                            {totalPages > 1 && (
                                <div className="mt-8 flex justify-center">
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious 
                                                    href="#" 
                                                    onClick={(e) => { e.preventDefault(); if(page > 1) goToPage(page - 1); }}
                                                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                            
                                            <PaginationItem>
                                                <PaginationLink href="#" isActive className="cursor-default">
                                                    Page {page} of {totalPages}
                                                </PaginationLink>
                                            </PaginationItem>

                                            <PaginationItem>
                                                <PaginationNext 
                                                    href="#" 
                                                    onClick={(e) => { e.preventDefault(); if(page < totalPages) goToPage(page + 1); }}
                                                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </TabsContent>

            {/* ============ TAB 2: BROWSE STORES ============ */}
            <TabsContent value="stores" className="mt-0">
               {/* ... (Browse Stores content - keep unchanged) ... */}
                <AnimatePresence mode="wait">
                  {!selectedStore ? (
                    <motion.div
                      key="directory"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Store className="w-6 h-6 text-primary" />
                            Store Directory
                          </h1>
                          <p className="text-muted-foreground mt-1">
                            Browse verified tire shops directly.
                          </p>
                        </div>
                        <div className="relative w-full md:w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search store name..."
                            value={storeSearchQuery}
                            onChange={(e) => setStoreSearchQuery(e.target.value)}
                            className="pl-10 h-11"
                          />
                        </div>
                      </div>
                      
                      {loadingStores ? (
                         <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
                      ) : filteredStores.length === 0 ? (
                        <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <Store className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold">No stores found</h3>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {filteredStores.map((store) => (
                            <MarketplaceStoreCard 
                                key={store.id} 
                                store={store} 
                                onClick={() => handleStoreSelect(store)} 
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="storefront"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-8"
                    >
                       <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden shadow-sm">
                          <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                             <Button 
                                variant="secondary" 
                                size="sm" 
                                className="absolute top-6 left-6 gap-2 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md"
                                onClick={handleBackToStores}
                             >
                                <ArrowLeft className="w-4 h-4" /> Back to Stores
                             </Button>
                          </div>
                          <div className="px-8 pb-8">
                              <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
                                  <div className="h-32 w-32 rounded-2xl border-[6px] border-background bg-white shadow-xl overflow-hidden shrink-0">
                                     <Avatar className="h-full w-full rounded-xl">
                                        <AvatarImage src={selectedStore.logo_url} className="object-cover" />
                                        <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                            {selectedStore.name.substring(0,2).toUpperCase()}
                                        </AvatarFallback>
                                     </Avatar>
                                  </div>
                                  <div className="flex-1 space-y-2 pt-2 md:pt-0 mb-2">
                                     <div className="flex flex-wrap items-center gap-3">
                                        <h1 className="text-3xl font-bold">{selectedStore.name}</h1>
                                        {selectedStore.is_active && (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Verified Seller</Badge>
                                        )}
                                     </div>
                                     <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {selectedStore.address || "No address"}</span>
                                        <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selectedStore.phone || "No phone"}</span>
                                     </div>
                                  </div>
                                  
                                  <div className="w-full md:w-auto mt-4 md:mt-0">
                                     <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                          placeholder={`Search in ${selectedStore.name}...`}
                                          value={storeSearchQuery}
                                          onChange={(e) => setStoreSearchQuery(e.target.value)}
                                          className="pl-10 w-full md:w-72"
                                        />
                                     </div>
                                  </div>
                              </div>
                          </div>
                       </div>

                       <div className="space-y-4">
                           <h2 className="text-xl font-semibold flex items-center gap-2">
                               <ShoppingBag className="w-5 h-5 text-primary" />
                               Shared Inventory
                               <Badge variant="secondary" className="ml-2">{filteredStoreProducts.length}</Badge>
                           </h2>

                           {loadingStoreProducts ? (
                               <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
                           ) : filteredStoreProducts.length === 0 ? (
                              <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                  <PackageX className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                                  <h3 className="text-xl font-semibold mb-1">No shared tires found</h3>
                              </div>
                           ) : (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
                              >
                                  {filteredStoreProducts.map((product) => (
                                        <ProductItemCard 
                                        key={product.id} 
                                        product={product} 
                                        onClick={() => setSelectedStoreProduct(product)} 
                                        />
                                  ))}
                              </motion.div>
                           )}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </TabsContent>

            {/* ============ TAB 3: BROADCAST BOARD ============ */}
            <TabsContent value="broadcast" className="mt-0">
                <BroadcastBoard />
            </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ProductGroupDialog
          product={selectedGroupProduct}
          open={!!selectedGroupProduct}
          onOpenChange={(open) => !open && setSelectedGroupProduct(null)}
        />

        <StoreProductDetailDialog
          product={selectedStoreProduct}
          open={!!selectedStoreProduct}
          onOpenChange={(open) => !open && setSelectedStoreProduct(null)}
        />
        
      </div>
    </AppLayout>
  );
}