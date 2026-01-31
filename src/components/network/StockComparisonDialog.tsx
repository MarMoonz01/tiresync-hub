import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRightLeft, Calendar, ChevronsUpDown, Check, Package, Loader2, Search, Store as StoreIcon, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// --- Motion Components ---
const MotionDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    asChild
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  </DialogPrimitive.Overlay>
));
MotionDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const MotionDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <MotionDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      asChild
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[95%] max-w-6xl h-[85vh] bg-background shadow-2xl sm:rounded-2xl overflow-hidden p-0 border border-border",
        className
      )}
      {...props}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
        animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
        exit={{ opacity: 0, scale: 0.95, y: "-45%", x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
MotionDialogContent.displayName = DialogPrimitive.Content.displayName;

// --- Interfaces ---
interface StockItem {
  id: string;
  brand: string;
  model: string;
  size: string;
  total_quantity: number;
  tire_dots?: { dot: string; quantity: number }[];
  dots?: { dot: string; quantity: number }[];
}

// --- Product Selector Component ---
const ProductSelector = ({ 
  items, 
  selected, 
  onSelect, 
  isOpen, 
  setIsOpen, 
  placeholder, 
  loading,
  themeAccent, // 'blue' | 'green' color class for text/borders
  searchValue,
  onSearchChange,
  theme
}: any) => {
  
  // สี Highlight ตอน Hover ใน Dropdown
  const highlightClass = theme === 'green' 
    ? "data-[selected=true]:bg-emerald-50 data-[selected=true]:text-emerald-900" 
    : "data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-900";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-full justify-between h-12 text-base shadow-sm transition-all bg-background hover:bg-accent/50",
            selected ? `border-${themeAccent}-500 ring-1 ring-${themeAccent}-500/20` : "border-input"
          )}
        >
          {selected ? (
            <span className="font-medium truncate flex items-center gap-2">
              <Package className={`w-4 h-4 text-${themeAccent}-500`} />
              {selected.brand} {selected.model} <span className="text-muted-foreground">- {selected.size}</span>
            </span>
          ) : (
            <span className="text-muted-foreground font-normal flex items-center gap-2">
              <Search className="w-4 h-4 opacity-50" /> {placeholder}
            </span>
          )}
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0" align="start">
        <Command shouldFilter={false}> 
          <CommandInput 
            placeholder="Search brand, model, or size (e.g., 1956515)..." 
            value={searchValue}
            onValueChange={onSearchChange}
            className="text-base"
          />
          <CommandList className="max-h-[300px] overflow-y-auto pretty-scrollbar">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching database...
              </div>
            ) : items.length === 0 ? (
              <CommandEmpty className="py-4 text-center text-muted-foreground">No stock found.</CommandEmpty>
            ) : (
              <CommandGroup heading="Available Stock">
                {items.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.brand} ${item.model} ${item.size}`}
                    onSelect={() => {
                      onSelect(item);
                      setIsOpen(false);
                    }}
                    className={cn("cursor-pointer py-3 px-4 m-1 rounded-md", highlightClass)}
                  >
                    <div className="flex items-center flex-1 gap-3">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-primary",
                          selected?.id === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.brand} {item.model}</span>
                        <span className="text-xs text-muted-foreground">{item.size}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2 font-mono">{item.total_quantity} units</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export function StockComparisonDialog({ partner, open, onOpenChange }: { partner: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { store } = useAuth();
  
  const [myItems, setMyItems] = useState<StockItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<StockItem[]>([]);
  
  const [mySearchInput, setMySearchInput] = useState("");
  const [partnerSearchInput, setPartnerSearchInput] = useState("");
  
  const debouncedMySearch = useDebouncedValue(mySearchInput, 500);
  const debouncedPartnerSearch = useDebouncedValue(partnerSearchInput, 500);

  const [selectedMyItem, setSelectedMyItem] = useState<StockItem | null>(null);
  const [selectedPartnerItem, setSelectedPartnerItem] = useState<StockItem | null>(null);
  
  const [openMySelect, setOpenMySelect] = useState(false);
  const [openPartnerSelect, setOpenPartnerSelect] = useState(false);

  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingPartner, setLoadingPartner] = useState(false);

  // 1. Fetch My Inventory
  useEffect(() => {
    if (!open || !store) return;
    
    const fetchMy = async () => {
      setLoadingMy(true);
      
      let query = supabase
        .from('tires')
        .select(`id, brand, model, size, price, tire_dots(dot_code, quantity)`)
        .eq('store_id', store.id);

      if (debouncedMySearch) {
        query = query.or(`brand.ilike.%${debouncedMySearch}%,model.ilike.%${debouncedMySearch}%,size.ilike.%${debouncedMySearch}%`);
      }

      const { data, error } = await query.order('brand', { ascending: true }).limit(50);
      
      if (error) console.error("Error fetching my items:", error);

      const formatted = data?.map((t: any) => ({
        ...t,
        tire_dots: t.tire_dots?.map((d: any) => ({ dot: d.dot_code, quantity: d.quantity })),
        total_quantity: t.tire_dots ? t.tire_dots.reduce((sum: number, d: any) => sum + d.quantity, 0) : 0
      })) || [];
      
      setMyItems(formatted);
      setLoadingMy(false);
    };

    fetchMy();
  }, [open, store, debouncedMySearch]);

  // 2. Fetch Partner Inventory
  useEffect(() => {
    if (!open || !partner) return;

    const fetchPartner = async () => {
      setLoadingPartner(true);

      const { data, error } = await supabase.rpc('search_partner_inventory', {
        _partner_store_id: partner.id,
        _search_text: debouncedPartnerSearch || '' 
      });
      
      if (error) console.error("Error RPC:", error);
      
      if (data) setPartnerItems(data as StockItem[]);
      setLoadingPartner(false);
    };

    fetchPartner();
  }, [open, partner, debouncedPartnerSearch]);

  const renderDotDetails = (item: StockItem | null, isPartner: boolean) => {
    const themeAccent = isPartner ? "emerald" : "blue";

    if (!item) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground p-8">
          <div className={`p-6 rounded-full bg-${themeAccent}-50/50 mb-4`}>
            <Package className={`w-12 h-12 text-${themeAccent}-200`} />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Product Selected</h3>
          <p className="text-sm text-center max-w-[250px]">Use the search box above to select a product and view its details.</p>
        </div>
      );
    }

    const dots = isPartner ? item.dots : item.tire_dots;

    return (
      <Card className="border-none shadow-none bg-transparent h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="pb-4 px-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl font-bold leading-tight">{item.brand}</CardTitle>
              <p className="text-lg font-medium text-muted-foreground mt-1">{item.model}</p>
              <Badge variant="outline" className="mt-3 text-base px-3 py-1 font-mono bg-background">
                {item.size}
              </Badge>
            </div>
            <div className={`text-center p-4 rounded-2xl bg-${themeAccent}-50 border-2 border-${themeAccent}-100 min-w-[110px]`}>
              <div className={`text-4xl font-black tracking-tighter text-${themeAccent}-700`}>{item.total_quantity}</div>
              <div className={`text-xs font-bold uppercase tracking-widest text-${themeAccent}-600/70 mt-1`}>Total Units</div>
            </div>
          </div>
        </CardHeader>

        <Separator className="my-2" />

        <CardContent className="px-0 py-4 flex-1 overflow-y-auto pretty-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>DOT Breakdown</span>
          </div>
          
          {!dots || dots.length === 0 ? (
            <div className="text-sm text-muted-foreground italic bg-muted/30 p-6 rounded-xl text-center border border-dashed">
              No specific DOT data available for this item.
            </div>
          ) : (
            <div className="space-y-2">
              {dots.map((d: any, idx: number) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 pl-4 rounded-lg border bg-card hover:bg-accent/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-8 rounded-full bg-${themeAccent}-200 group-hover:bg-${themeAccent}-400 transition-colors`} />
                    <span className="font-mono font-bold text-lg text-foreground">DOT {d.dot}</span>
                  </div>
                  <Badge variant="secondary" className={`font-mono font-bold text-sm px-3 py-1 bg-${themeAccent}-50 text-${themeAccent}-700 group-hover:bg-${themeAccent}-100`}>
                    x {d.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence mode="wait">
        {open && (
          <MotionDialogContent>
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-20">
              <div>
                <DialogPrimitive.Title className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <ArrowRightLeft className="w-6 h-6 text-primary" />
                  </div>
                  Inventory Comparison
                </DialogPrimitive.Title>
                <p className="text-muted-foreground mt-1 text-sm">
                  Comparing stock with <span className="font-semibold text-foreground">{partner?.name}</span>.
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-full p-2.5 hover:bg-accent transition-colors border bg-background">
                <X className="w-5 h-5 text-muted-foreground" />
              </DialogPrimitive.Close>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 h-[calc(100%-90px)] divide-y md:divide-y-0 md:divide-x bg-muted/10">
              
              {/* --- LEFT SIDE: MY STOCK --- */}
              <div className="flex flex-col h-full overflow-hidden bg-background">
                <div className="p-6 pb-4 border-b space-y-4 bg-background z-10">
                  <div className="flex items-center gap-3">
                    <StoreIcon className="w-5 h-5 text-blue-500" />
                    <h4 className="font-bold text-lg">My Store</h4>
                  </div>
                  
                  <ProductSelector 
                    items={myItems}
                    selected={selectedMyItem}
                    onSelect={setSelectedMyItem}
                    isOpen={openMySelect}
                    setIsOpen={setOpenMySelect}
                    placeholder="Search my inventory..."
                    loading={loadingMy}
                    themeAccent="blue"
                    searchValue={mySearchInput}
                    onSearchChange={setMySearchInput}
                    theme="blue"
                  />
                </div>
                
                <div className="flex-1 overflow-hidden p-6 pt-2">
                  {renderDotDetails(selectedMyItem, false)}
                </div>
              </div>

              {/* --- RIGHT SIDE: PARTNER STOCK --- */}
              <div className="flex flex-col h-full overflow-hidden bg-background">
                <div className="p-6 pb-4 border-b space-y-4 bg-background z-10">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    <h4 className="font-bold text-lg">{partner?.name}</h4>
                  </div>

                  <ProductSelector 
                    items={partnerItems}
                    selected={selectedPartnerItem}
                    onSelect={setSelectedPartnerItem}
                    isOpen={openPartnerSelect}
                    setIsOpen={setOpenPartnerSelect}
                    placeholder={`Search ${partner?.name}'s inventory...`}
                    loading={loadingPartner}
                    themeAccent="emerald"
                    searchValue={partnerSearchInput}
                    onSearchChange={setPartnerSearchInput}
                    theme="green"
                  />
                </div>

                <div className="flex-1 overflow-hidden p-6 pt-2">
                   {renderDotDetails(selectedPartnerItem, true)}
                </div>
              </div>

            </div>
          </MotionDialogContent>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}