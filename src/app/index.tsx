import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../providers/AuthProvider';

export default function IndexScreen() {
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    router.replace(session ? '/home' : '/sign-in');
  }, [isLoading, session]);

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
