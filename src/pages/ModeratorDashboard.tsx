import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  ShieldAlert, CheckCircle, XCircle, Search, Store, Trash2, Ban, Database,
  FileText, UploadCloud, Users, ListTodo
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

// Components ที่เราสร้างไว้ (สมมติว่าไฟล์ถูกสร้างแล้วตามขั้นตอนก่อนหน้า)
import { MasterCatalogTab } from "@/components/moderator/MasterCatalogTab";
import { MasterRequestList } from "@/components/moderator/MasterRequestList";
import { MasterImport } from "@/components/moderator/MasterImport";

export default function ModeratorDashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. Fetch Data Section ---

  // 1.1 Users รออนุมัติ
  const { data: pendingUsers } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('status', 'pending');
      if (error) throw error;
      return data;
    }
  });

  // 1.2 Stores ทั้งหมด
  const { data: allStores } = useQuery({
    queryKey: ['all-stores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*, profiles(email, full_name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 1.3 Users ทั้งหมด
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 1.4 นับจำนวน Tire Requests ที่รออนุมัติ (เพื่อแสดง Badge)
  const { data: pendingTireRequestsCount } = useQuery({
    queryKey: ['pending-tire-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('master_tire_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000 // เช็คทุก 30 วิ
  });

  // 1.5 นับจำนวน Master Tires ทั้งหมด (✅ เพิ่มใหม่)
  const { data: masterTiresCount } = useQuery({
    queryKey: ['master-tires-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('master_tires')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }
  });

  // --- 2. Action Handlers ---

  const approveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("อนุมัติผู้ใช้งานเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
    }
  });

  const toggleStoreStatus = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string, isActive: boolean }) => {
      const { error } = await supabase.from('stores').update({ is_active: !isActive }).eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("อัปเดตสถานะร้านค้าเรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ['all-stores'] });
    }
  });

  const deleteStore = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบร้านค้าออกจากระบบแล้ว");
      queryClient.invalidateQueries({ queryKey: ['all-stores'] });
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6 page-container pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-7 w-7 text-primary" />
              Moderator Center
            </h1>
            <p className="text-muted-foreground mt-1">ควบคุมดูแลระบบ จัดการสมาชิก และฐานข้อมูลกลาง</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">User Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-orange-500">{pendingUsers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tire Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-blue-500">{pendingTireRequestsCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Stores</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-green-600">{allStores?.filter(s => s.is_active).length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Master Catalog</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold text-purple-600">{masterTiresCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{allUsers?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* --- Main Tabs --- */}
        <Tabs defaultValue="tire_requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto md:h-10">
            {/* Tab: Tire Requests (New) */}
            <TabsTrigger value="tire_requests" className="gap-2 relative">
              <ListTodo className="w-4 h-4" />
              <span className="hidden md:inline">Tire Requests</span>
              <span className="md:hidden">Requests</span>
              {pendingTireRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingTireRequestsCount}
                </span>
              )}
            </TabsTrigger>

            {/* Tab: Master Catalog (Combine Import & List) */}
            <TabsTrigger value="catalog" className="gap-2">
              <Database className="w-4 h-4" />
              <span className="hidden md:inline">Master Catalog</span>
              <span className="md:hidden">Catalog</span>
            </TabsTrigger>

            {/* Tab: User Approvals */}
            <TabsTrigger value="approvals" className="gap-2 relative">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline">User Approvals</span>
              <span className="md:hidden">Users</span>
              {pendingUsers?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingUsers.length}
                </span>
              )}
            </TabsTrigger>

            {/* Tab: Stores */}
            <TabsTrigger value="stores" className="gap-2">
              <Store className="w-4 h-4" /> Stores
            </TabsTrigger>

            {/* Tab: All Users */}
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" /> All Users
            </TabsTrigger>
          </TabsList>

          {/* 1. Content: Tire Requests */}
          <TabsContent value="tire_requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  คำขอเพิ่มสินค้าใหม่ (Tire Requests)
                </CardTitle>
                <CardDescription>ตรวจสอบและอนุมัติสินค้าที่ร้านค้าแจ้งขอเพิ่มเข้ามาในระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <MasterRequestList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Content: Master Catalog */}
          <TabsContent value="catalog" className="mt-4">
            <Tabs defaultValue="list" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight">Master Database</h2>
                <TabsList className="w-[200px]">
                  <TabsTrigger value="list" className="w-full">List</TabsTrigger>
                  <TabsTrigger value="import" className="w-full">Import</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list">
                <MasterCatalogTab />
              </TabsContent>

              <TabsContent value="import">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-primary" />
                      Bulk Import Master Data
                    </CardTitle>
                    <CardDescription>นำเข้าข้อมูลสินค้าจำนวนมากจากไฟล์ Excel (Database Update)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MasterImport />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 3. Content: User Approvals */}
          <TabsContent value="approvals" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>คำขอสมัครสมาชิกใหม่</CardTitle>
                <CardDescription>อนุมัติผู้ใช้งานเพื่อเปิดร้านค้า</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    ไม่มีรายการรออนุมัติ
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่สมัคร</TableHead>
                        <TableHead>ชื่อ-สกุล</TableHead>
                        <TableHead>Email / Phone</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{new Date(user.created_at).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell className="font-medium">{user.full_name || 'ไม่ระบุ'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{user.email}</span>
                              <span className="text-xs text-muted-foreground">{user.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveUser.mutate(user.user_id)}>
                              <CheckCircle className="w-4 h-4 mr-1" /> อนุมัติ
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Content: Stores Management */}
          <TabsContent value="stores" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>จัดการร้านค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อร้าน</TableHead>
                        <TableHead>เจ้าของ</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allStores?.map((store) => (
                        <TableRow key={store.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-primary" /> {store.name}
                            </div>
                          </TableCell>
                          <TableCell>{store.profiles?.full_name || store.profiles?.email}</TableCell>
                          <TableCell>
                            <Badge variant={store.is_active ? "outline" : "destructive"} className={store.is_active ? "bg-green-50 text-green-700 border-green-200" : ""}>
                              {store.is_active ? "ปกติ" : "ถูกระงับ"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline"
                              className={store.is_active ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                              onClick={() => toggleStoreStatus.mutate({ storeId: store.id, isActive: store.is_active })}
                            >
                              {store.is_active ? "ระงับ" : "ปลดแบน"}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm(`ยืนยันการลบร้าน ${store.name}?`)) deleteStore.mutate(store.id) }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Content: All Users */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader><CardTitle>รายชื่อผู้ใช้งานทั้งหมด</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันที่เข้าร่วม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.full_name || 'No Name'}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === 'approved' ? 'default' : 'secondary'}>{user.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString('th-TH')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}