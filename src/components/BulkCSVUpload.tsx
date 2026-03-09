import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface CSVProduct {
  name: string;
  description: string;
  category: string;
  base_price: number;
  moq: number;
  stock_quantity: number;
  lead_time_days: number;
  errors: string[];
}

export default function BulkCSVUpload({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<CSVProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const downloadTemplate = () => {
    const csv = 'name,description,category,base_price,moq,stock_quantity,lead_time_days\n"Example Product","A great product","Electronics",25.99,10,500,7';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CSVProduct[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['name', 'base_price', 'category'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      toast.error(`Missing required columns: ${missing.join(', ')}`);
      return [];
    }

    return lines.slice(1).map((line, idx) => {
      // Simple CSV parse handling quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
        current += char;
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });

      const errors: string[] = [];
      if (!row.name) errors.push('Name is required');
      if (!row.category) errors.push('Category is required');
      const price = parseFloat(row.base_price);
      if (isNaN(price) || price <= 0) errors.push('Invalid price');
      const moq = parseInt(row.moq) || 1;
      if (moq < 1) errors.push('MOQ must be >= 1');
      const stock = parseInt(row.stock_quantity) || 0;
      const lead = parseInt(row.lead_time_days) || 7;

      return {
        name: row.name?.substring(0, 200) || '',
        description: row.description?.substring(0, 2000) || '',
        category: row.category?.substring(0, 100) || '',
        base_price: isNaN(price) ? 0 : price,
        moq,
        stock_quantity: stock,
        lead_time_days: lead,
        errors,
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a .csv file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const products = parseCSV(text);
      setParsed(products);
      if (products.length === 0) toast.error('No valid rows found');
      else toast.success(`Parsed ${products.length} products`);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!user) return;
    const valid = parsed.filter(p => p.errors.length === 0);
    if (valid.length === 0) {
      toast.error('No valid products to upload');
      return;
    }

    setUploading(true);
    try {
      const rows = valid.map(p => ({
        producer_id: user.id,
        name: p.name,
        description: p.description,
        category: p.category,
        base_price: p.base_price,
        moq: p.moq,
        stock_quantity: p.stock_quantity,
        lead_time_days: p.lead_time_days,
        is_active: true,
        bulk_pricing: [],
        images: [],
      }));

      const { error } = await supabase.from('products').insert(rows);
      if (error) throw error;

      toast.success(`Successfully uploaded ${valid.length} products!`);
      setParsed([]);
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      onComplete?.();
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const validCount = parsed.filter(p => p.errors.length === 0).length;
  const errorCount = parsed.filter(p => p.errors.length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" /> Bulk CSV Upload
        </CardTitle>
        <CardDescription>Upload products in bulk using a CSV file. Max 200 products per upload.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Download Template
          </Button>
          <div className="relative">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> {fileName || 'Choose CSV File'}
            </Button>
          </div>
          {parsed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setParsed([]); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {parsed.length > 0 && (
          <>
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" /> {validCount} valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> {errorCount} with errors
                </Badge>
              )}
            </div>

            <div className="max-h-80 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 200).map((p, i) => (
                    <TableRow key={i} className={p.errors.length > 0 ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        {p.errors.length === 0
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <AlertCircle className="h-4 w-4 text-destructive" />
                        }
                      </TableCell>
                      <TableCell className="font-medium">{p.name || '—'}</TableCell>
                      <TableCell>{p.category || '—'}</TableCell>
                      <TableCell>${p.base_price.toFixed(2)}</TableCell>
                      <TableCell>{p.moq}</TableCell>
                      <TableCell>{p.stock_quantity}</TableCell>
                      <TableCell className="text-xs text-destructive">{p.errors.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleUpload} disabled={uploading || validCount === 0} className="gap-2">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : `Upload ${validCount} Products`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
