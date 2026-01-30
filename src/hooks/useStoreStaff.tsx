import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// 1. นิยามสิทธิ์มาตรฐาน (Role Presets)
const ROLE_PERMISSIONS = {
  manager: {
    web: { view: true, add: true, edit: true, delete: true },
    line: { view: true, adjust: true },
  },
  staff: {
    web: { view: true, add: true, edit: true, delete: false }, // Staff ทั่วไปห้ามลบ
    line: { view: true, adjust: true },
  },
  sales: {
    web: { view: true, add: false, edit: false, delete: false }, // Sales ดูอย่างเดียว
    line: { view: true, adjust: false }, // Sales ห้ามปรับสต็อกผ่าน LINE
  },
};

interface StorePermissions {
  web: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  line: {
    view: boolean;
    adjust: boolean;
  };
}

interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  permissions: StorePermissions | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    status: "pending" | "approved" | "rejected" | "suspended";
  } | null;
}

export function useStoreStaff(searchQuery: string = "") {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { store } = useAuth();

  const { data: storeMembers = [], isLoading, error } = useQuery({
    queryKey: ["store-staff", store?.id, searchQuery],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data: members, error: membersError } = await supabase
        .from("store_members")
        .select("*")
        .eq("store_id", store.id);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      let result: StoreMember[] = members.map((member) => ({
        ...member,
        permissions: member.permissions as unknown as StorePermissions | null,
        is_approved: member.is_approved ?? false,
        profile: profiles?.find((p) => p.user_id === member.user_id) || null,
      }));

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(
          (m) =>
            m.profile?.full_name?.toLowerCase().includes(query) ||
            m.profile?.email?.toLowerCase().includes(query)
        );
      }

      return result;
    },
    enabled: !!store?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      if (!store?.id) throw new Error("No store found");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("User not found with this email");

      // 2. เลือกสิทธิ์ตาม Role ที่ส่งมา (ถ้าไม่มีให้ใช้ staff)
      const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS['staff'];

      const { error } = await supabase.from("store_members").insert({
        store_id: store.id,
        user_id: profile.user_id,
        role,
        permissions, // บันทึกสิทธิ์ลงไปด้วยทันที
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This user is already a member of your store");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Member added",
        description: "Staff member has been added to your store.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      
      // 3. เลือกสิทธิ์ใหม่ตาม Role ที่เปลี่ยน
      const newPermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS['staff'];

      const { error } = await supabase
        .from("store_members")
        .update({ 
          role,
          permissions: newPermissions // อัปเดตสิทธิ์ให้ตรงกับ Role ใหม่
        })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Role updated",
        description: "Staff member role and permissions have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { error } = await supabase
        .from("store_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({
        title: "Member removed",
        description: "Staff member has been removed from your store.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    storeMembers,
    isLoading,
    error,
    addMember: addMemberMutation.mutate,
    updateMemberRole: updateMemberRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isAddingMember: addMemberMutation.isPending,
    isUpdatingRole: updateMemberRoleMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
  };
}

export type { StoreMember };