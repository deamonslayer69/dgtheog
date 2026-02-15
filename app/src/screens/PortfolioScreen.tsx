import { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { getHoldings, importHoldingsCsv, upsertHolding } from '../lib/api';

export const PortfolioScreen = ({ portfolioId }: { portfolioId?: string }) => {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [csv, setCsv] = useState('symbol,quantity,avg_cost');

  const load = async () => setHoldings(await getHoldings());
  useEffect(() => {
    load().catch(() => null);
  }, []);

  const addHolding = async () => {
    if (!portfolioId) return Alert.alert('Missing portfolio', 'Create a portfolio first in Supabase.');
    await upsertHolding({
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      quantity: Number(quantity),
      avg_cost: avgCost ? Number(avgCost) : null
    });
    setSymbol('');
    setQuantity('');
    setAvgCost('');
    await load();
  };

  return (
    <ScrollView style={styles.page}>
      <Text style={styles.title}>Portfolio</Text>
      <Card>
        <Text style={styles.section}>Add or edit holding</Text>
        <TextInput style={styles.input} placeholder="Symbol" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
        <TextInput style={styles.input} placeholder="Quantity" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
        <TextInput style={styles.input} placeholder="Avg cost (optional)" keyboardType="decimal-pad" value={avgCost} onChangeText={setAvgCost} />
        <Button title="Save holding" onPress={addHolding} />
      </Card>
      <Card>
        <Text style={styles.section}>CSV import</Text>
        <TextInput multiline style={[styles.input, { minHeight: 90 }]} value={csv} onChangeText={setCsv} />
        <Button
          title="Import CSV"
          onPress={async () => {
            if (!portfolioId) return;
            await importHoldingsCsv(portfolioId, csv);
            await load();
          }}
        />
      </Card>
      {holdings.map((h) => (
        <Card key={h.id}>
          <View style={styles.row}><Text>{h.symbol}</Text><Text>{h.quantity}</Text><Text>{h.avg_cost ?? '-'}</Text></View>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC', padding: 14 },
  title: { fontSize: 28, fontWeight: '700', marginVertical: 12 },
  section: { fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, backgroundColor: '#fff', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' }
});
