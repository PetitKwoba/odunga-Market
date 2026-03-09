import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const defaultCurrency: Currency = { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 1 };

const CurrencyContext = createContext<CurrencyContextType>({
  currency: defaultCurrency,
  currencies: [defaultCurrency],
  setCurrency: () => {},
  convert: (a) => a,
  format: (a) => `$${a.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currencies, setCurrencies] = useState<Currency[]>([defaultCurrency]);
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);

  useEffect(() => {
    supabase.from('currencies').select('*').eq('is_active', true).then(({ data }) => {
      if (data && data.length > 0) {
        setCurrencies(data as Currency[]);
        // Set user's preferred currency if available
        const preferred = user?.preferred_currency || localStorage.getItem('currency') || 'USD';
        const found = data.find(c => c.code === preferred);
        if (found) setCurrencyState(found as Currency);
      }
    });
  }, [user]);

  const setCurrency = async (code: string) => {
    const found = currencies.find(c => c.code === code);
    if (found) {
      setCurrencyState(found);
      localStorage.setItem('currency', code);
      // Update user preference if logged in
      if (user) {
        await supabase.from('profiles').update({ preferred_currency: code }).eq('user_id', user.id);
      }
    }
  };

  const convert = (amountUSD: number): number => {
    return amountUSD * currency.exchange_rate;
  };

  const format = (amountUSD: number, showSymbol = true): string => {
    const converted = convert(amountUSD);
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
    return showSymbol ? `${currency.symbol}${formatted}` : formatted;
  };

  return (
    <CurrencyContext.Provider value={{ currency, currencies, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
