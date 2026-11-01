import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getScreenTimeSnapshot,
  type ScreenTimeSnapshot,
} from '../../lib/screenTime';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

export default function SimulatedShieldScreen() {
  const [snapshot, setSnapshot] = useState<ScreenTimeSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getScreenTimeSnapshot()
        .then((currentSnapshot) => {
          if (!active) return;
          if (!currentSnapshot.simulation || !currentSnapshot.isBlocked) {
            router.replace('/home');
            return;
          }
          setSnapshot(currentSnapshot);
        })
        .catch((error: unknown) => {
          if (active) setErrorMessage(getErrorMessage(error));
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const sendQuizNotification = async () => {
    if (Platform.OS === 'web') {
      setErrorMessage(
        'Les notifications de test sont disponibles dans Expo Go sur iPhone ou Android.',
      );
      return;
    }

    setSendingNotification(true);
    setErrorMessage(null);
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (!permission.granted) {
        throw new Error('Autorise les notifications pour tester l’ouverture du quiz.');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Tempo',
          body: 'Touche cette notification pour ouvrir le quiz.',
          data: { url: '/quiz' },
        },
        trigger: null,
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {snapshot ? (
          <>
            <View style={styles.simulationTag}>
              <Text style={styles.simulationTagText}>ÉCRAN BLOQUÉ SIMULÉ</Text>
            </View>
            <View style={styles.hourglass}>
              <Text style={styles.hourglassText}>⌛</Text>
            </View>
            <Text style={styles.eyebrow}>UNE PAUSE, ÇA FAIT DU BIEN</Text>
            <Text style={styles.title}>Cette app est en pause.</Text>
            <Text style={styles.description}>
              Dans la vraie version, Screen Time bloquerait les apps choisies. Ici, tout le
              parcours est simulé dans Tempo.
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                {snapshot.selectionMetadata?.applicationCount ?? 0} catégorie
                {(snapshot.selectionMetadata?.applicationCount ?? 0) > 1 ? 's' : ''} en pause
              </Text>
              <Text style={styles.infoText}>
                Réponds au quiz pour démarrer ta pause de 15 minutes.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/quiz')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Faire le quiz</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={sendingNotification}
              onPress={() => void sendQuizNotification()}
              style={[styles.secondaryButton, sendingNotification && styles.buttonDisabled]}
            >
              {sendingNotification ? (
                <ActivityIndicator color="#EAF2D6" />
              ) : (
                <Text style={styles.secondaryButtonText}>Tester la notification du quiz</Text>
              )}
            </Pressable>
            {errorMessage && (
              <View accessibilityRole="alert" style={styles.errorCard}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/home')}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Retour à Tempo</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color="#DDF18C" size="large" />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#19372F' },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  simulationTag: {
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 33,
  },
  simulationTagText: {
    color: '#DDF18C',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hourglass: {
    width: 70,
    height: 70,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignSelf: 'center',
    marginBottom: 25,
  },
  hourglassText: { fontSize: 32 },
  eyebrow: {
    color: '#B9D37C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 9,
  },
  description: {
    color: '#D1DCD5',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 23,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  infoTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  infoText: { color: '#D1DCD5', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: '#DDF18C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,242,214,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { color: '#EAF2D6', fontSize: 13, fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  errorCard: { backgroundColor: '#FDEDEC', borderRadius: 13, padding: 12, marginTop: 14 },
  errorText: { color: '#A43B32', fontSize: 12, lineHeight: 18 },
  backButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 16, marginTop: 8 },
  backButtonText: { color: '#D1DCD5', fontSize: 12, fontWeight: '700' },
});
