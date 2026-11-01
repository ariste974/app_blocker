import { Stack } from 'expo-router';

export const unstable_settings = {
  anchor: 'home',
};

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="simulation-shield" />
    </Stack>
  );
}
