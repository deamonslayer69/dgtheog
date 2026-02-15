import { supabase } from './supabase';
import { Brief } from '../types/domain';

export const signInWithMagicLink = async (email: string) => {
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
};

export const getSession = () => supabase.auth.getSession();

export const signOut = () => supabase.auth.signOut();

export const getLatestBrief = async (): Promise<Brief | null> => {
  const { data, error } = await supabase
    .from('briefs')
    .select('id, brief_date, payload, citations')
    .order('brief_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Brief | null;
};

export const getBriefArchive = async (): Promise<Brief[]> => {
  const { data, error } = await supabase
    .from('briefs')
    .select('id, brief_date, payload, citations')
    .order('brief_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Brief[];
};

export const upsertProfile = async (values: Record<string, unknown>) => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('No user');

  const { error } = await supabase.from('profiles').upsert({ user_id: userId, ...values });
  if (error) throw error;
};

export const getProfile = async () => {
  const { data, error } = await supabase.from('profiles').select('*').single();
  if (error) throw error;
  return data;
};

export const getHoldings = async () => {
  const { data, error } = await supabase
    .from('holdings')
    .select('id, symbol, quantity, avg_cost, currency, portfolio_id, portfolios!inner(user_id)')
    .order('symbol');
  if (error) throw error;
  return data ?? [];
};

export const upsertHolding = async (payload: {
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_cost?: number | null;
  currency?: string | null;
}) => {
  const { error } = await supabase.from('holdings').upsert(payload, { onConflict: 'portfolio_id,symbol' });
  if (error) throw error;
};

export const importHoldingsCsv = async (portfolioId: string, csvText: string) => {
  const rows = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const [symbol, quantity, avg_cost] = line.split(',');
      return {
        portfolio_id: portfolioId,
        symbol: symbol.trim().toUpperCase(),
        quantity: Number(quantity),
        avg_cost: avg_cost ? Number(avg_cost) : null
      };
    });

  const { error } = await supabase.from('holdings').upsert(rows, { onConflict: 'portfolio_id,symbol' });
  if (error) throw error;
};
