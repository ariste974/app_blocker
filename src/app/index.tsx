import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useBilling } from '../providers/BillingProvider';
import { useAuth } from '../providers/AuthProvider';

export default function IndexScreen() {
  const { isLoading, session } = useAuth();
  const billing = useBilling();

  useEffect(() => {
    if (
      isLoading ||
      (session !== null && billing.mode === 'stripe' && billing.isLoading)
    ) {
      return;
    }

    if (!session) {
      router.replace('/sign-in');
    } else if (billing.mode === 'stripe' && !billing.access?.has_access) {
      router.replace('/paywall');
    } else {
      router.replace('/home');
    }
  }, [billing.access?.has_access, billing.isLoading, billing.mode, isLoading, session]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#1A3D34" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8F4',
  },
});
