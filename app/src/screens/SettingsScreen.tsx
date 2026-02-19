import { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { getProfile, signOut, upsertProfile } from '../lib/api';
import { supabase } from '../lib/supabase';

export const SettingsScreen = () => {
  const [wakeTime, setWakeTime] = useState('07:30:00');
  const [activeDays, setActiveDays] = useState('1,2,3,4,5,6,7');
  const [interests, setInterests] = useState('World,Markets,Tech');
  const [avoidKeywords, setAvoidKeywords] = useState('');
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(true);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setWakeTime(profile.wake_time_local);
        setActiveDays((profile.active_days ?? []).join(','));
        setInterests((profile.interests ?? []).join(','));
        setAvoidKeywords((profile.avoid_keywords ?? []).join(','));
        setShowPortfolio(profile.show_portfolio);
        setHideAmounts(profile.hide_amounts_in_push);
      })
      .catch(() => null);
  }, []);

  return (
    <ScrollView style={styles.page}>
      <Text style={styles.title}>Settings</Text>
      <TextInput style={styles.input} value={wakeTime} onChangeText={setWakeTime} placeholder="Wake time" />
      <TextInput style={styles.input} value={activeDays} onChangeText={setActiveDays} placeholder="Active days" />
      <TextInput style={styles.input} value={interests} onChangeText={setInterests} placeholder="Interests" />
      <TextInput style={styles.input} value={avoidKeywords} onChangeText={setAvoidKeywords} placeholder="Avoid keywords" />
      <View style={styles.switchRow}><Text>Show portfolio</Text><Switch value={showPortfolio} onValueChange={setShowPortfolio} /></View>
      <View style={styles.switchRow}><Text>Hide amounts in push</Text><Switch value={hideAmounts} onValueChange={setHideAmounts} /></View>
      <Button
        title="Save settings"
        onPress={async () => {
          await upsertProfile({
            wake_time_local: wakeTime,
            active_days: activeDays.split(',').map((x) => Number(x.trim())).filter(Boolean),
            interests: interests.split(',').map((x) => x.trim()).filter(Boolean),
            avoid_keywords: avoidKeywords.split(',').map((x) => x.trim()).filter(Boolean),
            show_portfolio: showPortfolio,
            hide_amounts_in_push: hideAmounts
          });
          Alert.alert('Saved');
        }}
      />
      <View style={{ height: 8 }} />
      <Button
        title="Send test push"
        onPress={async () => {
          const { error } = await supabase.functions.invoke('send-test-push', { body: {} });
          Alert.alert(error ? 'Failed' : 'Sent', error?.message ?? 'Check your device notifications.');
        }}
      />
      <View style={{ height: 8 }} />
      <Button title="Sign out" onPress={() => signOut()} color="#EF4444" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC', padding: 14 },
  title: { fontSize: 28, fontWeight: '700', marginVertical: 12 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, backgroundColor: '#fff', marginBottom: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }
});
