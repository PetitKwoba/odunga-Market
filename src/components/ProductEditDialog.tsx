import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ImagePlus, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BulkTier } from '@/lib/types';

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  moq: number;
  lead_time_days: number;
  stock_quantity: number;
  images: string[] | null;
  bulk_pricing: any;
  is_active: boolean;
  producer_id: string;
}

interface Props {
  product: ProductData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  isNew?: boolean;
  producerId?: string;
}

export default function ProductEditDialog({ product, open, onOpenChange, onSaved, isNew, producerId }: Props) {
  const [form, setForm] = useState(() => getDefaults(product, producerId));
  const [bulkTiers, setBulkTiers] = useState<BulkTier[]>(() => parseBulk(product?.bulk_pricing));
  const [images, setImages] = useState<string[]>(() => product?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset(p: ProductData | null) {
    setForm(getDefaults(p, producerId));
    setBulkTiers(parseBulk(p?.bulk_pricing));
    setImages(p?.images || []);
  }

  // Reset when product changes
  const [prevId, setPrevId] = useState(product?.id);
  if (product?.id !== prevId) {
    setPrevId(product?.id);
    reset(product);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const pid = product?.producer_id || producerId || '';
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${pid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    setImages(prev => [...prev, ...newUrls]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const addBulkTier = () => {
    setBulkTiers(prev => [...prev, { min_qty: 0, max_qty: null, price: 0 }]);
  };

  const updateTier = (idx: number, field: keyof BulkTier, val: string) => {
    setBulkTiers(prev => prev.map((t, i) => i === idx ? {
      ...t,
      [field]: field === 'max_qty' ? (val === '' ? null : Number(val)) : Number(val),
    } : t));
  };

  const removeTier = (idx: number) => {
    setBulkTiers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      base_price: parseFloat(String(form.base_price)) || 0,
      moq: parseInt(String(form.moq)) || 1,
      lead_time_days: parseInt(String(form.lead_time_days)) || 7,
      stock_quantity: parseInt(String(form.stock_quantity)) || 0,
      images,
      bulk_pricing: bulkTiers,
      is_active: form.is_active,
    };

    const dbPayload = {
      ...payload,
      bulk_pricing: JSON.parse(JSON.stringify(bulkTiers)),
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from('products').insert([{ ...dbPayload, producer_id: producerId! }]));
    } else {
      ({ error } = await supabase.from('products').update(dbPayload).eq('id', product!.id));
    }

    if (error) {
      toast.error('Failed to save: ' + error.message);
      setSaving(false);
      return;
    }

    toast.success(isNew ? 'Product created!' : 'Product updated!');
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isNew ? 'Add New Product' : 'Edit Product'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Images */}
          <div className="space-y-2">
            <Label>Product Images</Label>
            <div className="flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={i} className="relative h-24 w-24 rounded-lg border overflow-hidden group">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <span className="text-[10px]">{uploading ? 'Uploading...' : 'Add'}</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Basic info */}
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Organic Cotton Fabric" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your product..." rows={3} />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Textiles" /></div>
            <div className="space-y-2"><Label>Base Price ($)</Label><Input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="0.00" /></div>
          </div>

          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-2"><Label>MOQ</Label><Input type="number" value={form.moq} onChange={e => setForm(f => ({ ...f, moq: e.target.value }))} placeholder="50" /></div>
            <div className="space-y-2"><Label>Lead Time (days)</Label><Input type="number" value={form.lead_time_days} onChange={e => setForm(f => ({ ...f, lead_time_days: e.target.value }))} placeholder="7" /></div>
            <div className="space-y-2"><Label>Stock Qty</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="1000" /></div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            <Label>Product is active and visible to buyers</Label>
          </div>

          {/* Bulk Pricing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Bulk Pricing Tiers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBulkTier}><Plus className="mr-1 h-3 w-3" /> Add Tier</Button>
            </div>
            {bulkTiers.length === 0 && (
              <p className="text-sm text-muted-foreground">No bulk pricing tiers. Only the base price will apply.</p>
            )}
            {bulkTiers.map((tier, i) => (
              <Card key={i}>
                <CardContent className="flex items-end gap-3 p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Min Qty</Label>
                    <Input type="number" value={tier.min_qty} onChange={e => updateTier(i, 'min_qty', e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Max Qty (empty = unlimited)</Label>
                    <Input type="number" value={tier.max_qty ?? ''} onChange={e => updateTier(i, 'max_qty', e.target.value)} placeholder="∞" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Price / Unit ($)</Label>
                    <Input type="number" value={tier.price} onChange={e => updateTier(i, 'price', e.target.value)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getDefaults(p: ProductData | null | undefined, producerId?: string) {
  return {
    name: p?.name || '',
    description: p?.description || '',
    category: p?.category || '',
    base_price: p?.base_price ?? '',
    moq: p?.moq ?? '',
    lead_time_days: p?.lead_time_days ?? '',
    stock_quantity: p?.stock_quantity ?? '',
    is_active: p?.is_active ?? true,
  };
}

function parseBulk(raw: any): BulkTier[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: any) => ({ min_qty: t.min_qty || 0, max_qty: t.max_qty ?? null, price: t.price || 0 }));
}
