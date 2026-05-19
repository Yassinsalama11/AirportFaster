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
import { searchAirports } from '@/lib/api';

interface AirportResult {
  slug: string;
  name: string;
  iata: string;
  city: string;
  country: string;
  services: string[];
}

function ResultCard({ airport }: { airport: AirportResult }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/airports/${airport['slug']}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardName}>{airport['name']}</Text>
          <Text style={styles.cardLocation}>
            {airport['city']}, {airport['country']}
          </Text>
        </View>
        <View style={styles.iataBadge}>
          <Text style={styles.iataText}>{airport['iata']}</Text>
        </View>
      </View>
      {airport['services'].length > 0 && (
        <View style={styles.servicesRow}>
          {airport['services'].map(service => (
            <View key={service} style={styles.serviceChip}>
              <Text style={styles.serviceChipText}>{service}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  const { q, service } = useLocalSearchParams<{ q?: string; service?: string }>();
  const [results, setResults] = useState<AirportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setError(false);
    searchAirports(q, service)
      .then((data: unknown) => {
        setResults(Array.isArray(data) ? (data as AirportResult[]) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [q, service]);

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {q ? (
        <Text style={styles.queryLabel}>
          Results for <Text style={styles.queryText}>"{q}"</Text>
        </Text>
      ) : null}

      <FlatList
        data={results}
        keyExtractor={item => item['slug']}
        renderItem={({ item }) => <ResultCard airport={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No airports found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different airport name, city, or IATA code.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  centred: { flex: 1, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  queryLabel: { fontSize: 14, color: Colors.gray, marginBottom: 16 },
  queryText: { color: Colors.white, fontWeight: '600' },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: { flex: 1, marginRight: 10 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.white, marginBottom: 3 },
  cardLocation: { fontSize: 13, color: Colors.gray },
  iataBadge: { backgroundColor: Colors.gold, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  iataText: { fontSize: 13, fontWeight: '700', color: Colors.black },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  serviceChipText: { fontSize: 11, color: Colors.gold, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.white, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 22 },
  errorText: { color: Colors.red, fontSize: 15 },
});
