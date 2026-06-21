import { useState } from "react";
import { Network as NetworkIcon, Check, X, Plus, Loader2, Search, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const filteredCandidates = q.trim()
    ? candidates.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    : candidates;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-4 flex items-center gap-3">
        <NetworkIcon className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">{th ? "เครือข่ายร้านค้า" : "Store network"}</h1>
          <p className="text-xs text-muted-foreground">
            {th ? "เชื่อมต่อกับร้านอื่นเพื่อดูสต็อกร่วมกัน" : "Link with other stores to share stock visibility"}
          </p>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        <Tabs defaultValue="partners">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="partners">{th ? "พาร์ทเนอร์" : "Partners"}</TabsTrigger>
            <TabsTrigger value="stock">{th ? "สต็อกเครือข่าย" : "Linked stock"}</TabsTrigger>
          </TabsList>

          {/* ── Partners / link management ─────────────────────────────── */}
          <TabsContent value="partners" className="mt-5 space-y-6">
            {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-6" />}

            {/* Incoming requests */}
            {incoming.length > 0 && (
              <Section title={th ? "คำขอที่ได้รับ" : "Requests received"}>
                {incoming.map((l) => (
                  <Row key={l.id} name={nameOf(l.requesting_store_id)} badge={th ? "รออนุมัติ" : "pending"}>
                    <Button size="sm" className="gap-1.5" disabled={acceptLink.isPending}
                      onClick={() => acceptLink.mutate(l.id)}>
                      <Check className="w-3.5 h-3.5" /> {th ? "ยอมรับ" : "Accept"}
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-destructive"
                      onClick={() => revokeLink.mutate(l.id)}>
                      <X className="w-3.5 h-3.5" /> {th ? "ปฏิเสธ" : "Decline"}
                    </Button>
                  </Row>
                ))}
              </Section>
            )}

            {/* Accepted partners */}
            <Section title={th ? "เครือข่ายของคุณ" : "Your network"}>
              {partners.length === 0 && <Empty text={th ? "ยังไม่มีพาร์ทเนอร์" : "No partners yet"} />}
              {partners.map((p) => (
                <Row key={p.link.id} name={nameOf(p.storeId)} badge={th ? "เชื่อมต่อแล้ว" : "linked"} badgeVariant="default">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive"
                    onClick={() => revokeLink.mutate(p.link.id)}>
                    <X className="w-3.5 h-3.5" /> {th ? "ยกเลิก" : "Revoke"}
                  </Button>
                </Row>
              ))}
            </Section>

            {/* Outgoing pending */}
            {outgoing.length > 0 && (
              <Section title={th ? "คำขอที่ส่งไป" : "Sent requests"}>
                {outgoing.map((l) => (
                  <Row key={l.id} name={nameOf(l.target_store_id)} badge={th ? "รอตอบรับ" : "awaiting"}>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-destructive"
                      onClick={() => revokeLink.mutate(l.id)}>
                      <X className="w-3.5 h-3.5" /> {th ? "ยกเลิก" : "Cancel"}
                    </Button>
                  </Row>
                ))}
              </Section>
            )}

            {/* Find stores */}
            <Section title={th ? "ค้นหาร้านเพื่อเชื่อมต่อ" : "Find stores to link with"}>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder={th ? "ค้นหาชื่อร้าน" : "Search store name"}
                  value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {filteredCandidates.length === 0 && <Empty text={th ? "ไม่พบร้าน" : "No stores found"} />}
              {filteredCandidates.slice(0, 50).map((s) => (
                <Row key={s.id} name={s.name}>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={requestLink.isPending}
                    onClick={() => requestLink.mutate(s.id)}>
                    <Plus className="w-3.5 h-3.5" /> {th ? "ขอเชื่อมต่อ" : "Request link"}
                  </Button>
                </Row>
              ))}
            </Section>
          </TabsContent>

          {/* ── Linked stock (from accepted partners only) ──────────────── */}
          <TabsContent value="stock" className="mt-5">
            {linkedStock.isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-6" />}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{th ? "ร้าน" : "Store"}</th>
                    <th className="text-left px-4 py-3 font-medium">{th ? "ยาง" : "Tyre"}</th>
                    <th className="text-right px-4 py-3 font-medium">{th ? "คงเหลือ" : "Qty"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(linkedStock.data ?? []).map((t, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-muted-foreground">{t.store_name}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.brand} {t.model}</p>
                        <p className="text-xs text-muted-foreground">{t.size}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline">{t.quantity}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!linkedStock.isLoading && (linkedStock.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                        {th ? "ยังไม่มีสต็อกจากพาร์ทเนอร์ — เชื่อมต่อกับร้านอื่นก่อน" : "No partner stock — accept a link first."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Row({
  name, badge, badgeVariant = "secondary", children,
}: {
  name: string;
  badge?: string;
  badgeVariant?: "secondary" | "default";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <StoreIcon className="w-4 h-4" />
      </div>
      <span className="font-medium text-sm flex-1 truncate">{name}</span>
      {badge && <Badge variant={badgeVariant} className="text-[10px]">{badge}</Badge>}
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <Card className="border-dashed"><CardContent className="py-6 text-center text-sm text-muted-foreground">{text}</CardContent></Card>;
}
