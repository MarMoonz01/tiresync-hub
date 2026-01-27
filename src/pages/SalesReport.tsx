import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesReport, DateRange } from "@/hooks/useSalesReport";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingCart,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";

const dateRangeOptions: { value: DateRange; label: string; labelTh: string }[] = [
  { value: "7d", label: "Last 7 Days", labelTh: "7 วันที่ผ่านมา" },
  { value: "30d", label: "Last 30 Days", labelTh: "30 วันที่ผ่านมา" },
  { value: "90d", label: "Last 90 Days", labelTh: "90 วันที่ผ่านมา" },
  { value: "12m", label: "Last 12 Months", labelTh: "12 เดือนที่ผ่านมา" },
];

export default function SalesReport() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const { 
    loading, 
    salesData, 
    topProducts, 
    overview, 
    monthlyData,
    previousPeriod,
    calculateChange 
  } = useSalesReport(dateRange);

  const t = (en: string, th: string) => language === "th" ? th : en;

  const salesChange = calculateChange(overview.totalSales, previousPeriod.totalSales);
  const revenueChange = calculateChange(overview.totalRevenue, previousPeriod.totalRevenue);

  const chartConfig = {
    quantity: {
      label: t("Units Sold", "จำนวนที่ขาย"),
      color: "hsl(var(--primary))",
    },
    revenue: {
      label: t("Revenue", "รายได้"),
      color: "hsl(var(--chart-2))",
    },
    sales: {
      label: t("Sales", "ยอดขาย"),
      color: "hsl(var(--primary))",
    },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ArrowUp className="w-4 h-4" />
          <span className="text-sm font-medium">+{value.toFixed(1)}%</span>
        </div>
      );
    } else if (value < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <ArrowDown className="w-4 h-4" />
          <span className="text-sm font-medium">{value.toFixed(1)}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">0%</span>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("Sales Report", "รายงานการขาย")}
            </h1>
            <p className="text-muted-foreground">
              {t("Analyze your sales performance and trends", "วิเคราะห์ประสิทธิภาพการขายและแนวโน้ม")}
            </p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex gap-2 flex-wrap">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={dateRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(option.value)}
              >
                {language === "th" ? option.labelTh : option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <ChangeIndicator value={salesChange} />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Total Sales", "ยอดขายรวม")}</p>
                    <p className="text-2xl font-bold text-foreground">{overview.totalSales.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("units sold", "หน่วยที่ขาย")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <ChangeIndicator value={revenueChange} />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Total Revenue", "รายได้รวม")}</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(overview.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("estimated revenue", "รายได้โดยประมาณ")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Avg. Price", "ราคาเฉลี่ย")}</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(overview.averageOrderSize)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("per unit", "ต่อหน่วย")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{t("Products Sold", "สินค้าที่ขาย")}</p>
                    <p className="text-2xl font-bold text-foreground">{overview.uniqueProducts}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("unique products", "สินค้าที่ไม่ซ้ำกัน")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Sales Trend", "แนวโน้มการขาย")}</CardTitle>
              <CardDescription>
                {t("Daily sales over the selected period", "ยอดขายรายวันในช่วงเวลาที่เลือก")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="quantity"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>{t("Monthly Comparison", "เปรียบเทียบรายเดือน")}</CardTitle>
              <CardDescription>
                {t("Sales comparison over the last 6 months", "เปรียบเทียบยอดขาย 6 เดือนที่ผ่านมา")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="sales" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Top Selling Products", "สินค้าขายดี")}</CardTitle>
            <CardDescription>
              {t("Best performing products in the selected period", "สินค้าที่มีประสิทธิภาพดีที่สุดในช่วงเวลาที่เลือก")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("No sales data available", "ไม่มีข้อมูลการขาย")}
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div
                    key={product.tireId}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {product.brand} {product.model || ""}
                      </p>
                      <p className="text-sm text-muted-foreground">{product.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{product.totalSold} {t("units", "หน่วย")}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(product.revenue)}</p>
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
