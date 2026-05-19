import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { getAirport } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  currency: string;
}

interface Airport {
  name: string;
  iata: string;
  city: string;
  country: string;
  services: Service[];
}

function ServiceCard({ service }: { service: Service }) {
  const router = useRouter();
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{service['name']}</Text>
        <Text style={styles.serviceDesc}>{service['description']}</Text>
        <Text style={styles.servicePrice}>
          From {service['currency']} {service['priceFrom'].toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => router.push(`/book/${service['id']}`)}
      >
        <Text style={styles.bookButtonText}>Book</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AirportDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [airport, setAirport] = useState<Airport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getAirport(slug)
      .then((data: unknown) => {
        setAirport(data as Airport);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (error || !airport) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>Failed to load airport details.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.airportName}>{airport['name']}</Text>
          <Text style={styles.airportLocation}>
            {airport['city']}, {airport['country']}
          </Text>
        </View>
        <View style={styles.iataBadge}>
          <Text style={styles.iataText}>{airport['iata']}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available Services</Text>

      <FlatList
        data={airport['services']}
        keyExtractor={item => item['id']}
        renderItem={({ item }) => <ServiceCard service={item} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No services currently available at this airport.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  centred: { flex: 1, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  airportName: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  airportLocation: { fontSize: 14, color: Colors.gray },
  iataBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iataText: { fontSize: 16, fontWeight: '700', color: Colors.black },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  serviceCard: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 15, fontWeight: '600', color: Colors.white, marginBottom: 4 },
  serviceDesc: { fontSize: 13, color: Colors.gray, marginBottom: 6, lineHeight: 18 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: Colors.gold },
  bookButton: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bookButtonText: { color: Colors.black, fontWeight: '700', fontSize: 14 },
  emptyText: { color: Colors.gray, textAlign: 'center', marginTop: 40, fontSize: 14 },
  errorText: { color: Colors.red, fontSize: 15 },
});
