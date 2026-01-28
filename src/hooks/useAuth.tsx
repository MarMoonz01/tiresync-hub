import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "store_member" | "pending";
  created_at: string;
}

interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StoreMembership {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  permissions: Permissions | null;
  is_approved: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Permissions {
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

// Full permissions for store owners
const OWNER_PERMISSIONS: Permissions = {
  web: { view: true, add: true, edit: true, delete: true },
  line: { view: true, adjust: true },
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  store: Store | null;
  storeMembership: StoreMembership | null;
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  hasStore: boolean;
  activeRole: 'owner' | 'staff' | null;
  permissions: Permissions | null;
  isOwner: boolean;
  isStaff: boolean;
  refetchProfile: () => Promise<void>;
  refetchStore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [storeMembership, setStoreMembership] = useState<StoreMembership | null>(null);
  const [activeRole, setActiveRole] = useState<'owner' | 'staff' | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data as Profile);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);
    
    if (data) {
      setRoles(data as UserRole[]);
    }
  };

  const fetchStore = async (userId: string) => {
    // First, check if user is a store OWNER
    const { data: ownedStore } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    
    if (ownedStore) {
      setStore(ownedStore as Store);
      setActiveRole('owner');
      setPermissions(OWNER_PERMISSIONS);
      setStoreMembership(null);
      return;
    }

    // If not an owner, check if user is an approved store STAFF member
    const { data: membership } = await supabase
      .from("store_members")
      .select(`
        *,
        stores (*)
      `)
      .eq("user_id", userId)
      .eq("is_approved", true)
      .maybeSingle();

    if (membership && membership.stores) {
      // User is an approved staff member
      setStore(membership.stores as Store);
      setStoreMembership({
        id: membership.id,
        store_id: membership.store_id,
        user_id: membership.user_id,
        role: membership.role,
        permissions: membership.permissions as unknown as Permissions | null,
        is_approved: membership.is_approved,
        created_at: membership.created_at,
        updated_at: membership.updated_at,
      });
      setActiveRole('staff');
      setPermissions(membership.permissions as unknown as Permissions | null);
      return;
    }

    // User has no store association
    setStore(null);
    setStoreMembership(null);
    setActiveRole(null);
    setPermissions(null);
  };

  const refetchProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refetchStore = async () => {
    if (user) {
      await fetchStore(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
              fetchStore(session.user.id),
            ]);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setStore(null);
          setStoreMembership(null);
          setActiveRole(null);
          setPermissions(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isApproved = profile?.status === "approved";
  const isAdmin = roles.some((r) => r.role === "admin");
  const isModerator = roles.some((r) => r.role === "moderator");
  const hasStore = !!store;
  const isOwner = activeRole === 'owner';
  const isStaff = activeRole === 'staff';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        store,
        storeMembership,
        loading,
        isApproved,
        isAdmin,
        isModerator,
        hasStore,
        activeRole,
        permissions,
        isOwner,
        isStaff,
        refetchProfile,
        refetchStore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
