import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, StyleSheet, View } from 'react-native';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TodayScreen } from './screens/TodayScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { PortfolioScreen } from './screens/PortfolioScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { getProfile, getSession } from './lib/api';
import { supabase } from './lib/supabase';
import { useNotificationRouting } from './hooks/useNotifications';

type TabKey = 'today' | 'archive' | 'portfolio' | 'settings';

const tabs: TabKey[] = ['today', 'archive', 'portfolio', 'settings'];

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [tab, setTab] = useState<TabKey>('today');
  const [portfolioId, setPortfolioId] = useState<string | undefined>(undefined);

  useNotificationRouting();

  useEffect(() => {
    getSession().then(({ data }) => {
      setAuthed(Boolean(data.session));
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    getProfile()
      .then((profile) => {
        setOnboarded(Boolean(profile?.expo_push_token));
      })
      .catch(() => setOnboarded(false));

    supabase
      .from('portfolios')
      .select('id')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPortfolioId(data?.id));
  }, [authed]);

  const screen = useMemo(() => {
    if (!sessionReady) return null;
    if (!authed) return <AuthScreen />;
    if (!onboarded) return <OnboardingScreen onComplete={() => setOnboarded(true)} />;
    if (tab === 'today') return <TodayScreen />;
    if (tab === 'archive') return <ArchiveScreen />;
    if (tab === 'portfolio') return <PortfolioScreen portfolioId={portfolioId} />;
    return <SettingsScreen />;
  }, [sessionReady, authed, onboarded, tab, portfolioId]);

  return (
    <SafeAreaView style={styles.safe}>
      {screen}
      {authed && onboarded && (
        <View style={styles.nav}>
          {tabs.map((name) => (
            <Button key={name} title={name} onPress={() => setTab(name)} />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', padding: 8, borderTopWidth: 1, borderColor: '#E2E8F0' }
});
