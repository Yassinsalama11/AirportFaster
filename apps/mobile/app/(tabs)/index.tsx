import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { searchAirports } from '@/lib/api';

type ServiceChip = 'Fast Track' | 'Meet & Greet' | 'Lounge';

interface AirportResult {
  slug: string;
  name: string;
  iata: string;
  city: string;
  services: string[];
}

const SERVICE_CHIPS: ServiceChip[] = ['Fast Track', 'Meet & Greet', 'Lounge'];

const POPULAR_AIRPORTS: AirportResult[] = [
  { slug: 'dxb', name: 'Dubai International', iata: 'DXB', city: 'Dubai', services: ['Fast Track', 'Meet & Greet', 'Lounge'] },
  { slug: 'lhr', name: 'Heathrow Airport', iata: 'LHR', city: 'London', services: ['Fast Track', 'Lounge'] },
  { slug: 'jfk', name: 'John F. Kennedy International', iata: 'JFK', city: 'New York', services: ['Fast Track', 'Meet & Greet'] },
];

function AirportCard({ airport }: { airport: AirportResult }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/airports/${airport['slug']}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{airport['name']}</Text>
        <View style={styles.iataBadge}>
          <Text style={styles.iataText}>{airport['iata']}</Text>
        </View>
      </View>
      <Text style={styles.cardCity}>{airport['city']}</Text>
      <Text style={styles.cardServices}>{airport['services'].join(' · ')}</Text>
    </TouchableOpacity>
  );
}

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<ServiceChip | null>(null);
  const [results, setResults] = useState<AirportResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await searchAirports(text, activeChip ?? undefined) as AirportResult[];
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChipPress(chip: ServiceChip) {
    setActiveChip(prev => (prev === chip ? null : chip));
  }

  const showResults = query.length >= 2;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Find Airport Services</Text>

      <TextInput
        style={styles.input}
        placeholder="Search airports…"
        placeholderTextColor={Colors.gray}
        value={query}
        onChangeText={handleSearch}
        returnKeyType="search"
        onSubmitEditing={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
      />

      <View style={styles.chips}>
        {SERVICE_CHIPS.map(chip => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, activeChip === chip && styles.chipActive]}
            onPress={() => handleChipPress(chip)}
          >
            <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={Colors.gold} style={styles.loader} />}

      {showResults && !loading ? (
        <FlatList
          data={results}
          keyExtractor={item => item['slug']}
          renderItem={({ item }) => <AirportCard airport={item} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No airports found.</Text>
          }
        />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Popular Airports</Text>
          <FlatList
            data={POPULAR_AIRPORTS}
            keyExtractor={item => item['slug']}
            renderItem={({ item }) => <AirportCard airport={item} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.white, marginBottom: 16 },
  input: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    padding: 12,
    color: Colors.white,
    fontSize: 16,
    marginBottom: 12,
  },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray,
  },
  chipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipText: { color: Colors.gray, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: Colors.black },
  loader: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.gray, marginBottom: 12 },
  emptyText: { color: Colors.gray, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '600', color: Colors.white, flex: 1, marginRight: 8 },
  iataBadge: { backgroundColor: Colors.gold, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  iataText: { fontSize: 12, fontWeight: '700', color: Colors.black },
  cardCity: { fontSize: 13, color: Colors.gray, marginBottom: 4 },
  cardServices: { fontSize: 12, color: Colors.gold },
});
