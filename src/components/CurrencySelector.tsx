import { useCurrency } from '@/lib/currency-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

export default function CurrencySelector({ className }: { className?: string }) {
  const { currency, currencies, setCurrency } = useCurrency();

  return (
    <Select value={currency.code} onValueChange={setCurrency}>
      <SelectTrigger className={`w-20 h-8 text-xs ${className}`}>
        <Globe className="h-3 w-3 mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map(c => (
          <SelectItem key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
