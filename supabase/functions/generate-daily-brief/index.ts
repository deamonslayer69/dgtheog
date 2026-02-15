import { corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source?: { name?: string };
};

const newsApiKey = Deno.env.get('NEWSAPI_KEY')!;
const finnhubKey = Deno.env.get('FINNHUB_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const isServiceRole = (req: Request) => req.headers.get('Authorization') === `Bearer ${serviceRoleKey}`;

const scoreArticle = (article: NewsArticle, interests: string[], avoidKeywords: string[]) => {
  const text = `${article.title} ${article.description ?? ''}`.toLowerCase();
  const recencyBoost = Math.max(0, 24 - (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60));
  const interestBoost = interests.reduce((acc, k) => acc + (text.includes(k.toLowerCase()) ? 3 : 0), 0);
  const avoidPenalty = avoidKeywords.reduce((acc, k) => acc + (text.includes(k.toLowerCase()) ? 4 : 0), 0);
  return recencyBoost + interestBoost - avoidPenalty;
};

const dedupeArticles = (articles: NewsArticle[]) => {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').slice(0, 8).join(' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchWorldNews = async () => {
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', 'world OR geopolitics OR economy OR technology');
  url.searchParams.set('language', 'en');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('from', from);
  url.searchParams.set('pageSize', '35');

  const res = await fetch(url, { headers: { 'X-Api-Key': newsApiKey } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.articles ?? []) as NewsArticle[];
};

const fetchQuote = async (symbol: string) => {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
};

const fetchCompanyNews = async (symbol: string) => {
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${finnhubKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return (await res.json()) as any[];
};

const generateConcept = async (stories: any[]) => {
  const prompt = `Create a concise educational concept tied to one of these stories: ${JSON.stringify(stories)}. Return strict JSON with concept_title, explanation_2_3_sentences, analogy_1_sentence, tie_back_1_sentence.`;

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'concept_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              concept_title: { type: 'string' },
              explanation_2_3_sentences: { type: 'string' },
              analogy_1_sentence: { type: 'string' },
              tie_back_1_sentence: { type: 'string' }
            },
            required: ['concept_title', 'explanation_2_3_sentences', 'analogy_1_sentence', 'tie_back_1_sentence']
          }
        }
      }
    })
  });

  if (!res.ok) {
    return {
      concept_title: 'Risk and Resilience',
      explanation_2_3_sentences: 'Big market and policy moves often reprice expectations quickly. Watching direction, speed, and who is affected helps you read change without reacting emotionally.',
      analogy_1_sentence: 'It is like checking weather fronts before leaving home instead of only looking out the window once.',
      tie_back_1_sentence: `This links to today's top updates that highlighted fast policy and sentiment shifts.`
    };
  }

  const data = await res.json();
  const raw = data.output_text ?? '{}';
  return JSON.parse(raw);
};

