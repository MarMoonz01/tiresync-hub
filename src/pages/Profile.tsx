import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineIntegrationCard } from "@/components/profile/LineIntegrationCard";
import { StoreAssociationsCard } from "@/components/profile/StoreAssociationsCard";

export default function Profile() {
  // ดึง isOwner และ storeMembership มาใช้เพื่อเช็คตำแหน่ง
  const { profile, isAdmin, refetchProfile, isOwner, storeMembership } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      await refetchProfile();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.user_id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      await refetchProfile();
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating avatar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ Logic ใหม่: แสดง Badge ตามตำแหน่งจริงในร้าน
  const getRoleBadge = () => {
    // 1. ถ้าเป็นเจ้าของร้าน
    if (isOwner) return { label: "Store Owner", variant: "default" as const };

    // 2. ถ้าเป็นพนักงาน (เช็คจาก storeMembership)
    if (storeMembership?.role) {
      // แปลงตัวอักษรแรกเป็นพิมพ์ใหญ่ (manager -> Manager)
      const roleName = storeMembership.role.charAt(0).toUpperCase() + storeMembership.role.slice(1);
      
      // เลือกสี Badge ให้ต่างกันตามตำแหน่ง
      let variant: "default" | "secondary" | "outline" = "outline";
      
      switch (storeMembership.role.toLowerCase()) {
        case 'manager':
          variant = "default"; // สีเข้ม (สำคัญ)
          break;
        case 'sales':
          variant = "secondary"; // สีรอง
          break;
        default:
          variant = "outline"; // ทั่วไป
      }

      return { label: roleName, variant };
    }

    // 3. ถ้าเป็น System Admin
    if (isAdmin) return { label: "System Admin", variant: "destructive" as const };

    // ถ้าไม่มีตำแหน่งอะไรเลย ให้คืนค่า null (ไม่แสดง Badge)
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <AppLayout>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
              <p className="text-muted-foreground">Update your personal information</p>
            </div>
          </div>

          {/* Avatar Section */}
          <Card className="glass-card">
            <CardContent className="p-6 flex flex-col items-center">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                
                {/* Camera Button triggers file input */}
                <button
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="font-semibold text-lg">{profile?.full_name || "User"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <div className="flex justify-center gap-2 mt-2">
                  
                  {/* แสดง Badge เฉพาะเมื่อมี roleBadge */}
                  {roleBadge && (
                    <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                  )}

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <StoreAssociationsCard />
          <LineIntegrationCard />
        </motion.div>
      </div>
    </AppLayout>
  );
}