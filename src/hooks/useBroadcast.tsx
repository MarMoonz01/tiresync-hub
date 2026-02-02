import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { BroadcastRequest } from "@/types/broadcast";

export function useBroadcast() {
  const { user, store } = useAuth(); // store ตัวนี้รองรับทั้ง Owner และ Staff แล้ว
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // 1. ดึง Feed ประกาศหาของ (กรองของร้านตัวเองออก)
  const fetchRequests = async (filters?: { width?: string; diameter?: string }) => {
    if (!store) return [];
    setLoading(true);
    try {
      let query = supabase
        .from('broadcast_requests')
        .select(`
          *,
          stores (name, logo_url, phone),
          broadcast_offers (count)
        `)
        .eq('status', 'open')
        .neq('store_id', store.id) // ไม่แสดงของตัวเองใน Feed
        .order('created_at', { ascending: false });

      if (filters?.width) query = query.eq('tire_width', filters.width);
      if (filters?.diameter) query = query.eq('tire_diameter', filters.diameter);

      const { data, error } = await query;
      if (error) throw error;

      // แปลงข้อมูลเพื่อนับจำนวน Offer
      return data.map((item: any) => ({
        ...item,
        offer_count: item.broadcast_offers?.[0]?.count || 0
      })) as BroadcastRequest[];
    } catch (err) {
      console.error("Error fetching requests:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 2. ดึงประกาศของฉัน
  const fetchMyRequests = async () => {
    if (!store) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_requests')
        .select(`*, broadcast_offers (count)`)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map((item: any) => ({
        ...item,
        offer_count: item.broadcast_offers?.[0]?.count || 0
      })) as BroadcastRequest[];
    } finally {
      setLoading(false);
    }
  };

  // 3. สร้างประกาศ
  const createRequest = async (formData: any) => {
    if (!store || !user) return;
    
    const { error } = await supabase.from('broadcast_requests').insert({
      store_id: store.id,
      title: formData.title || `Wanted: ${formData.width}/${formData.ratio} R${formData.diameter}`,
      tire_width: formData.width,
      tire_ratio: formData.ratio,
      tire_diameter: formData.diameter,
      quantity: parseInt(formData.quantity),
      urgency_level: formData.urgency ? 'urgent' : 'normal',
      notes: formData.notes,
      created_by: user.id
    });

    if (error) {
        toast({ title: "Error", variant: "destructive", description: "Failed to post request" });
        throw error;
    }
    toast({ title: "Posted!", description: "Your request is now visible." });
  };

  // 4. ส่งข้อเสนอ
  const submitOffer = async (requestId: string, offerData: any) => {
    if (!store || !user) return;
    
    const { error } = await supabase.from('broadcast_offers').insert({
      request_id: requestId,
      store_id: store.id,
      price: parseFloat(offerData.price),
      tire_dot: offerData.dot,
      notes: offerData.notes,
      created_by: user.id
    });

    if (error) {
        toast({ title: "Error", variant: "destructive", description: "Failed to send offer" });
        throw error;
    }
    toast({ title: "Offer Sent!", description: "The requester has been notified." });
  };

  return { loading, fetchRequests, fetchMyRequests, createRequest, submitOffer };
}