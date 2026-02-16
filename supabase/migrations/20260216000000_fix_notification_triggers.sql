-- Fix #2: Repair broken notification trigger and missing RLS helper function
-- Issues:
--   1. notify_partnership_event() references NEW.requestor_store_id but table uses requester_store_id
--   2. get_current_user_store_id() function is missing (used by notification RLS policies)

-- ============================================================
-- 1. Create missing get_current_user_store_id() function
--    Wraps existing get_user_store_id(uuid) with auth.uid()
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_current_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_store_id(auth.uid());
$$;

-- ============================================================
-- 2. Fix partnership notification trigger (requestor -> requester)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_partnership_event()
RETURNS TRIGGER AS $$
DECLARE
    _req_store_name TEXT;
    _rec_store_name TEXT;
BEGIN
    SELECT name INTO _req_store_name FROM public.stores WHERE id = NEW.requester_store_id;
    SELECT name INTO _rec_store_name FROM public.stores WHERE id = NEW.receiver_store_id;

    IF (TG_OP = 'INSERT') THEN
        PERFORM public.create_notification(
            _store_id := NEW.receiver_store_id,
            _type := 'partnership_request',
            _title := 'Partnership Request',
            _message := _req_store_name || ' wants to be partners with you.',
            _link := '/network?tab=requests'
        );
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        IF NEW.status = 'approved' THEN
            PERFORM public.create_notification(
                _store_id := NEW.requester_store_id,
                _type := 'partnership_accepted',
                _title := 'Partnership Accepted!',
                _message := _rec_store_name || ' accepted your partnership request.',
                _link := '/network?tab=partners'
            );
        ELSIF NEW.status = 'rejected' THEN
            PERFORM public.create_notification(
                _store_id := NEW.requester_store_id,
                _type := 'partnership_rejected',
                _title := 'Request Declined',
                _message := _rec_store_name || ' declined your partnership request.',
                _link := '/network?tab=discover'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (safe: DROP IF EXISTS first)
DROP TRIGGER IF EXISTS on_partnership_change ON public.store_partnerships;
CREATE TRIGGER on_partnership_change
    AFTER INSERT OR UPDATE ON public.store_partnerships
    FOR EACH ROW EXECUTE FUNCTION public.notify_partnership_event();