const computeNextRun = async (profile: any) => {
  const { data, error } = await serviceClient.rpc('compute_next_run_at', {
    p_timezone: profile.timezone,
    p_wake_time: profile.wake_time_local,
    p_active_days: profile.active_days
  });
  if (error) throw error;
  return data;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!isServiceRole(req)) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

  const { data: dueProfiles, error } = await serviceClient
    .from('profiles')
    .select('*')
    .not('expo_push_token', 'is', null)
    .lte('next_run_at', new Date().toISOString())
    .limit(100);

  if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

  for (const profile of dueProfiles ?? []) {
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: profile.timezone }).format(new Date());

    const { data: existing } = await serviceClient
      .from('briefs')
      .select('id')
      .eq('user_id', profile.user_id)
      .eq('brief_date', localDate)
      .maybeSingle();

    if (existing) {
      const nextRun = await computeNextRun(profile);
      await serviceClient.from('profiles').update({ next_run_at: nextRun }).eq('user_id', profile.user_id);
      continue;
    }

    let dataDelayed = false;
    let worldArticles = await fetchWorldNews();
    if (!worldArticles.length) {
      dataDelayed = true;
      worldArticles = [];
    }

    const scored = dedupeArticles(worldArticles)
      .map((article) => ({ article, score: scoreArticle(article, profile.interests ?? [], profile.avoid_keywords ?? []) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ article }) => article);

    const { data: holdings } = await serviceClient
      .from('holdings')
      .select('symbol, quantity, portfolio:portfolios!inner(user_id)')
      .eq('portfolios.user_id', profile.user_id);

    const portfolioHoldings = holdings ?? [];
    let portfolioPulse: any = null;
    const citations: any[] = [];

    const worldUpdates = scored.map((article) => {
      citations.push({ title: article.title, source: article.source?.name ?? 'Unknown', url: article.url, published_at: article.publishedAt });
      return {
        headline: article.title,
        oneSentence: article.description || 'New developments emerged in the last 24 hours.',
        whyItMatters: 'This could influence policy, sentiment, or market direction in coming sessions.',
        url: article.url,
        source: article.source?.name ?? 'Unknown',
        publishedAt: article.publishedAt
      };
    });

    if (profile.show_portfolio && portfolioHoldings.length) {
      let totalValue = 0;
      let dayChangeValue = 0;
      const movers: any[] = [];
      const companyNews: any[] = [];

      for (const h of portfolioHoldings) {
        const quote = await fetchQuote(h.symbol);
        if (!quote) {
          dataDelayed = true;
          continue;
        }
        const current = quote.c ?? 0;
        const prevClose = quote.pc ?? current;
        const positionValue = Number(h.quantity) * current;
        const positionDayChange = Number(h.quantity) * (current - prevClose);
        totalValue += positionValue;
        dayChangeValue += positionDayChange;
        const pctChange = prevClose > 0 ? ((current - prevClose) / prevClose) * 100 : 0;
        movers.push({ symbol: h.symbol, pctChange, dayChangeValue: positionDayChange });

        const symbolNews = await fetchCompanyNews(h.symbol);
        const first = symbolNews[0];
        if (first && companyNews.length < 8) {
          companyNews.push({
            symbol: h.symbol,
            headline: first.headline,
            url: first.url,
            source: first.source,
            publishedAt: new Date(first.datetime * 1000).toISOString()
          });
          citations.push({
            title: first.headline,
            source: first.source,
            url: first.url,
            published_at: new Date(first.datetime * 1000).toISOString()
          });
        }
      }

      const dedupCompanyNews = dedupeArticles(
        companyNews.map((x) => ({ title: x.headline, url: x.url, description: '', publishedAt: x.publishedAt, source: { name: x.source } }))
      ).map((article) => companyNews.find((x) => x.url === article.url)!);

      portfolioPulse = {
        totalValue,
        dayChangeValue,
        dayChangePct: totalValue ? (dayChangeValue / totalValue) * 100 : 0,
        topMovers: movers.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)).slice(0, 3),
        companyNews: dedupCompanyNews,
        note: dataDelayed ? 'Data delayed for some tickers/sources.' : undefined
      };
    }

    const concept = await generateConcept(worldUpdates.slice(0, 3));
    const overnightLine = worldUpdates[0]
      ? `Overnight focus shifted to: ${worldUpdates[0].headline}.`
      : 'Overnight data was lighter than usual; your brief includes the best available verified updates.';

    const payload = {
      portfolioPulse,
      worldUpdates,
      overnightLine,
      conceptOfDay: {
        title: concept.concept_title,
        explanation: concept.explanation_2_3_sentences,
        analogy: concept.analogy_1_sentence,
        tieBack: concept.tie_back_1_sentence
      },
      takeaway: 'Not investment advice. Use these updates as context, then verify before acting.'
    };

    const { data: briefInsert, error: briefError } = await serviceClient
      .from('briefs')
      .insert({ user_id: profile.user_id, brief_date: localDate, payload, citations })
      .select('id')
      .single();

    if (briefError) {
      await serviceClient.from('notifications_log').insert({
        user_id: profile.user_id,
        channel: 'expo_push',
        status: 'failed',
        error: briefError.message
      });
      continue;
    }

    const topMover = payload.portfolioPulse?.topMovers?.[0];
    const body = profile.hide_amounts_in_push
      ? `Portfolio updated • Top mover: ${topMover?.symbol ?? 'N/A'} ${topMover ? topMover.pctChange.toFixed(2) + '%' : ''} • 3 updates + 1 concept`
      : `Portfolio ${payload.portfolioPulse?.dayChangePct?.toFixed(2) ?? 0}% (${payload.portfolioPulse?.dayChangeValue?.toFixed(2) ?? 0}) • 3 updates + 1 concept`;

    await serviceClient.from('notifications_log').insert({
      user_id: profile.user_id,
      brief_id: briefInsert.id,
      channel: 'expo_push',
      status: 'queued'
    });

    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.expo_push_token,
        title: 'WakeBrief: While you slept…',
        body,
        data: { briefDate: localDate, deepLink: '/today' }
      })
    });

    const nextRun = await computeNextRun(profile);

    if (!expoRes.ok) {
      await serviceClient.from('notifications_log').insert({
        user_id: profile.user_id,
        brief_id: briefInsert.id,
        channel: 'expo_push',
        status: 'failed',
        error: await expoRes.text()
      });
    } else {
      await serviceClient.from('notifications_log').insert({
        user_id: profile.user_id,
        brief_id: briefInsert.id,
        channel: 'expo_push',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    }

    await serviceClient
      .from('profiles')
      .update({
        last_brief_date: localDate,
        next_run_at: nextRun
      })
      .eq('user_id', profile.user_id);
  }

  return new Response(JSON.stringify({ ok: true, processed: dueProfiles?.length ?? 0 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
