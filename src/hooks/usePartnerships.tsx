import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export type PartnershipStatus = 'pending' | 'approved' | 'rejected';

export interface PartnershipRequest {
  id: string;
  requester_store_id: string;
  receiver_store_id: string;
  status: PartnershipStatus;
  requester?: { name: string; logo_url: string; address: string; phone: string };
  receiver?: { name: string; logo_url: string; address: string; phone: string };
  created_at: string;
}

export interface PartnershipNotification {
  id: string;
  type: 'partnership_request' | 'partnership_accepted' | 'partnership_rejected';
  title: string;
  message: string;
  reference_id: string;
  is_read: boolean;
  created_at: string;
}

export function usePartnerships() {
  const { store } = useAuth();
  const { toast } = useToast();
  
  const [partners, setPartners] = useState<any[]>([]);
  const [requests, setRequests] = useState<PartnershipRequest[]>([]);
  const [notifications, setNotifications] = useState<PartnershipNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartnerships = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    
    try {
      // 1. Get Approved Partners
      const { data: partnerData, error: partnerError } = await supabase
        .from('store_partnerships')
        .select(`
          *,
          requester:stores!requester_store_id(id, name, logo_url, address, phone),
          receiver:stores!receiver_store_id(id, name, logo_url, address, phone)
        `)
        .eq('status', 'approved')
        .or(`requester_store_id.eq.${store.id},receiver_store_id.eq.${store.id}`);

      if (partnerError) throw partnerError;

      const formattedPartners = partnerData.map(p => {
        const isRequester = p.requester_store_id === store.id;
        const partnerInfo = isRequester ? p.receiver : p.requester;
        return {
          partnershipId: p.id,
          ...partnerInfo,
          since: p.updated_at
        };
      });
      setPartners(formattedPartners);

      // 2. Get Pending Requests (Incoming & Outgoing)
      const { data: reqData, error: reqError } = await supabase
        .from('store_partnerships')
        .select(`
          *,
          requester:stores!requester_store_id(id, name, logo_url),
          receiver:stores!receiver_store_id(id, name, logo_url)
        `)
        .eq('status', 'pending')
        .or(`requester_store_id.eq.${store.id},receiver_store_id.eq.${store.id}`);

      if (reqError) throw reqError;
      setRequests(reqData as any);

      // 3. Get Notifications
      const { data: notiData, error: notiError } = await supabase
        .from('partnership_notifications')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (!notiError) {
         setNotifications(notiData as PartnershipNotification[]);
      }

    } catch (error) {
      console.error("Error fetching partnerships:", error);
    } finally {
      setLoading(false);
    }
  }, [store]);

  const sendRequest = async (targetStoreId: string) => {
    if (!store) return;
    try {
      const { data: existing, error: checkError } = await supabase
        .from('store_partnerships')
        .select('id, status, requester_store_id')
        .or(`and(requester_store_id.eq.${store.id},receiver_store_id.eq.${targetStoreId}),and(requester_store_id.eq.${targetStoreId},receiver_store_id.eq.${store.id})`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.status === 'approved') {
          toast({ title: "Already Partners", description: "You are already connected." });
          return;
        }
        if (existing.status === 'pending') {
          toast({ title: "Request Pending", description: "Wait for the other store to respond." });
          return;
        }
        if (existing.status === 'rejected') {
          const { error: updateError } = await supabase
            .from('store_partnerships')
            .update({ 
              status: 'pending', 
              requester_store_id: store.id,
              receiver_store_id: targetStoreId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          toast({ title: "Request Sent Again", description: "Partnership request has been re-sent." });
          fetchPartnerships();
          return;
        }
      }

      const { error } = await supabase
        .from('store_partnerships')
        .insert({
          requester_store_id: store.id,
          receiver_store_id: targetStoreId,
          status: 'pending'
        });

      if (error) throw error;
      toast({ title: "Request Sent", description: "Partnership request sent successfully." });
      fetchPartnerships();
      
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const respondToRequest = async (partnershipId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('store_partnerships')
        .update({ status })
        .eq('id', partnershipId);

      if (error) throw error;
      toast({ 
        title: status === 'approved' ? "Connected!" : "Request Rejected", 
        description: status === 'approved' ? "You are now partners." : "Request has been rejected."
      });
      fetchPartnerships();
    } catch (error: any) {
      console.error("Error responding:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // --- NEW: Remove/Cancel Partnership ---
  const removePartnership = async (partnershipId: string) => {
    try {
      const { error } = await supabase
        .from('store_partnerships')
        .delete()
        .eq('id', partnershipId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Partnership/Request removed successfully." });
      fetchPartnerships();
    } catch (error: any) {
      console.error("Error removing partnership:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const markAsRead = async (notiId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notiId));
      await supabase.from('partnership_notifications').update({ is_read: true }).eq('id', notiId);
    } catch (error) { console.error(error); }
  };

  const markAllAsRead = async () => {
    if (!store) return;
    try {
      setNotifications([]);
      await supabase.from('partnership_notifications').update({ is_read: true }).eq('store_id', store.id).eq('is_read', false);
    } catch (error) { console.error(error); }
  };

  // Realtime
  useEffect(() => {
    if (!store) return;
    fetchPartnerships();
    const channel = supabase
      .channel('partnership-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partnership_notifications', filter: `store_id=eq.${store.id}` }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNoti = payload.new as PartnershipNotification;
            setNotifications(prev => [newNoti, ...prev]);
            toast({ title: newNoti.title, description: newNoti.message, variant: newNoti.type === 'partnership_rejected' ? 'destructive' : 'default' });
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_partnerships' }, () => {
           setTimeout(fetchPartnerships, 500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store, fetchPartnerships]);

  return { 
    partners, 
    requests, 
    notifications, 
    loading, 
    sendRequest, 
    respondToRequest, 
    removePartnership, // Export function ใหม่
    markAsRead, 
    markAllAsRead,
    refresh: fetchPartnerships 
  };
}