import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D1B2A' },
          headerTintColor: '#C9A84C',
          contentStyle: { backgroundColor: '#0A0A0A' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: 'Search Airports' }} />
        <Stack.Screen name="airports/[slug]" options={{ title: 'Airport' }} />
        <Stack.Screen name="book/[serviceId]" options={{ title: 'Book Service' }} />
      </Stack>
    </>
  );
}
