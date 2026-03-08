import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, BarChart3, CalendarIcon, X, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  customer_name: string;
  items: any[];
  total: number;
  payment_method: string;
  created_at: string;
  notes: string | null;
}

interface POSAnalyticsProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
}

type Period = 'daily' | 'weekly' | 'monthly';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
  'hsl(262 83% 58%)',
  'hsl(199 89% 48%)',
  'hsl(330 81% 60%)',
];

function formatDateLabel(date: Date, period: Period): string {
  if (period === 'daily') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (period === 'weekly') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return `W${Math.ceil((weekStart.getDate()) / 7)} ${weekStart.toLocaleDateString('en-US', { month: 'short' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getDateKey(date: Date, period: Period): string {
  if (period === 'daily') return date.toISOString().slice(0, 10);
  if (period === 'weekly') {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 7);
}

export default function POSAnalytics({ transactions, formatCurrency }: POSAnalyticsProps) {
  const [period, setPeriod] = useState<Period>('daily');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const filteredTransactions = useMemo(() => {
    if (!startDate && !endDate) return transactions;
    return transactions.filter(t => {
      const d = new Date(t.created_at);
      if (startDate && d < new Date(startDate.setHours(0, 0, 0, 0))) return false;
      if (endDate && d > new Date(new Date(endDate).setHours(23, 59, 59, 999))) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const clearDates = () => { setStartDate(undefined); setEndDate(undefined); };

  // --- CSV Export ---
  const exportCSV = useCallback(() => {
    const headers = ['Date', 'Transaction ID', 'Customer', 'Payment Method', 'Items', 'Total', 'Notes'];
    const rows = filteredTransactions.map(t => {
      const items = Array.isArray(t.items) ? t.items : [];
      const itemsSummary = items.map((i: any) => `${i.name || 'Item'} x${i.quantity || 1}`).join('; ');
      return [
        new Date(t.created_at).toLocaleDateString(),
        t.id,
        t.customer_name || 'Walk-in',
        t.payment_method,
        `"${itemsSummary}"`,
        Number(t.total).toFixed(2),
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateLabel = startDate && endDate ? `${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}` : format(new Date(), 'yyyyMMdd');
    a.download = `sales-report-${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, startDate, endDate]);

  const revenueTrend = useMemo(() => {
    const grouped: Record<string, { date: Date; revenue: number; orders: number }> = {};

    filteredTransactions.forEach(t => {
      const d = new Date(t.created_at);
      const key = getDateKey(d, period);
      if (!grouped[key]) grouped[key] = { date: d, revenue: 0, orders: 0 };
      grouped[key].revenue += Number(t.total);
      grouped[key].orders += 1;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([, v]) => ({
        label: formatDateLabel(v.date, period),
        revenue: Math.round(v.revenue * 100) / 100,
        orders: v.orders,
      }));
  }, [filteredTransactions, period]);

  // Top-selling items
  const topItems = useMemo(() => {
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    filteredTransactions.forEach(t => {
      const items = Array.isArray(t.items) ? t.items : [];
      items.forEach((item: any) => {
        const name = item.name || 'Unknown';
        if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
        itemMap[name].quantity += Number(item.quantity || 1);
        itemMap[name].revenue += Number(item.subtotal || item.price || 0) * Number(item.quantity || 1);
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredTransactions]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      const method = t.payment_method || 'cash';
      map[method] = (map[method] || 0) + Number(t.total);
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value * 100) / 100 }));
  }, [filteredTransactions]);

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = filteredTransactions.filter(t => new Date(t.created_at).toDateString() === now.toDateString());
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayTxns = filteredTransactions.filter(t => new Date(t.created_at).toDateString() === yesterday.toDateString());

    const todayRevenue = today.reduce((s, t) => s + Number(t.total), 0);
    const yesterdayRevenue = yesterdayTxns.reduce((s, t) => s + Number(t.total), 0);
    const totalRevenue = filteredTransactions.reduce((s, t) => s + Number(t.total), 0);
    const avgOrder = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;
    const changePercent = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    return { todayRevenue, totalRevenue, avgOrder, txnCount: filteredTransactions.length, changePercent };
  }, [filteredTransactions]);

  // --- PDF Export ---
  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Sales Analytics Report', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const rangeText = startDate || endDate
      ? `Period: ${startDate ? format(startDate, 'MMM d, yyyy') : 'Start'} – ${endDate ? format(endDate, 'MMM d, yyyy') : 'Now'}`
      : `Generated: ${format(new Date(), 'MMM d, yyyy')}`;
    doc.text(rangeText, 14, y);
    y += 10;

    // Summary
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Total Revenue', formatCurrency(stats.totalRevenue)],
      ['Total Transactions', String(stats.txnCount)],
      ['Average Order Value', formatCurrency(stats.avgOrder)],
      ["Today's Revenue", formatCurrency(stats.todayRevenue)],
    ];
    autoTable(doc, {
      startY: y,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 40;

    // Revenue Trend
    if (revenueTrend.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Revenue Trend (${period})`, 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Period', 'Revenue', 'Orders']],
        body: revenueTrend.map(r => [r.label, formatCurrency(r.revenue), String(r.orders)]),
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 40;
    }

    // Top Selling Items
    if (topItems.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Selling Items', 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Item', 'Quantity Sold', 'Revenue']],
        body: topItems.map(i => [i.name, String(i.quantity), formatCurrency(i.revenue)]),
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 40;
    }

    // Payment Methods
    if (paymentBreakdown.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Method Breakdown', 14, y);
      y += 6;
      const totalPay = paymentBreakdown.reduce((s, p) => s + p.value, 0);
      autoTable(doc, {
        startY: y,
        head: [['Method', 'Amount', '% of Total']],
        body: paymentBreakdown.map(p => [p.name, formatCurrency(p.value), totalPay > 0 ? `${((p.value / totalPay) * 100).toFixed(1)}%` : '0%']),
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const footerY = doc.internal.pageSize.getHeight() - 10;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Sales Analytics Report · Page ${i} of ${pages}`, pageWidth / 2, footerY, { align: 'center' });
    }

    const dateLabel = startDate && endDate ? `${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}` : format(new Date(), 'yyyyMMdd');
    doc.save(`sales-report-${dateLabel}.pdf`);
  }, [stats, revenueTrend, topItems, paymentBreakdown, period, startDate, endDate, formatCurrency]);

  const revenueChartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
    orders: { label: 'Orders', color: 'hsl(var(--accent))' },
  };

  const topItemsChartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
    quantity: { label: 'Qty Sold', color: 'hsl(142 76% 36%)' },
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Filter by date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => startDate ? date < startDate : false} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDates} className="h-8 px-2 text-xs">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
            {(startDate || endDate) && (
              <span className="text-xs text-muted-foreground ml-auto">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
              </div>
              <div className={`flex items-center gap-1 text-xs ${stats.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(stats.changePercent).toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-bold">{stats.txnCount}</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.avgOrder)}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {revenueTrend.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No transaction data yet</p>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
              <BarChart data={revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Selling Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" /> Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No sales data yet</p>
            ) : (
              <ChartContainer config={topItemsChartConfig} className="h-[300px] w-full">
                <BarChart data={topItems} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No data yet</p>
            ) : (
              <div className="flex items-center justify-center">
                <ChartContainer config={{ value: { label: 'Amount' } }} className="h-[300px] w-full max-w-[400px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={paymentBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {paymentBreakdown.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{entry.name}: {formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
