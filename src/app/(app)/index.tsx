import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { ScreenTimePicker } from '../../components/ScreenTimePicker';
import {
  AUTHORIZATION,
  enableAppBlocking,
  getScreenTimeSnapshot,
  isScreenTimeAvailable,
  isScreenTimeSimulation,
  requestScreenTimeAuthorization,
  saveAppSelection,
  type ScreenTimeSnapshot,
  type SelectionMetadata,
} from '../../lib/screenTime';
import { useAuth } from '../../providers/AuthProvider';

const initialSnapshot: ScreenTimeSnapshot = {
  authorizationStatus: AUTHORIZATION.notDetermined,
  selectionToken: null,
  selectionMetadata: null,
  isBlocked: false,
  unlockUntil: null,
  simulation: isScreenTimeSimulation(),
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function selectionLabel(metadata: SelectionMetadata | null, simulation: boolean): string {
  if (!metadata) return 'Aucune app sélectionnée';

  const parts: string[] = [];
  if (metadata.applicationCount > 0) {
    const label = simulation ? 'catégorie' : 'app';
    parts.push(`${metadata.applicationCount} ${label}${metadata.applicationCount > 1 ? 's' : ''}`);
  }
  if (metadata.categoryCount > 0) {
    parts.push(`${metadata.categoryCount} catégorie${metadata.categoryCount > 1 ? 's' : ''}`);
  }
  if (metadata.webDomainCount > 0) {
    parts.push(`${metadata.webDomainCount} site${metadata.webDomainCount > 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Aucune app sélectionnée';
}

function hasSelection(metadata: SelectionMetadata | null): boolean {
  return Boolean(
    metadata &&
      metadata.applicationCount + metadata.categoryCount + metadata.webDomainCount > 0,
  );
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  const { signOut } = useAuth();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const refreshSnapshot = useCallback(async () => {
    try {
      setSnapshot(await getScreenTimeSnapshot());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(() => void refreshSnapshot(), 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshSnapshot();
    });

    return () => {
      clearTimeout(initialRefresh);
      subscription.remove();
    };
  }, [refreshSnapshot]);

  useFocusEffect(
    useCallback(() => {
      const focusedRefresh = setTimeout(() => void refreshSnapshot(), 0);
      return () => clearTimeout(focusedRefresh);
    }, [refreshSnapshot]),
  );

  useEffect(() => {
    if (snapshot.unlockUntil === null) return;
    const unlockUntil = snapshot.unlockUntil;

    const refreshCountdown = () => {
      const seconds = Math.max(
        0,
        Math.ceil((unlockUntil - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds === 0) void refreshSnapshot();
    };
    const initialCountdown = setTimeout(refreshCountdown, 0);
    const interval = setInterval(() => {
      refreshCountdown();
    }, 1000);

    return () => {
      clearTimeout(initialCountdown);
      clearInterval(interval);
    };
  }, [refreshSnapshot, snapshot.unlockUntil]);

  const requestPermission = async (approved = true) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const status = await requestScreenTimeAuthorization(approved);
      await refreshSnapshot();
      if (status !== AUTHORIZATION.approved) {
        setErrorMessage('L’autorisation Screen Time n’a pas été accordée.');
      }
    } catch (error) {
      await refreshSnapshot();
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openAppPicker = () => {
    if (snapshot.authorizationStatus !== AUTHORIZATION.approved) {
      setErrorMessage('Autorise d’abord Screen Time pour choisir les apps à bloquer.');
      return;
    }
    setErrorMessage(null);
    setPickerVisible(true);
  };

  const handleSelectionChange = async (token: string, metadata: SelectionMetadata) => {
    try {
      await saveAppSelection(token);
      const updatedSnapshot = await getScreenTimeSnapshot();
      setSnapshot((current) => ({
        ...current,
        selectionToken: token,
        selectionMetadata: metadata,
        isBlocked: updatedSnapshot.isBlocked,
        simulation: updatedSnapshot.simulation,
      }));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const startBlocking = async () => {
    if (!hasSelection(snapshot.selectionMetadata)) {
      setErrorMessage('Choisis au moins une app, catégorie ou un site à bloquer.');
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (!snapshot.simulation) {
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) {
          permission = await Notifications.requestPermissionsAsync();
        }
        if (!permission.granted) {
          throw new Error(
            'Autorise les notifications pour pouvoir ouvrir le quiz depuis l’écran de blocage.',
          );
        }
      }

      await enableAppBlocking();
      await refreshSnapshot();
      if (snapshot.simulation) router.push('/simulation-shield');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const screenTimeAvailable = isScreenTimeAvailable();
  const authorizationApproved =
    snapshot.authorizationStatus === AUTHORIZATION.approved;
  const selected = hasSelection(snapshot.selectionMetadata);
  const unlocked =
    snapshot.unlockUntil !== null &&
    (remainingSeconds === null || remainingSeconds > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {snapshot.simulation && (
          <View accessibilityRole="alert" style={styles.simulationBanner}>
            <Text style={styles.simulationBannerTitle}>MODE SIMULATION</Text>
            <Text style={styles.simulationBannerText}>Aucun blocage réel des applications</Text>
          </View>
        )}
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>t</Text>
          </View>
          <Text style={styles.brand}>tempo</Text>
          <View style={styles.todayPill}>
            <Text style={styles.todayPillText}>
              {snapshot.isBlocked ? 'PROTÉGÉ' : unlocked ? 'PAUSE' : 'À TON RYTHME'}
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>REPRENDS LE CONTRÔLE</Text>
        <Text style={styles.title}>
          Tes apps,{'\n'}à ton rythme.
        </Text>
        <Text style={styles.intro}>
          Choisis ce qui te distrait. Un quiz te permettra de faire une pause quand tu en as besoin.
        </Text>

        <View style={[styles.statusCard, snapshot.isBlocked && styles.statusCardActive]}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>{snapshot.isBlocked ? '✓' : '◷'}</Text>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>
              {snapshot.isBlocked
                ? 'BLOCAGE ACTIF'
                : snapshot.authorizationStatus === AUTHORIZATION.denied
                  ? 'AUTORISATION REFUSÉE'
                : unlocked
                  ? 'APPS DÉBLOQUÉES'
                  : 'TON ESPACE DE CONCENTRATION'}
            </Text>
            <Text style={styles.statusValue}>
              {snapshot.isBlocked
                ? 'Tes apps sont protégées.'
                : snapshot.authorizationStatus === AUTHORIZATION.denied
                  ? 'Tu peux réessayer quand tu veux.'
                : unlocked && snapshot.unlockUntil
                  ? `${formatRemaining(remainingSeconds ?? 0)} restantes`
                  : 'Une petite pause, à ta façon.'}
            </Text>
          </View>
        </View>

        {!screenTimeAvailable ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Screen Time est nécessaire</Text>
            <Text style={styles.noticeText}>
              Le blocage système fonctionne uniquement sur un iPhone avec un build iOS Tempo.
              Cette fonction n’est pas disponible dans Expo Go, sur Android ou sur le web.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Tes applications</Text>
                <Text style={styles.sectionSubtitle}>
                  {snapshot.simulation
                    ? 'Catégories fictives, enregistrées sur cet appareil'
                    : 'La sélection reste privée sur ton iPhone'}
                </Text>
              </View>
            </View>

            <View style={styles.selectionCard}>
              <View style={styles.selectionCardTop}>
                <View style={styles.selectionIcon}>
                  <Text style={styles.selectionIconText}>◎</Text>
                </View>
                <View style={styles.selectionCopy}>
                  <Text style={styles.selectionTitle}>
                    {selected ? 'Sélection enregistrée' : 'Aucune sélection'}
                  </Text>
                  <Text style={styles.selectionSubtitle}>
                    {selectionLabel(snapshot.selectionMetadata, snapshot.simulation)}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={!authorizationApproved || busy}
                onPress={openAppPicker}
                style={[
                  styles.secondaryButton,
                  (!authorizationApproved || busy) && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {selected ? 'Modifier ma sélection' : 'Choisir les apps'}
                </Text>
              </Pressable>
            </View>

            {!authorizationApproved ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void requestPermission()}
                  style={[styles.primaryButton, busy && styles.buttonDisabled]}
                >
                  {busy ? (
                    <ActivityIndicator color="#19372F" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Autoriser Screen Time</Text>
                  )}
                </Pressable>
                {snapshot.simulation && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void requestPermission(false)}
                    style={styles.simulationDeclineButton}
                  >
                    <Text style={styles.simulationDeclineText}>Simuler un refus</Text>
                  </Pressable>
                )}
              </>
            ) : snapshot.isBlocked ? (
              snapshot.simulation ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/simulation-shield')}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Voir l’app bloquée simulée</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/quiz')}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Faire le quiz pour débloquer</Text>
                </Pressable>
              )
            ) : unlocked ? (
              <View style={styles.unlockNote}>
                <Text style={styles.unlockNoteText}>
                  Tes apps seront automatiquement rebloquées à la fin du compte à rebours.
                </Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={busy || !selected}
                onPress={startBlocking}
                style={[
                  styles.primaryButton,
                  (!selected || busy) && styles.buttonDisabled,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#19372F" />
                ) : (
                  <Text style={styles.primaryButtonText}>Activer le blocage</Text>
                )}
              </Pressable>
            )}
          </>
        )}

        {errorMessage && (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.note}>
          <Text style={styles.noteIcon}>✦</Text>
          <Text style={styles.noteText}>
            {snapshot.simulation
              ? 'Cette simulation reste sur ton appareil et ne bloque aucune app réelle.'
              : 'iOS protège tes choix : Tempo ne voit jamais le nom des apps sélectionnées.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut().catch((error: unknown) =>
              setErrorMessage(getErrorMessage(error)),
            );
          }}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>

      <ScreenTimePicker
        visible={pickerVisible}
        selectionToken={snapshot.selectionToken}
        onSelectionChange={handleSelectionChange}
        onDismiss={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8F4' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 36 },
  simulationBanner: {
    backgroundColor: '#FFF4D8',
    borderColor: '#E8D19A',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  simulationBannerTitle: { color: '#765920', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  simulationBannerText: { color: '#796B52', fontSize: 12, marginTop: 3 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, marginBottom: 34 },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#1A3D34',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandMarkText: { color: '#D9F27C', fontSize: 21, fontWeight: '800', lineHeight: 25 },
  brand: { color: '#1A3D34', fontSize: 19, fontWeight: '800', letterSpacing: -0.7 },
  todayPill: {
    marginLeft: 'auto',
    backgroundColor: '#EAEEE7',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  todayPillText: { color: '#65716A', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  eyebrow: { color: '#6C8A66', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#19372F', fontSize: 39, lineHeight: 42, fontWeight: '800', letterSpacing: -1.8 },
  intro: { color: '#78817A', fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 25 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EEF0EA',
    padding: 18,
    marginBottom: 30,
  },
  statusCardActive: { backgroundColor: '#1A3D34', borderColor: '#1A3D34' },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#EAEEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconText: { color: '#1A3D34', fontSize: 23, fontWeight: '700' },
  statusCopy: { flex: 1, marginLeft: 13 },
  statusLabel: { color: '#89918A', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  statusValue: { color: '#20372F', fontSize: 16, fontWeight: '700' },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { color: '#1B352E', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitle: { color: '#89918A', fontSize: 12, marginTop: 4 },
  selectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#EEF0EA',
    padding: 16,
    marginBottom: 14,
  },
  selectionCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  selectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#F0F4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIconText: { color: '#4C7054', fontSize: 24, fontWeight: '700' },
  selectionCopy: { flex: 1, marginLeft: 12 },
  selectionTitle: { color: '#20372F', fontSize: 14, fontWeight: '700' },
  selectionSubtitle: { color: '#89918A', fontSize: 12, marginTop: 4 },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F2F4EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: '#1A3D34', fontSize: 13, fontWeight: '700' },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: '#DDF18C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 3,
  },
  primaryButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  simulationDeclineButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 13 },
  simulationDeclineText: { color: '#7B847D', fontSize: 12, fontWeight: '700' },
  buttonDisabled: { opacity: 0.48 },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF0EA',
    padding: 18,
  },
  noticeTitle: { color: '#20372F', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  noticeText: { color: '#78817A', fontSize: 13, lineHeight: 20 },
  errorCard: {
    backgroundColor: '#FDE9E7',
    borderRadius: 14,
    padding: 13,
    marginTop: 12,
  },
  errorText: { color: '#8C302C', fontSize: 13, lineHeight: 19 },
  unlockNote: { backgroundColor: '#EAEEE7', borderRadius: 15, padding: 14 },
  unlockNoteText: { color: '#4D6256', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  note: { flexDirection: 'row', marginTop: 22, paddingHorizontal: 3 },
  noteIcon: { color: '#789164', fontSize: 14, marginRight: 8 },
  noteText: { flex: 1, color: '#89918A', fontSize: 11, lineHeight: 17 },
  signOutButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 15 },
  signOutText: { color: '#7B847D', fontSize: 12, fontWeight: '700' },
});
