import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithMagicLink } from '../lib/api';

export const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await signInWithMagicLink(email.trim());
      Alert.alert('Check your inbox', 'Use the magic link to sign in.');
    } catch (error) {
      Alert.alert('Unable to sign in', String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WakeBrief</Text>
      <Text style={styles.subtitle}>While-you-slept briefs, ready at wake-up.</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Button title={loading ? 'Sending...' : 'Send magic link'} onPress={submit} disabled={loading || !email} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#F8FAFC' },
  title: { fontSize: 32, fontWeight: '700', color: '#0F172A' },
  subtitle: { color: '#334155', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, backgroundColor: '#fff' }
});
