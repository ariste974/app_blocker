import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../providers/AuthProvider';
import { useBilling } from '../providers/BillingProvider';

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(timestamp);
}

export default function PaywallScreen() {
  const { signOut } = useAuth();
  const billing = useBilling();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const waiting = billing.flow !== 'idle';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>t</Text>
          </View>
          <Text style={styles.brand}>tempo</Text>
        </View>

        <Text style={styles.eyebrow}>TON ESPACE DE CONCENTRATION</Text>
        <Text style={styles.title}>Continue à avancer.</Text>
        <Text style={styles.description}>
          Ton accès à Tempo est suspendu. Active ton abonnement pour retrouver tes
          outils de concentration et le blocage de tes applications.
        </Text>

        <View style={styles.planCard}>
          <Text style={styles.planName}>Tempo Premium</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>3 €</Text>
            <Text style={styles.priceSuffix}>/ mois</Text>
          </View>
          <Text style={styles.planDetail}>Résiliable à tout moment depuis ton compte.</Text>
          {billing.access?.status === 'trialing' &&
            formatDate(billing.access.trial_ends_at) && (
              <Text style={styles.trialDetail}>
                Ton essai gratuit se termine le{' '}
                {formatDate(billing.access.trial_ends_at)}.
              </Text>
            )}
        </View>

        {billing.error && (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{billing.error}</Text>
          </View>
        )}
        {billing.screenTimeError && (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>
              Le déblocage Screen Time a échoué : {billing.screenTimeError}
            </Text>
          </View>
        )}
        {billing.flow === 'syncing' && (
          <View accessibilityRole="status" style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Paiement terminé ? Nous attendons la confirmation sécurisée de Stripe…
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={waiting}
          onPress={() => void billing.startCheckout()}
          style={[styles.primaryButton, waiting && styles.disabledButton]}
        >
          {waiting ? (
            <ActivityIndicator color="#213B2D" />
          ) : (
            <Text style={styles.primaryButtonText}>S’abonner — 3 €/mois</Text>
          )}
        </Pressable>

        {billing.access?.has_customer && (
          <Pressable
            accessibilityRole="button"
            disabled={waiting}
            onPress={() => void billing.openPortal()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Gérer mon abonnement</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={waiting}
          onPress={() => void billing.refresh()}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>J’ai déjà payé — actualiser</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut().catch((error: unknown) => {
              setSignOutError(
                error instanceof Error ? error.message : 'La déconnexion a échoué.',
              );
            });
          }}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
        {signOutError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {signOutError}
          </Text>
        )}
        <Text style={styles.testNotice}>
          Paiements de démonstration en mode test. Aucun débit réel n’est effectué.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8F4' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 52 },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#1A3D34',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandMarkText: { color: '#D9F27C', fontSize: 22, fontWeight: '800', lineHeight: 26 },
  brand: { color: '#1A3D34', fontSize: 20, fontWeight: '800', letterSpacing: -0.7 },
  eyebrow: { color: '#6C8A66', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 9 },
  title: { color: '#19372F', fontSize: 35, lineHeight: 41, fontWeight: '800', letterSpacing: -1.5 },
  description: { color: '#78817A', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 24 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8ECE5',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  planName: { color: '#19372F', fontSize: 16, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 13 },
  price: { color: '#19372F', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  priceSuffix: { color: '#78817A', fontSize: 14, marginLeft: 5 },
  planDetail: { color: '#78817A', fontSize: 12, marginTop: 5 },
  trialDetail: { color: '#6C8A66', fontSize: 12, lineHeight: 18, marginTop: 12 },
  errorCard: {
    backgroundColor: '#FFF0ED',
    borderColor: '#F4C8BF',
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },
  errorText: { color: '#963D2D', fontSize: 12, lineHeight: 18 },
  noticeCard: {
    backgroundColor: '#F1F4EA',
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },
  noticeText: { color: '#53664A', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    backgroundColor: '#D9F27C',
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DAE0D9',
    marginTop: 10,
  },
  secondaryButtonText: { color: '#1A3D34', fontSize: 13, fontWeight: '700' },
  refreshButton: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 16 },
  refreshText: { color: '#53664A', fontSize: 12, fontWeight: '700' },
  signOutButton: { alignSelf: 'center', padding: 12 },
  signOutText: { color: '#7B847D', fontSize: 12, fontWeight: '700' },
  testNotice: { color: '#89918A', fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 7 },
});
