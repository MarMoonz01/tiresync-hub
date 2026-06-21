import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// New tables (store_subscriptions, store_network_links, agent_usage_log) aren't in
// the generated Database types yet — reach them through an untyped client view.
const sb = supabase as unknown as SupabaseClient;

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  role: "owner" | "staff" | "interbranch" | null;
  store_id: string | null;
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  join_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreSubscription {
  id: string;
  store_id: string;
  plan: "trial" | "standard" | "suspended";
  status: "active" | "past_due" | "canceled";
  trial_ends_at: string | null;
}

/** Mirror of the SQL store_subscription_active() helper, for client-side gating. */
export function isSubscriptionActive(sub: StoreSubscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.plan !== "trial" && sub.plan !== "standard") return false;
  if (sub.plan === "trial" && sub.trial_ends_at && new Date(sub.trial_ends_at) <= new Date()) {
    return false;
  }
  return true;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  store: Store | null;
  role: "owner" | "staff" | "interbranch" | null;
  loading: boolean;
  isApproved: boolean;
  isOwner: boolean;
  isStaff: boolean;
  isInterbranch: boolean;
  isPlatformAdmin: boolean;
  subscription: StoreSubscription | null;
  subscriptionActive: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return null;
      if (data) setProfile(data as Profile);
      return (data as Profile) ?? null;
    } catch (e: unknown) {
      console.error("fetchProfile error:", e);
      setLoading(false);
      return null;
    }
  };

  const fetchStore = async (storeId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId)
        .maybeSingle();
      if (error) return;
      if (data) setStore(data as Store);
    } catch (e: unknown) {
      console.error("fetchStore error:", e);
      setLoading(false);
    }
  };

  const fetchSubscription = async (storeId: string): Promise<void> => {
    try {
      const { data } = await sb
        .from("store_subscriptions")
        .select("id, store_id, plan, status, trial_ends_at")
        .eq("store_id", storeId)
        .maybeSingle();
      setSubscription((data as StoreSubscription) ?? null);
    } catch {
      setSubscription(null);
    }
  };

  const fetchPlatformAdmin = async (userId: string): Promise<void> => {
    try {
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      setIsPlatformAdmin(!!data);
    } catch {
      setIsPlatformAdmin(false);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setStore(null);
    setIsPlatformAdmin(false);
    setSubscription(null);
    setLoading(false);
  };

  const refetchProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Last-resort safety net — clears spinner if a fetch hangs unexpectedly.
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // The callback runs while supabase-js holds an internal auth lock. Making
        // DB calls synchronously here can DEADLOCK signInWithPassword (it never
        // resolves -> the sign-in button spins forever). Defer all async/DB work
        // with setTimeout(0) so the lock is released first.
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (!newSession?.user) {
          setProfile(null);
          setStore(null);
          setIsPlatformAdmin(false);
          setSubscription(null);
          setLoading(false);
          return;
        }

        // On a fresh sign-in we don't have the profile yet. Gate routing with
        // loading=true so ProtectedRoute WAITS instead of bouncing to /pending or
        // the landing page before the profile/role is known. (Token refresh keeps
        // the existing profile, so we don't re-gate on those events.)
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          setLoading(true);
        }

        const uid = newSession.user.id;
        setTimeout(async () => {
          // On fresh signup the DB trigger may not have committed the profile row
          // yet. Retry up to 3 times before giving up.
          let profileData: Profile | null = null;
          const attempts = event === "SIGNED_IN" ? 3 : 1;
          for (let i = 0; i < attempts; i++) {
            profileData = await fetchProfile(uid);
            if (profileData) break;
            if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800));
          }

          // Platform admins may have no profile row — never sign them out.
          await fetchPlatformAdmin(uid);

          if (!profileData) {
            // Only force sign-out for non-admins with no profile.
            const { data: adminRow } = await supabase
              .from("platform_admins").select("user_id").eq("user_id", uid).maybeSingle();
            if (!adminRow) {
              clearAuthState();
              setTimeout(() => supabase.auth.signOut(), 0);
              return;
            }
            setLoading(false);
            return;
          }

          if (profileData.store_id) {
            await fetchStore(profileData.store_id);
            await fetchSubscription(profileData.store_id);
          }
          setLoading(false);
        }, 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!existing) setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const role = profile?.role ?? null;
  const isApproved = profile?.status === "approved";
  const isOwner = role === "owner";
  const isStaff = role === "staff";
  const isInterbranch = role === "interbranch";
  const subscriptionActive = isSubscriptionActive(subscription);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        store,
        role,
        loading,
        isApproved,
        isOwner,
        isStaff,
        isInterbranch,
        isPlatformAdmin,
        subscription,
        subscriptionActive,
        refetchProfile,
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
