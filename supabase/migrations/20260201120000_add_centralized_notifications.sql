-- 1. ปรับปรุงโครงสร้างตาราง Notifications (Safe Add Columns)
DO $$ 
BEGIN 
    -- เพิ่ม store_id (สำหรับแจ้งเตือนระดับร้าน)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'store_id') THEN
        ALTER TABLE public.notifications ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
    END IF;

    -- เพิ่ม user_id (สำหรับแจ้งเตือนส่วนตัว)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- เพิ่ม metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- เพิ่ม type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'info';
    END IF;

    -- เพิ่ม link
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- 2. รีเซ็ต Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own notifications" ON public.notifications;
CREATE POLICY "View own notifications" ON public.notifications 
FOR SELECT USING (
  (store_id IS NOT NULL AND store_id = public.get_current_user_store_id()) 
  OR 
  (user_id = auth.uid())
);

DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications 
FOR UPDATE USING (
  (store_id IS NOT NULL AND store_id = public.get_current_user_store_id()) 
  OR 
  (user_id = auth.uid())
);

-- 3. ฟังก์ชันกลาง (Master Function)
CREATE OR REPLACE FUNCTION public.create_notification(
    _store_id UUID DEFAULT NULL,
    _user_id UUID DEFAULT NULL,
    _type TEXT DEFAULT 'info',
    _title TEXT DEFAULT '',
    _message TEXT DEFAULT '',
    _link TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (store_id, user_id, type, title, message, link)
    VALUES (_store_id, _user_id, _type, _title, _message, _link);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. TRIGGERS (4 หัวข้อหลักตาม Requirement)
-- ============================================================

-- 🔔 1. Staff Sign Up -> แจ้งเตือน Store Owner
CREATE OR REPLACE FUNCTION public.notify_staff_request()
RETURNS TRIGGER AS $$
DECLARE
    _user_name TEXT;
BEGIN
    SELECT full_name INTO _user_name FROM public.profiles WHERE id = NEW.user_id;
    
    PERFORM public.create_notification(
        _store_id := NEW.store_id, 
        _type := 'staff_request',
        _title := 'New Staff Request 👤',
        _message := COALESCE(_user_name, 'Someone') || ' wants to join your store.',
        _link := '/staff?tab=requests'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_staff_join_request ON public.staff_join_requests;
CREATE TRIGGER on_staff_join_request
    AFTER INSERT ON public.staff_join_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_staff_request();


-- 🔔 2. Partnership (ขอมา / ตอบรับ / ปฏิเสธ)
CREATE OR REPLACE FUNCTION public.notify_partnership_event()
RETURNS TRIGGER AS $$
DECLARE
    _req_store_name TEXT;
    _rec_store_name TEXT;
BEGIN
    SELECT name INTO _req_store_name FROM public.stores WHERE id = NEW.requestor_store_id;
    SELECT name INTO _rec_store_name FROM public.stores WHERE id = NEW.receiver_store_id;

    IF (TG_OP = 'INSERT') THEN
        -- มีคนขอมา -> แจ้งปลายทาง
        PERFORM public.create_notification(
            _store_id := NEW.receiver_store_id,
            _type := 'partnership_request',
            _title := 'Partnership Request 🤝',
            _message := _req_store_name || ' wants to be partners with you.',
            _link := '/network?tab=requests'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status = 'approved' THEN
            -- แจ้งคนขอ
            PERFORM public.create_notification(
                _store_id := NEW.requestor_store_id,
                _type := 'partnership_accepted',
                _title := 'Partnership Accepted! 🎉',
                _message := _rec_store_name || ' accepted your partnership request.',
                _link := '/network?tab=partners'
            );
        ELSIF NEW.status = 'rejected' THEN
            -- แจ้งคนขอ (ปฏิเสธ)
            PERFORM public.create_notification(
                _store_id := NEW.requestor_store_id,
                _type := 'partnership_rejected',
                _title := 'Request Declined ❌',
                _message := _rec_store_name || ' declined your partnership request.',
                _link := '/network?tab=discover'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.notify_partnership_event();


-- 🔔 3. Offer Help -> แจ้งเตือนร้านที่ขอ
CREATE OR REPLACE FUNCTION public.notify_broadcast_offer()
RETURNS TRIGGER AS $$
DECLARE
    _owner_store_id UUID;
    _request_title TEXT;
    _offerer_name TEXT;
BEGIN
    SELECT store_id, title INTO _owner_store_id, _request_title FROM public.broadcast_requests WHERE id = NEW.request_id;
    SELECT name INTO _offerer_name FROM public.stores WHERE id = NEW.store_id;

    IF _owner_store_id IS NOT NULL AND _owner_store_id != NEW.store_id THEN
        PERFORM public.create_notification(
            _store_id := _owner_store_id,
            _type := 'offer_received',
            _title := 'Offer Received! 🎁',
            _message := _offerer_name || ' sent an offer for: ' || _request_title,
            _link := '/marketplace?tab=broadcast'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_offer ON public.broadcast_offers;
CREATE TRIGGER on_new_offer
    AFTER INSERT ON public.broadcast_offers
    FOR EACH ROW EXECUTE FUNCTION public.notify_broadcast_offer();


-- 🔔 4. Role Change -> แจ้งเตือน Staff คนนั้น
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role != NEW.role THEN
        PERFORM public.create_notification(
            _user_id := NEW.user_id, 
            _type := 'role_change',
            _title := 'Role Updated 🛡️',
            _message := 'Your role has been updated to: ' || NEW.role,
            _link := '/profile'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_change ON public.store_members;
CREATE TRIGGER on_role_change
    AFTER UPDATE ON public.store_members
    FOR EACH ROW EXECUTE FUNCTION public.notify_role_change();