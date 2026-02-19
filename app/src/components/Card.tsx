import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

export const Card = ({ children }: PropsWithChildren) => <View style={styles.card}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2
  }
});
