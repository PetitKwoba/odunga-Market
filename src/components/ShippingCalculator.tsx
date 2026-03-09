import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, Zap } from 'lucide-react';
import { useCurrency } from '@/lib/currency-context';

// Shipping rate zones (simplified B2B rates)
const ZONES: Record<string, { name: string; regions: string[] }> = {
  local: { name: 'Local (same country)', regions: ['Nigeria', 'Ghana', 'Kenya', 'South Africa'] },
  west_africa: { name: 'West Africa', regions: ['Nigeria', 'Ghana', 'Senegal', 'Ivory Coast', 'Cameroon', 'Togo', 'Benin'] },
  east_africa: { name: 'East Africa', regions: ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia', 'Rwanda'] },
  southern_africa: { name: 'Southern Africa', regions: ['South Africa', 'Botswana', 'Zimbabwe', 'Mozambique', 'Zambia'] },
  international: { name: 'International', regions: [] },
};

interface ShippingOption {
  id: string;
  name: string;
  icon: typeof Truck;
  baseCost: number;
  perKgCost: number;
  estimatedDays: string;
  description: string;
}

const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'standard', name: 'Standard Freight', icon: Truck, baseCost: 15, perKgCost: 0.5, estimatedDays: '7-14 days', description: 'Economical bulk shipping' },
  { id: 'express', name: 'Express Shipping', icon: Zap, baseCost: 35, perKgCost: 1.2, estimatedDays: '3-5 days', description: 'Priority handling & delivery' },
  { id: 'economy', name: 'Economy', icon: Clock, baseCost: 8, perKgCost: 0.3, estimatedDays: '14-21 days', description: 'Lowest cost option' },
];

const ZONE_MULTIPLIERS: Record<string, number> = {
  local: 1,
  west_africa: 1.5,
  east_africa: 1.8,
  southern_africa: 1.6,
  international: 2.5,
};

interface ShippingCalculatorProps {
  totalWeight?: number; // in kg, estimated from cart
  originCountry?: string;
  destinationCountry?: string;
  onSelect?: (option: { id: string; name: string; cost: number; days: string }) => void;
}

export default function ShippingCalculator({
  totalWeight = 10,
  originCountry = '',
  destinationCountry = '',
  onSelect,
}: ShippingCalculatorProps) {
  const { format } = useCurrency();
  const [selectedZone, setSelectedZone] = useState('local');
  const [selectedOption, setSelectedOption] = useState('standard');
  const [weight, setWeight] = useState(totalWeight);

  const zone = selectedZone;
  const multiplier = ZONE_MULTIPLIERS[zone] || 1;

  const estimates = useMemo(() => {
    return SHIPPING_OPTIONS.map(opt => ({
      ...opt,
      totalCost: Math.round((opt.baseCost + opt.perKgCost * weight) * multiplier * 100) / 100,
    }));
  }, [weight, multiplier]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" /> Shipping Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Shipping Zone</Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local (same country)</SelectItem>
                <SelectItem value="west_africa">West Africa</SelectItem>
                <SelectItem value="east_africa">East Africa</SelectItem>
                <SelectItem value="southern_africa">Southern Africa</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Est. Weight (kg)</Label>
            <input
              type="number"
              min={1}
              max={10000}
              value={weight}
              onChange={e => setWeight(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          {estimates.map(opt => {
            const isSelected = selectedOption === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedOption(opt.id);
                  onSelect?.({ id: opt.id, name: opt.name, cost: opt.totalCost, days: opt.estimatedDays });
                }}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{opt.name}</span>
                    {isSelected && <Badge variant="secondary" className="text-xs">Selected</Badge>}
                  </div>
                  <span className="font-semibold text-sm">{format(opt.totalCost)}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{opt.estimatedDays}</span>
                  <span>•</span>
                  <span>{opt.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          * Estimates only. Final shipping arranged by producer. Actual costs may vary.
        </p>
      </CardContent>
    </Card>
  );
}
