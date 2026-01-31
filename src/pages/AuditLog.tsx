import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLog, AuditDateRange, AuditAction } from "@/hooks/useAuditLog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { 
  Search, 
  Plus, 
  Minus, 
  RefreshCw,
  Clock,
  Package,
  Activity,
  Users,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// เพิ่มตัวเลือก Today
const dateRangeOptions: { value: AuditDateRange; label: string; labelTh: string }[] = [
  { value: "today", label: "Today", labelTh: "วันนี้" },
  { value: "7d", label: "Last 7 Days", labelTh: "7 วันที่ผ่านมา" },
  { value: "30d", label: "Last 30 Days", labelTh: "30 วันที่ผ่านมา" },
  { value: "90d", label: "Last 90 Days", labelTh: "90 วันที่ผ่านมา" },
  { value: "all", label: "All Time", labelTh: "ทั้งหมด" },
];

const actionOptions: { value: AuditAction; label: string; labelTh: string }[] = [
  { value: "all", label: "All Actions", labelTh: "ทุกการกระทำ" },
  { value: "add", label: "Stock Added", labelTh: "เพิ่มสต็อก" },
  { value: "remove", label: "Stock Removed", labelTh: "ลดสต็อก" },
  { value: "adjust", label: "Adjusted", labelTh: "ปรับปรุง" },
];

export default function AuditLog() {
  const { language } = useLanguage();
  // ตั้งค่าเริ่มต้นเป็น "today" เพื่อให้ Reset การแสดงผลทุกครั้งที่เข้าหน้านี้
  const [dateRange, setDateRange] = useState<AuditDateRange>("today");
  const [customDate, setCustomDate] = useState<DateRange | undefined>();
  const [actionFilter, setActionFilter] = useState<AuditAction>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { loading, logs, stats } = useAuditLog(dateRange, actionFilter, debouncedSearch, customDate);

  const t = (en: string, th: string) => language === "th" ? th : en;

  // ฟังก์ชันจัดรูปแบบหัวข้อวันที่ (สำหรับ Grouping)
  const getGroupDateTitle = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return t("Today", "วันนี้");
    }
    if (isYesterday(date)) {
      return t("Yesterday", "เมื่อวานนี้");
    }
    return format(date, "EEEE, d MMMM yyyy", {
      locale: language === "th" ? th : enUS,
    });
  };

  const handleDateSelect = (date: DateRange | undefined) => {
    setCustomDate(date);
    if (date) {
      setDateRange("custom");
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "add":
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            <Plus className="w-3 h-3 mr-1" />
            {t("Added", "เพิ่ม")}
          </Badge>
        );
      case "remove":
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            <Minus className="w-3 h-3 mr-1" />
            {t("Removed", "ลด")}
          </Badge>
        );
      case "adjust":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            <RefreshCw className="w-3 h-3 mr-1" />
            {t("Adjusted", "ปรับ")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {action}
          </Badge>
        );
    }
  };

  // Logic จัดกลุ่ม Logs ตามวันที่
  const groupedLogs = logs.reduce((groups, log) => {
    const dateKey = format(new Date(log.created_at), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(log);
    return groups;
  }, {} as Record<string, typeof logs>);

  const uniqueDates = Object.keys(groupedLogs);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("Audit Log", "บันทึกการตรวจสอบ")}
          </h1>
          <p className="text-muted-foreground">
            {t("Track all stock adjustments and who made them", "ติดตามการปรับสต็อกทั้งหมดและผู้ที่ทำ")}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Total Actions", "การกระทำทั้งหมด")}</p>
                  <p className="text-xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-6 w-12" /> : stats.totalActions.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Stock Added", "สต็อกที่เพิ่ม")}</p>
                  <p className="text-xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-6 w-12" /> : `+${stats.totalAdded.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Stock Removed", "สต็อกที่ลด")}</p>
                  <p className="text-xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-6 w-12" /> : `-${stats.totalRemoved.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Active Users", "ผู้ใช้ที่ใช้งาน")}</p>
                  <p className="text-xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-6 w-12" /> : stats.uniqueUsers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search by product, DOT, or staff...", "ค้นหาตามสินค้า, DOT, หรือพนักงาน...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Date Range Select */}
              <div className="flex gap-2 items-center flex-wrap">
                <Select value={dateRange} onValueChange={(v) => {
                  setDateRange(v as AuditDateRange);
                  if (v !== 'custom') setCustomDate(undefined);
                }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {language === "th" ? option.labelTh : option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">{t("Custom Date", "กำหนดเอง")}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Calendar Picker (Show if custom) */}
                <DatePickerWithRange 
                  date={customDate} 
                  setDate={handleDateSelect}
                  className={cn(dateRange !== 'custom' && "hidden sm:block opacity-50 hover:opacity-100 transition-opacity")}
                />
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditAction)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {language === "th" ? option.labelTh : option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log List (Modified to use Grouping) */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Activity History", "ประวัติกิจกรรม")}</CardTitle>
            <CardDescription>
              {t("Complete log of all stock changes", "บันทึกการเปลี่ยนแปลงสต็อกทั้งหมด")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {t("No audit logs found", "ไม่พบบันทึกการตรวจสอบ")}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Loop ผ่านวันที่ (uniqueDates) แทนการ Loop logs ตรงๆ */}
                {uniqueDates.map((dateKey) => (
                  <div key={dateKey} className="space-y-4">
                    {/* Sticky Date Header */}
                    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-2 border-b border-border/50">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            {getGroupDateTitle(dateKey)}
                        </h3>
                    </div>

                    <div className="space-y-3">
                      {groupedLogs[dateKey].map((log) => (
                        <div
                          key={log.id}
                          className="p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Action Badge */}
                            <div className="flex items-center gap-3 min-w-[120px]">
                              {getActionBadge(log.action)}
                              <div className="flex items-center gap-2 text-sm">
                                <span className={cn(
                                  "font-bold",
                                  log.action === "add" ? "text-green-600 dark:text-green-400" : 
                                  log.action === "remove" ? "text-red-600 dark:text-red-400" : 
                                  "text-foreground"
                                )}>
                                  {log.action === "add" ? "+" : log.action === "remove" ? "-" : ""}
                                  {Math.abs(log.quantity_change)}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  ({log.quantity_before}→{log.quantity_after})
                                </span>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium text-foreground truncate">
                                  {log.tire_brand} {log.tire_model || ""} - {log.tire_size}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>DOT: {log.dot_code}</span>
                                {log.notes && (
                                  <span className="truncate">• {log.notes}</span>
                                )}
                              </div>
                            </div>

                            {/* User & Time */}
                            <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0 mt-2 sm:mt-0 min-w-[200px] justify-end">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-medium text-foreground">
                                  {log.user_name || log.user_email}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {/* แสดงเวลาเท่านั้น เพราะวันที่อยู่ที่ Header แล้ว */}
                                  <span>{format(new Date(log.created_at), "HH:mm")} น.</span>
                                </div>
                              </div>
                              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                <AvatarImage src={log.user_avatar || ""} alt={log.user_name || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {log.user_name?.substring(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}