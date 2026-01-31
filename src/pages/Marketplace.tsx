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
  Layers
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// ✅ Import Component Dialog ที่แยกไฟล์ไว้
import { StoreProductDetailDialog } from "@/components/marketplace/ProductDetailDialog";

// ==========================================
// 1. Component: Marketplace Store Card
// ==========================================
const MarketplaceStoreCard = ({ store, onClick }: { store: any, onClick: () => void }) => {
  const initials = store.name.substring(0, 2).toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="cursor-pointer group h-full"
      onClick={onClick}
    >
      <Card className="h-full overflow-hidden border-border/50 hover:shadow-lg transition-all duration-300 bg-card">
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

// ==========================================
// 2. Component: Product Item Card (Optimized)
// ==========================================
const ProductItemCard = ({ product, onClick }: { product: any, onClick: () => void }) => {
    const totalStock = product.tire_dots?.reduce((sum: number, dot: any) => sum + dot.quantity, 0) || 0;
    
    return (
        <motion.div 
            // ✅ เปลี่ยน Animation เป็นแบบลอยขึ้น (y) แทน scale เพื่อความลื่นไหล
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ 
                y: -5, 
                transition: { type: "spring", stiffness: 400, damping: 10 } 
            }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer group h-full"
            onClick={onClick}
        >
            <Card className="h-full border-border/50 hover:border-primary/50 hover:shadow-md transition-colors duration-300 flex flex-col bg-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-3xl -mr-4 -mt-4 transition-all group-hover:from-primary/10" />

                <CardContent className="p-5 flex-1 flex flex-col">
                    {/* Header: Brand & Stock */}
                    <div className="flex justify-between items-start mb-3 relative z-10">
                        <Badge variant="outline" className="font-semibold bg-background/50 backdrop-blur-sm">
                            {product.brand}
                        </Badge>
                        <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${totalStock > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {totalStock > 0 ? `${totalStock} Stock` : 'Out'}
                        </div>
                    </div>

                    {/* Main Info */}
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
                             <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                <Layers className="w-3 h-3" />
                                {product.type || 'Radial'}
                             </div>
                        </div>
                    </div>
                    
                    {/* Footer: Price & Action */}
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

// ==========================================
// 3. MAIN PAGE: Marketplace
// ==========================================

export default function Marketplace() {
  // --- State ---
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 400);
  
  const [stores, setStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // --- Effect 1: Fetch Stores ---
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
            if (myStore) myStoreId = myStore.id;
        }

        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .order('name');
          
        if (error) throw error;

        // Filter out own store
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

  // --- Effect 2: Fetch Products ---
  useEffect(() => {
    if (!selectedStore) {
        setProducts([]);
        return;
    }

    const fetchStoreProducts = async () => {
        setLoadingProducts(true);
        try {
            console.log("Fetching tires for store:", selectedStore.id);
            
            const { data, error } = await supabase
                .from('tires')
                .select(`
                    *,
                    tire_dots (
                        id,
                        quantity,
                        dot_code
                    )
                `)
                .eq('store_id', selectedStore.id)
                .eq('is_shared', true); 

            if (error) throw error;
            
            console.log("Shared tires found:", data);
            setProducts(data || []);
        } catch (err) {
            console.error("Error fetching products:", err);
        } finally {
            setLoadingProducts(false);
        }
    };

    fetchStoreProducts();
  }, [selectedStore]);

  // --- Filter Logic ---
  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const filteredStoreProducts = products.filter(p => {
    const fullName = `${p.brand} ${p.model || ''} ${p.size}`.toLowerCase();
    return fullName.includes(debouncedSearch.toLowerCase());
  });

  // --- Handlers ---
  const handleStoreSelect = (store: any) => {
    setSearchQuery(""); 
    setSelectedStore(store);
  };

  const handleBack = () => {
    setSearchQuery("");
    setSelectedStore(null);
  };

  return (
    <AppLayout>
      <div className="page-container space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <AnimatePresence mode="wait">
          {!selectedStore ? (
            // ================= VIEW 1: STORE DIRECTORY =================
            <motion.div
              key="directory"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Store className="w-8 h-8 text-primary" />
                    Marketplace
                  </h1>
                  <p className="text-muted-foreground mt-2 text-lg">
                    Discover verified tire shops and suppliers.
                  </p>
                </div>
                
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Stores Grid */}
              {loadingStores ? (
                 <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Store className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No stores found</h3>
                    <p className="text-muted-foreground mt-2">Try adjusting your search terms.</p>
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
            // ================= VIEW 2: STOREFRONT (PRODUCTS) =================
            <motion.div
              key="storefront"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
               {/* Store Header Banner */}
               <div className="rounded-2xl bg-white dark:bg-card border border-border overflow-hidden shadow-sm">
                  <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                     <Button 
                        variant="secondary" 
                        size="sm" 
                        className="absolute top-6 left-6 gap-2 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md"
                        onClick={handleBack}
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
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="pl-10 w-full md:w-72"
                               />
                            </div>
                         </div>
                      </div>
                  </div>
               </div>

               {/* Products Grid */}
               <div className="space-y-4">
                   <h2 className="text-xl font-semibold flex items-center gap-2">
                       <ShoppingBag className="w-5 h-5 text-primary" />
                       Shared Inventory
                       <Badge variant="secondary" className="ml-2">{filteredStoreProducts.length}</Badge>
                   </h2>

                   {loadingProducts ? (
                       <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
                   ) : filteredStoreProducts.length === 0 ? (
                      <div className="text-center py-32 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <PackageX className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold mb-1">No shared tires found</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            {debouncedSearch 
                               ? `No matches for "${debouncedSearch}".` 
                               : "This store hasn't shared any tires to the network yet."}
                          </p>
                      </div>
                   ) : (
                      // ✅ เอา layout ออก และทำ Simple Fade In
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
                      >
                          {filteredStoreProducts.map((product) => (
                                <ProductItemCard 
                                key={product.id} 
                                product={product} 
                                onClick={() => setSelectedProduct(product)} 
                                />
                          ))}
                      </motion.div>
                   )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Detail Dialog */}
        <StoreProductDetailDialog
          product={selectedProduct}
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
        />
        
      </div>
    </AppLayout>
  );
}