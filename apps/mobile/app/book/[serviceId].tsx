import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';

// TODO: Wire up Stripe React Native SDK in next sprint

export default function BookServiceScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Booking</Text>
      <Text style={styles.subtitle}>Service ID: {serviceId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Summary</Text>
        <Text style={styles.placeholder}>
          Service details and passenger count selector will appear here.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Text style={styles.placeholder}>
          Stripe payment sheet will be integrated in the next sprint.
        </Text>
      </View>

      <TouchableOpacity style={styles.ctaButton}>
        <Text style={styles.ctaButtonText}>Confirm &amp; Pay</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.gray, marginBottom: 24 },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.white, marginBottom: 8 },
  placeholder: { fontSize: 13, color: Colors.gray, lineHeight: 20 },
  ctaButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaButtonText: { color: Colors.black, fontWeight: '700', fontSize: 16 },
});
