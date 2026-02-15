import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card } from '../components/Card';
import { getBriefArchive } from '../lib/api';
import { Brief } from '../types/domain';

export const ArchiveScreen = () => {
  const [items, setItems] = useState<Brief[]>([]);

  useEffect(() => {
    getBriefArchive().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <ScrollView style={styles.page}>
      <Text style={styles.title}>Archive</Text>
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={styles.date}>{item.brief_date}</Text>
          <Text>{item.payload.takeaway}</Text>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC', padding: 14 },
  title: { fontSize: 28, fontWeight: '700', marginVertical: 12 },
  date: { fontWeight: '600', marginBottom: 6 }
});
