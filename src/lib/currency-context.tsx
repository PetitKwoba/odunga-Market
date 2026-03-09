import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
}

interface CurrencyContextType {
  currency: Currency;
  currencies: Currency[];
  setCurrency: (code: string) => void;
  convert: (amountUSD: number) => number;
  format: (amountUSD: number, showSymbol?: boolean) => string;
  isLoading: boolean;
}

const defaultCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1 };

const CurrencyContext = createContext<CurrencyContextType>({
  currency: defaultCurrency,
  currencies: [defaultCurrency],
  setCurrency: () => {},
  convert: (a) => a,
  format: (a) => `$${(a || 0).toFixed(2)}`,
  isLoading: true,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([defaultCurrency]);
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch currencies once on mount
  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data } = await supabase.from('currencies').select('*').eq('is_active', true);
      if (data && data.length > 0) {
        setCurrencies(data as Currency[]);
        
        // Get preferred currency from localStorage first (fastest)
        const stored = localStorage.getItem('currency');
        const found = data.find(c => c.code === stored);
        if (found) {
          setCurrencyState(found as Currency);
        }
      }
      setIsLoading(false);
    };
    fetchCurrencies();
  }, []);

  // Sync with user's preference when user changes
  useEffect(() => {
    if (user?.preferred_currency && currencies.length > 1) {
      const found = currencies.find(c => c.code === user.preferred_currency);
      if (found) {
        setCurrencyState(found);
        localStorage.setItem('currency', found.code);
      }
    }
  }, [user?.preferred_currency, currencies]);

  const setCurrency = useCallback(async (code: string) => {
    const found = currencies.find(c => c.code === code);
    if (found) {
      setCurrencyState(found);
      localStorage.setItem('currency', code);
      // Update user preference if logged in
      if (user) {
        await supabase.from('profiles').update({ preferred_currency: code }).eq('user_id', user.id);
      }
    }
  }, [currencies, user]);

  const convert = useCallback((amountUSD: number): number => {
    const amount = Number(amountUSD) || 0;
    return amount * currency.exchange_rate;
  }, [currency.exchange_rate]);

  const format = useCallback((amountUSD: number, showSymbol = true): string => {
    const converted = convert(amountUSD);
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
    return showSymbol ? `${currency.symbol}${formatted}` : formatted;
  }, [convert, currency.symbol]);

  return (
    <CurrencyContext.Provider value={{ currency, currencies, setCurrency, convert, format, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
