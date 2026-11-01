import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { getAuthErrorMessage, validateCredentials } from '../features/auth/validation';
import { useAuth } from '../providers/AuthProvider';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
};

export function AuthForm({ mode }: AuthFormProps) {
  const isRegistration = mode === 'sign-up';
  const { signIn, signUp, isConfigured, configurationError, initializationError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validationErrors = validateCredentials(email, password);
    setFieldErrors(validationErrors);
    setErrorMessage(null);
    setNotice(null);
    if (validationErrors.email || validationErrors.password) return;

    if (!isConfigured) {
      setErrorMessage(configurationError ?? 'La configuration Supabase est indisponible.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegistration) {
        const emailConfirmationRequired = await signUp(email.trim(), password);
        if (emailConfirmationRequired) {
          setNotice('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>t</Text>
            </View>
            <Text style={styles.brand}>tempo</Text>
          </View>

          <Text style={styles.eyebrow}>TON ESPACE DE CONCENTRATION</Text>
          <Text style={styles.title}>
            {isRegistration ? 'Crée ton compte.' : 'Ravi de te revoir.'}
          </Text>
          <Text style={styles.description}>
            {isRegistration
              ? 'Un compte pour retrouver ta session et continuer à ton rythme.'
              : 'Connecte-toi pour retrouver ton espace Tempo.'}
          </Text>

          {configurationError && (
            <View style={styles.configurationNotice}>
              <Text style={styles.configurationTitle}>Configuration nécessaire</Text>
              <Text style={styles.configurationText}>{configurationError}</Text>
            </View>
          )}
          {initializationError && (
            <View accessibilityRole="alert" style={styles.errorCard}>
              <Text style={styles.errorText}>{initializationError}</Text>
            </View>
          )}
          {errorMessage && (
            <View accessibilityRole="alert" style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
          {notice && (
            <View accessibilityRole="status" style={styles.successCard}>
              <Text style={styles.successText}>{notice}</Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>Adresse e-mail</Text>
          <TextInput
            accessibilityLabel="Adresse e-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="toi@exemple.com"
            placeholderTextColor="#A0A8A0"
            returnKeyType="next"
            style={[styles.input, fieldErrors.email && styles.inputError]}
            textContentType="emailAddress"
            value={email}
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          <Text style={[styles.fieldLabel, styles.passwordLabel]}>Mot de passe</Text>
          <TextInput
            accessibilityLabel="Mot de passe"
            autoCapitalize="none"
            autoComplete={isRegistration ? 'new-password' : 'current-password'}
            onChangeText={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            onSubmitEditing={() => void submit()}
            placeholder="8 caractères minimum"
            placeholderTextColor="#A0A8A0"
            returnKeyType="done"
            secureTextEntry
            style={[styles.input, fieldErrors.password && styles.inputError]}
            textContentType={isRegistration ? 'newPassword' : 'password'}
            value={password}
          />
          {fieldErrors.password && (
            <Text style={styles.fieldError}>{fieldErrors.password}</Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#213B2D" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegistration ? 'Créer mon compte' : 'Se connecter'}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isRegistration ? 'Tu as déjà un compte ?' : 'Pas encore de compte ?'}
            </Text>
            <Link asChild href={isRegistration ? '/sign-in' : '/sign-up'}>
              <Pressable accessibilityRole="link">
                <Text style={styles.switchLink}>
                  {isRegistration ? 'Se connecter' : 'Créer un compte'}
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8F4' },
  keyboardView: { flex: 1 },
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
  description: { color: '#78817A', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 26 },
  configurationNotice: {
    backgroundColor: '#FFF7E8',
    borderColor: '#F1D9A7',
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 17,
  },
  configurationTitle: { color: '#795B27', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  configurationText: { color: '#796B52', fontSize: 12, lineHeight: 18 },
  errorCard: {
    backgroundColor: '#FDEDEC',
    borderRadius: 13,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#A43B32', fontSize: 13, lineHeight: 19 },
  successCard: {
    backgroundColor: '#EAF2D6',
    borderRadius: 13,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: '#365334', fontSize: 13, lineHeight: 19 },
  fieldLabel: { color: '#31453A', fontSize: 12, fontWeight: '700', marginBottom: 7 },
  passwordLabel: { marginTop: 18 },
  input: {
    minHeight: 53,
    borderWidth: 1,
    borderColor: '#E5E9E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    color: '#20372F',
    fontSize: 14,
  },
  inputError: { borderColor: '#D16B62' },
  fieldError: { color: '#A43B32', fontSize: 11, marginTop: 5 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: '#DDF18C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  primaryButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 22,
  },
  switchText: { color: '#78817A', fontSize: 12 },
  switchLink: { color: '#416A3B', fontSize: 12, fontWeight: '800' },
});
