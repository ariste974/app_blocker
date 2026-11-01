import { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from '../providers/AuthProvider';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function NotificationObserver() {
  const handledNotificationId = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const openQuizFromNotification = (
      response: Notifications.NotificationResponse | null,
    ) => {
      if (!response) return;

      const request = response.notification.request;
      if (handledNotificationId.current === request.identifier) return;

      const notificationUrl = request.content.data?.url;
      if (notificationUrl !== 'tempo://quiz' && notificationUrl !== '/quiz') return;

      handledNotificationId.current = request.identifier;
      router.push('/quiz');
      void Notifications.clearLastNotificationResponseAsync().catch((error: unknown) => {
        console.error('Unable to clear the handled notification response.', error);
      });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      openQuizFromNotification,
    );
    void Notifications.getLastNotificationResponseAsync()
      .then(openQuizFromNotification)
      .catch((error: unknown) => {
        console.error('Unable to read the last notification response.', error);
      });

    return () => subscription.remove();
  }, []);

  return null;
}

function AuthenticatedRouter() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#1A3D34" size="large" />
      </View>
    );
  }

  return (
    <>
      <NotificationObserver />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={session !== null}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedRouter />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F4',
  },
});
