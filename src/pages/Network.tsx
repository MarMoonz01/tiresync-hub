import { useState } from "react";
import { Network as NetworkIcon, Check, X, Plus, Loader2, Search, Store as StoreIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNetwork } from "@/hooks/useNetwork";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Network() {
  const { language } = useLanguage();
  const th = language === "th";
  const {
    nameOf, incoming, outgoing, partners, candidates, linkedStock,
    requestLink, acceptLink, revokeLink, isLoading,
  } = useNetwork();
  const [q, setQ] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");

  const filteredCandidates = q.trim()
    ? candidates.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    : candidates;

  const stock = linkedStock.data ?? [];
  const storeNames = [...new Set(stock.map((t) => t.store_name))];
  const shownStock = stock.filter((t) =>
    (storeFilter === "all" || t.store_name === storeFilter) &&
    (!stockSearch.trim() || `${t.brand} ${t.model} ${t.size}`.toLowerCase().includes(stockSearch.toLowerCase())),
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div className="pt-2">
          <h1 className="text-2xl md:text-[26px] font-extrabold tracking-tight flex items-center gap-2">
            <NetworkIcon className="w-6 h-6 text-primary" /> {th ? "เครือข่ายร้านค้า" : "Store network"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {th ? "เชื่อมต่อกับร้านอื่นเพื่อดูสต็อกร่วมกัน" : "Link with other stores to share stock visibility"}
          </p>
        </div>

        <Tabs defaultValue="partners">
          <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-xl">
            <TabsTrigger value="partners" className="rounded-lg">{th ? "พาร์ทเนอร์" : "Partners"}</TabsTrigger>
            <TabsTrigger value="stock" className="rounded-lg">{th ? "สต็อกเครือข่าย" : "Linked stock"}</TabsTrigger>
          </TabsList>

          {/* ── Partners / link management ─────────────────────────────── */}
          <TabsContent value="partners" className="mt-5 space-y-6">
            {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-6" />}

            {incoming.length > 0 && (
              <Section title={th ? "คำขอที่ได้รับ" : "Requests received"}>
                {incoming.map((l) => (
                  <Row key={l.id} name={nameOf(l.requesting_store_id)} badge={th ? "รออนุมัติ" : "pending"} tone="amber">
                    <ActBtn primary onClick={() => acceptLink.mutate(l.id)} disabled={acceptLink.isPending}>
                      <Check className="w-3.5 h-3.5" /> {th ? "ยอมรับ" : "Accept"}
                    </ActBtn>
                    <ActBtn danger ghost onClick={() => revokeLink.mutate(l.id)}>
                      <X className="w-3.5 h-3.5" /> {th ? "ปฏิเสธ" : "Decline"}
                    </ActBtn>
                  </Row>
                ))}
              </Section>
            )}

            <Section title={th ? "เครือข่ายของคุณ" : "Your network"}>
              {partners.length === 0 && <Empty text={th ? "ยังไม่มีพาร์ทเนอร์" : "No partners yet"} />}
              {partners.map((p) => (
                <Row key={p.link.id} name={nameOf(p.storeId)} badge={th ? "เชื่อมต่อแล้ว" : "linked"} tone="emerald">
                  <ActBtn danger ghost onClick={() => revokeLink.mutate(p.link.id)}>
                    <X className="w-3.5 h-3.5" /> {th ? "ยกเลิก" : "Revoke"}
                  </ActBtn>
                </Row>
              ))}
            </Section>

            {outgoing.length > 0 && (
              <Section title={th ? "คำขอที่ส่งไป" : "Sent requests"}>
                {outgoing.map((l) => (
                  <Row key={l.id} name={nameOf(l.target_store_id)} muted badge={th ? "รอตอบรับ" : "awaiting"}>
                    <ActBtn danger ghost onClick={() => revokeLink.mutate(l.id)}>
                      <X className="w-3.5 h-3.5" /> {th ? "ยกเลิก" : "Cancel"}
                    </ActBtn>
                  </Row>
                ))}
              </Section>
            )}

            <Section title={th ? "ค้นหาร้านเพื่อเชื่อมต่อ" : "Find stores to link with"}>
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9 rounded-xl bg-secondary/60" placeholder={th ? "ค้นหาชื่อร้าน" : "Search store name"}
                  value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {filteredCandidates.length === 0 && <Empty text={th ? "ไม่พบร้าน" : "No stores found"} />}
              {filteredCandidates.slice(0, 50).map((s) => (
                <Row key={s.id} name={s.name} muted>
                  <ActBtn ghost onClick={() => requestLink.mutate(s.id)} disabled={requestLink.isPending}>
                    <Plus className="w-3.5 h-3.5" /> {th ? "ขอเชื่อมต่อ" : "Request link"}
                  </ActBtn>
                </Row>
              ))}
            </Section>
          </TabsContent>

          {/* ── Linked stock — store filter + tyre search ───────────────── */}
          <TabsContent value="stock" className="mt-5">
            <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="p-4 border-b border-border flex gap-2.5 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9 rounded-xl bg-secondary/60"
                    placeholder={th ? "ค้นหายาง (แบรนด์ / รุ่น / ขนาด)" : "Search tyre (brand / model / size)"}
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                  />
                </div>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border bg-card px-3 text-sm font-medium"
                >
                  <option value="all">{th ? "ทุกร้าน" : "All stores"}</option>
                  {storeNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[th ? "ร้าน" : "Store", th ? "ยาง" : "Tyre", th ? "คงเหลือ" : "Qty"].map((h, i) => (
                        <th key={h} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${i === 2 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shownStock.map((t, i) => (
                      <tr key={i} className="hover:bg-secondary/40 transition-colors">
                        <td className="px-4 py-3.5 text-muted-foreground">{t.store_name}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold">{t.brand} {t.model}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{t.size}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Badge variant="outline" className={t.quantity > 0 ? "border-transparent bg-emerald-500/10 text-emerald-600" : "border-transparent bg-rose-500/10 text-rose-600"}>
                            {t.quantity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {linkedStock.isLoading && (
                      <tr><td colSpan={3} className="px-4 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></td></tr>
                    )}
                    {!linkedStock.isLoading && shownStock.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                          {stock.length === 0
                            ? (th ? "ยังไม่มีสต็อกจากพาร์ทเนอร์ — เชื่อมต่อกับร้านอื่นก่อน" : "No partner stock — accept a link first.")
                            : (th ? "ไม่พบยางที่ค้นหา" : "No tyres match your filters")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-xs font-bold text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Row({
  name, badge, tone, muted, children,
}: {
  name: string;
  badge?: string;
  tone?: "emerald" | "amber";
  muted?: boolean;
  children?: React.ReactNode;
}) {
  const badgeCls = tone === "emerald" ? "bg-emerald-500/10 text-emerald-600"
    : tone === "amber" ? "bg-amber-500/10 text-amber-600"
    : "bg-secondary text-muted-foreground";
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-soft">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${muted ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary"}`}>
        <StoreIcon className="w-4 h-4" />
      </div>
      <span className="font-semibold text-sm flex-1 truncate">{name}</span>
      {badge && <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${badgeCls}`}>{badge}</span>}
      {children}
    </div>
  );
}

function ActBtn({
  children, onClick, disabled, primary, ghost, danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  ghost?: boolean;
  danger?: boolean;
}) {
  const cls = primary
    ? "bg-primary text-primary-foreground hover:opacity-90"
    : danger
      ? "text-rose-600 hover:bg-rose-500/10"
      : "border border-border bg-card hover:bg-secondary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${ghost && !danger ? "border border-border bg-card hover:bg-secondary" : cls}`}
    >
      {children}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="border-dashed rounded-xl"><CardContent className="py-6 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}
