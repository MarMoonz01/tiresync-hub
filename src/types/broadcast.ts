export interface BroadcastRequest {
  id: string;
  store_id: string;
  title: string;
  tire_width: string;
  tire_ratio: string;
  tire_diameter: string;
  quantity: number;
  urgency_level: 'normal' | 'urgent';
  notes: string | null;
  status: 'open' | 'closed' | 'fulfilled';
  created_at: string;
  stores?: {
    name: string;
    logo_url: string | null;
    phone: string | null;
  };
  offer_count?: number; // เราจะ map ค่านี้มาจากการนับจำนวน offer
}

export interface BroadcastOffer {
  id: string;
  request_id: string;
  store_id: string;
  price: number;
  tire_dot: string | null;
  notes: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  stores?: {
    name: string;
    phone: string | null;
  };
}