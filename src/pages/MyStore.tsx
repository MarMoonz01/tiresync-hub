import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Store, MapPin, Phone, Mail, Edit, 
  Package, Users, CheckCircle2, XCircle,
  Share2, Settings, MessageCircle, 
  Wifi, WifiOff, AlertCircle, Camera, Loader2, Save
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTires } from "@/hooks/useTires";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function MyStore() {
  const { store, isOwner, refetchStore } = useAuth();
  const { totalCount } = useTires();
  const { toast } = useToast();
  const [staffCount, setStaffCount] = useState(0);
  
  // State สำหรับการแก้ไขข้อมูล
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: ""
  });

  // State สำหรับอัปโหลดรูป
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ดึงจำนวนพนักงาน
  useEffect(() => {
    const fetchStaffCount = async () => {
      if (!store) return;
      const { count } = await supabase
        .from('store_members')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_approved', true); // นับเฉพาะคนที่อนุมัติแล้ว
      setStaffCount(count || 0);
    };
    fetchStaffCount();
  }, [store]);

  // ตั้งค่า Form เริ่มต้น
  useEffect(() => {
    if (store) {
      setEditForm({
        name: store.name || "",
        description: store.description || "",
        address: store.address || "",
        phone: store.phone || "",
        email: store.email || ""
      });
    }
  }, [store]);

  if (!store) return null;

  const initials = store.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Helper สถานะ LINE
  const getConnectionStatus = () => {
    if (!store.line_enabled) return "disconnected";
    if (store.line_enabled && !store.line_webhook_verified) return "pending";
    return "connected";
  };
  const status = getConnectionStatus();

  // ฟังก์ชันอัปโหลดรูปภาพ
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !store) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${store.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage (Bucket: 'store-logos' หรือสร้างใหม่ถ้ายังไม่มี)
      const { error: uploadError } = await supabase.storage
        .from('store-logos') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(filePath);

      // 3. Update Store Record
      const { error: updateError } = await supabase
        .from('stores')
        .update({ logo_url: publicUrl })
        .eq('id', store.id);

      if (updateError) throw updateError;

      await refetchStore();
      toast({ title: "อัปโหลดรูปภาพสำเร็จ", description: "โลโก้ร้านค้าของคุณถูกเปลี่ยนแล้ว" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ 
        title: "เกิดข้อผิดพลาด", 
        description: "ไม่สามารถอัปโหลดรูปได้ (ตรวจสอบว่ามี Bucket 'store-logos' หรือยัง)", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ฟังก์ชันบันทึกการแก้ไขข้อมูล
  const handleSaveProfile = async () => {
    if (!store) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: editForm.name,
          description: editForm.description,
          address: editForm.address,
          phone: editForm.phone,
          email: editForm.email
        })
        .eq('id', store.id);

      if (error) throw error;

      await refetchStore();
      setIsEditing(false);
      toast({ title: "บันทึกข้อมูลสำเร็จ", description: "ข้อมูลร้านค้าได้รับการปรับปรุงแล้ว" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-container space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Hero Section */}
          <motion.div variants={itemVariants} className="relative group">
            <div className="h-48 md:h-64 rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-primary overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              <div className="absolute top-4 right-4 flex gap-2">
                <Badge variant="secondary" className="backdrop-blur-md bg-white/20 text-white border-none">
                  {store.is_active ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1 text-green-400" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1 text-red-400" /> Inactive</>
                  )}
                </Badge>
              </div>
            </div>

            <div className="bg-card border-x border-b rounded-b-3xl shadow-sm px-6 pb-6 pt-16 relative mt-[-4rem]">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6 relative z-10 -mt-12 md:-mt-20">
                
                {/* 📸 Avatar & Upload Button */}
                <div className="relative group/avatar">
                  <Avatar className="w-32 h-32 border-4 border-card shadow-xl rounded-2xl">
                    <AvatarImage src={store.logo_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-4xl rounded-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isOwner && (
                    <>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="absolute -bottom-2 -right-2 rounded-full shadow-md w-9 h-9 cursor-pointer hover:bg-primary hover:text-white transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>

                {/* Name & Quick Info */}
                <div className="flex-1 space-y-1 pt-2 md:pt-0">
                  <h1 className="text-3xl font-bold text-foreground">{store.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 
                    {store.address || <span className="italic text-muted-foreground/60">No address set</span>}
                  </p>
                </div>

                {/* ✏️ Edit Profile Button */}
                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 md:flex-none">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Edit Store Profile</DialogTitle>
                        <DialogDescription>
                          Update your store information visible to your staff.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Store Name</Label>
                          <Input id="name" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="desc">Description</Label>
                          <Textarea id="desc" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="address">Address</Label>
                          <Input id="address" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Link to="/settings">
                    <Button variant="default" className="flex-1 md:flex-none bg-primary">
                      <Settings className="w-4 h-4 mr-2" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 📊 Stats Row (Updated) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              icon={<Package className="w-5 h-5 text-blue-600" />}
              label="Total Tires"
              value={totalCount.toString()}
              subtext="In Inventory"
              bg="bg-blue-50 dark:bg-blue-900/20"
            />
            {/* 👥 Staff Members (เชื่อมข้อมูลจริง) */}
            <Link to="/staff">
              <StatsCard 
                icon={<Users className="w-5 h-5 text-purple-600" />}
                label="Staff Members"
                value={staffCount.toString()} 
                subtext="Active members"
                bg="bg-purple-50 dark:bg-purple-900/20"
                className="hover:border-purple-200 transition-colors cursor-pointer h-full"
              />
            </Link>
            {/* 🟢 LINE Status */}
            <StatsCard 
              icon={<MessageCircle className={`w-5 h-5 ${status === 'connected' ? 'text-green-600' : 'text-gray-500'}`} />}
              label="LINE Status"
              value={status === 'connected' ? "Online" : status === 'pending' ? "Pending" : "Offline"}
              subtext={status === 'connected' ? "Bot Active" : "Not connected"}
              bg={status === 'connected' ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-100 dark:bg-gray-800"}
            />
          </motion.div>

          {/* Detailed Content Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="details">Store Details</TabsTrigger>
                <TabsTrigger value="integration">Integrations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                    <CardDescription>How customers and staff can reach you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ContactItem 
                      icon={<Phone className="w-4 h-4" />} 
                      label="Phone" 
                      value={store.phone} 
                      placeholder="No phone number provided"
                      onEdit={() => setIsEditing(true)}
                    />
                    <ContactItem 
                      icon={<Mail className="w-4 h-4" />} 
                      label="Email" 
                      value={store.email} 
                      placeholder="No email address provided"
                      onEdit={() => setIsEditing(true)}
                    />
                    <ContactItem 
                      icon={<MapPin className="w-4 h-4" />} 
                      label="Address" 
                      value={store.address} 
                      placeholder="No address provided"
                      onEdit={() => setIsEditing(true)}
                    />
                    
                    <div className="pt-4 mt-4 border-t group relative">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium">Description</h4>
                        <Button variant="ghost" size="sm" className="h-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditing(true)}>
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {store.description || <span className="italic opacity-50">No description provided yet. Click edit to add details about your store.</span>}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integration" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-[#00B900]" />
                      LINE OA Integration
                    </CardTitle>
                    <CardDescription>Status of your chatbot connection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex items-center justify-between p-4 rounded-lg border ${
                      status === 'connected' ? "bg-green-50/50 border-green-200" : 
                      status === 'pending' ? "bg-yellow-50/50 border-yellow-200" : 
                      "bg-muted/30"
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          status === 'connected' ? "bg-green-100 text-green-600" :
                          status === 'pending' ? "bg-yellow-100 text-yellow-600" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {status === 'connected' ? <Wifi className="w-5 h-5" /> : 
                           status === 'pending' ? <AlertCircle className="w-5 h-5" /> :
                           <WifiOff className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">Connection Status</p>
                          <p className={`text-xs ${
                            status === 'connected' ? "text-green-600 font-medium" :
                            status === 'pending' ? "text-yellow-600 font-medium" :
                            "text-muted-foreground"
                          }`}>
                            {status === 'connected' ? "Active & Verified" :
                             status === 'pending' ? "Waiting for Webhook Verification" :
                             "Disconnected"}
                          </p>
                        </div>
                      </div>

                      {status === 'connected' && (
                        <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-full border border-green-100">
                           <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-green-700">Online</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}

// Sub-components
function StatsCard({ icon, label, value, subtext, bg, className }: any) {
  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <CardContent className="p-4 flex flex-col justify-between h-full">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          <h3 className="text-xl font-bold mt-1">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactItem({ icon, label, value, placeholder, onEdit }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group relative">
      <div className="w-9 h-9 rounded-full bg-background border flex items-center justify-center text-muted-foreground shadow-sm">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm ${!value && "text-muted-foreground italic opacity-70"}`}>
          {value || placeholder}
        </p>
      </div>
      {/* Quick Edit Button when hovering row */}
      {!value && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8"
          onClick={onEdit}
        >
          Add
        </Button>
      )}
    </div>
  );
}