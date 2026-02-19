import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { upsertProfile } from '../lib/api';
import { registerPushToken } from '../hooks/useNotifications';

const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6, 7];

export const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [timezone, setTimezone] = useState('Europe/Rome');
  const [wakeTime, setWakeTime] = useState('07:30:00');
  const [activeDays, setActiveDays] = useState<number[]>(DEFAULT_DAYS);
  const [interests, setInterests] = useState('World,Markets,Tech');
  const [avoidKeywords, setAvoidKeywords] = useState('');
  const [showPortfolio, setShowPortfolio] = useState(true);

  const toggleDay = (day: number) => {
    setActiveDays((prev) => (prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day].sort()));
  };

  const finish = async () => {
    const token = await registerPushToken();
    await upsertProfile({
      timezone,
      wake_time_local: wakeTime,
      active_days: activeDays,
      interests: interests.split(',').map((x) => x.trim()).filter(Boolean),
      avoid_keywords: avoidKeywords.split(',').map((x) => x.trim()).filter(Boolean),
      show_portfolio: showPortfolio,
      expo_push_token: token
    });
    Alert.alert('All set', 'WakeBrief will deliver your daily briefing at wake time.');
    onComplete();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Onboarding {step}/3</Text>
      {step === 1 && (
        <View style={styles.block}>
          <Text>Timezone</Text>
          <TextInput value={timezone} onChangeText={setTimezone} style={styles.input} />
          <Text>Wake Time (HH:mm:ss)</Text>
          <TextInput value={wakeTime} onChangeText={setWakeTime} style={styles.input} />
          <Text>Active Days</Text>
          <View style={styles.daysRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <Button key={day} title={`${day}`} onPress={() => toggleDay(day)} color={activeDays.includes(day) ? '#0EA5E9' : '#94A3B8'} />
            ))}
          </View>
        </View>
      )}
      {step === 2 && (
        <View style={styles.block}>
          <Text>Interests (comma separated)</Text>
          <TextInput style={styles.input} value={interests} onChangeText={setInterests} />
          <Text>Avoid keywords (comma separated)</Text>
          <TextInput style={styles.input} value={avoidKeywords} onChangeText={setAvoidKeywords} />
          <View style={styles.switchRow}>
            <Text>Show Portfolio Pulse</Text>
            <Switch value={showPortfolio} onValueChange={setShowPortfolio} />
          </View>
        </View>
      )}
      {step === 3 && (
        <View style={styles.block}>
          <Text style={styles.permissionTitle}>Enable notifications</Text>
          <Text style={styles.permissionBody}>
            WakeBrief sends one concise morning brief so you never open to a blank screen. Enable notifications to receive it right at wake-up.
          </Text>
        </View>
      )}
      <View style={styles.footer}>
        {step > 1 && <Button title="Back" onPress={() => setStep((s) => s - 1)} />}
        {step < 3 ? <Button title="Next" onPress={() => setStep((s) => s + 1)} /> : <Button title="Enable & Finish" onPress={finish} />}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F8FAFC', flexGrow: 1 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 16, color: '#0F172A' },
  block: { gap: 8, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  permissionTitle: { fontSize: 22, fontWeight: '600' },
  permissionBody: { color: '#334155' }
});
