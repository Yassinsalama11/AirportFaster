import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '@/constants/colors';

// TODO: Replace with real auth state driven by expo-secure-store session token
const IS_LOGGED_IN = false;

interface UserProfile {
  name: string;
  email: string;
}

const STUB_USER: UserProfile = {
  name: 'Alex Traveller',
  email: 'alex@example.com',
};

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

function LoggedInView({ user }: { user: UserProfile }) {
  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          // TODO: Clear expo-secure-store token and reset auth state
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user['name'].charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user['name']}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <ProfileRow label="Name" value={user['name']} />
          <View style={styles.divider} />
          <ProfileRow label="Email" value={user['email']} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Manage Bookings</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Payment Methods</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Notifications</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function GuestView() {
  return (
    <View style={styles.guestContainer}>
      <Text style={styles.guestIcon}>✈️</Text>
      <Text style={styles.guestTitle}>Welcome to AirportFaster</Text>
      <Text style={styles.guestSubtitle}>
        Sign in to manage your bookings, save favourite airports, and access exclusive lounge offers.
      </Text>
      <TouchableOpacity style={styles.signInButton}>
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerButton}>
        <Text style={styles.registerButtonText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountTab() {
  if (IS_LOGGED_IN) {
    return <LoggedInView user={STUB_USER} />;
  }
  return <GuestView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black, padding: 16 },
  avatarContainer: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: Colors.black },
  userName: { fontSize: 20, fontWeight: '700', color: Colors.white },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.gray, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { backgroundColor: Colors.navy, borderRadius: 12, overflow: 'hidden' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  profileLabel: { fontSize: 14, color: Colors.gray },
  profileValue: { fontSize: 14, color: Colors.white, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#1E3A5F', marginHorizontal: 14 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  menuItemText: { fontSize: 14, color: Colors.white },
  menuArrow: { fontSize: 20, color: Colors.gray },
  signOutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonText: { color: Colors.red, fontWeight: '600', fontSize: 16 },
  guestContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guestIcon: { fontSize: 52, marginBottom: 16 },
  guestTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, textAlign: 'center', marginBottom: 10 },
  guestSubtitle: { fontSize: 14, color: Colors.gray, textAlign: 'center', marginBottom: 36, lineHeight: 22 },
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
});
