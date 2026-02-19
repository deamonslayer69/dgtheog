import { useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { getLatestBrief } from '../lib/api';
import { Brief } from '../types/domain';

export const TodayScreen = () => {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      setBrief(await getLatestBrief());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!brief) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No brief yet</Text>
        <Text style={styles.emptyBody}>Your first “While You Slept” will appear after the next scheduled run.</Text>
      </View>
    );
  }

  const payload = brief.payload;

  return (
    <ScrollView style={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <Text style={styles.date}>Brief for {brief.brief_date}</Text>
      {payload.portfolioPulse && (
        <Card>
          <Text style={styles.sectionTitle}>Portfolio Pulse</Text>
          <Text>Day: {payload.portfolioPulse.dayChangePct.toFixed(2)}%</Text>
          {!!payload.portfolioPulse.dayChangeValue && <Text>Value: {payload.portfolioPulse.dayChangeValue.toFixed(2)}</Text>}
          {payload.portfolioPulse.topMovers.map((m) => (
            <Text key={m.symbol}>• {m.symbol} {m.pctChange.toFixed(2)}%</Text>
          ))}
        </Card>
      )}
      <Card>
        <Text style={styles.sectionTitle}>While You Slept</Text>
        {payload.worldUpdates.map((story, idx) => (
          <View key={`${story.url}-${idx}`} style={styles.story}>
            <Text style={styles.headline}>{story.headline}</Text>
            <Text>{story.oneSentence}</Text>
            <Text style={styles.muted}>{story.whyItMatters}</Text>
          </View>
        ))}
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Overnight Change</Text>
        <Text>{payload.overnightLine}</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Concept of the Day</Text>
        <Text style={styles.headline}>{payload.conceptOfDay.title}</Text>
        <Text>{payload.conceptOfDay.explanation}</Text>
        <Text style={styles.muted}>{payload.conceptOfDay.analogy}</Text>
        <Text>{payload.conceptOfDay.tieBack}</Text>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Citations</Text>
        {brief.citations.map((citation) => (
          <Text style={styles.link} key={citation.url} onPress={() => Linking.openURL(citation.url)}>
            • {citation.title} ({citation.source})
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC', padding: 14 },
  date: { fontSize: 22, fontWeight: '700', marginVertical: 12, color: '#0F172A' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  story: { marginBottom: 12 },
  headline: { fontWeight: '600', color: '#0F172A' },
  muted: { color: '#475569', marginTop: 4 },
  link: { color: '#0284C7', marginBottom: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 26, fontWeight: '700' },
  emptyBody: { color: '#64748B', textAlign: 'center', marginTop: 8 }
});
