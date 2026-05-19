import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

// TODO: Replace with real auth state from expo-secure-store
const IS_LOGGED_IN = false;

interface Booking {
  id: string;
  service: string;
  airport: string;
  iata: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: 'bk-001',
    service: 'Fast Track',
    airport: 'Dubai International',
    iata: 'DXB',
    date: '2026-06-15',
    status: 'confirmed',
  },
  {
    id: 'bk-002',
    service: 'Meet & Greet',
    airport: 'Heathrow Airport',
    iata: 'LHR',
    date: '2026-07-02',
    status: 'pending',
  },
];

const STATUS_COLORS: Record<Booking['status'], string> = {
  confirmed: Colors.green,
  pending: Colors.gold,
  cancelled: Colors.red,
};

function BookingCard({ booking }: { booking: Booking }) {
  const statusColor = STATUS_COLORS[booking['status']];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardService}>{booking['service']}</Text>
          <Text style={styles.cardAirport}>{booking['airport']}</Text>
        </View>
        <View style={styles.iataBadge}>
          <Text style={styles.iataText}>{booking['iata']}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{booking['date']}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {booking['status'].charAt(0).toUpperCase() + booking['status'].slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function BookingsTab() {
  const router = useRouter();

  if (!IS_LOGGED_IN) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestIcon}>📋</Text>
        <Text style={styles.guestTitle}>Your bookings will appear here</Text>
        <Text style={styles.guestSubtitle}>
          Sign in to view and manage your airport service bookings.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push('/account')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/account')}
        >
          <Text style={styles.registerButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Bookings</Text>
      <FlatList
        data={SAMPLE_BOOKINGS}
        keyExtractor={item => item['id']}
        renderItem={({ item }) => <BookingCard booking={item} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No bookings yet. Start by searching for an airport.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.white, marginBottom: 16 },
  guestContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guestIcon: { fontSize: 48, marginBottom: 16 },
  guestTitle: { fontSize: 20, fontWeight: '700', color: Colors.white, textAlign: 'center', marginBottom: 8 },
  guestSubtitle: { fontSize: 14, color: Colors.gray, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  signInButton: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  signInButtonText: { color: Colors.black, fontWeight: '700', fontSize: 16 },
  registerButton: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  registerButtonText: { color: Colors.gold, fontWeight: '600', fontSize: 16 },
  emptyText: { color: Colors.gray, textAlign: 'center', marginTop: 60, fontSize: 14, lineHeight: 22 },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardService: { fontSize: 15, fontWeight: '600', color: Colors.white, marginBottom: 2 },
  cardAirport: { fontSize: 13, color: Colors.gray },
  iataBadge: { backgroundColor: Colors.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  iataText: { fontSize: 12, fontWeight: '700', color: Colors.black },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 13, color: Colors.gray },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
