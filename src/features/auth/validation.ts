export type CredentialErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};

  if (!emailPattern.test(email.trim())) {
    errors.email = 'Saisis une adresse e-mail valide.';
  }
  if (password.length < 8) {
    errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
  }

  return errors;
}

export function getSupabaseConfigurationError(url: string, publicKey: string): string | null {
  if (!url || !publicKey) {
    return 'Supabase n’est pas configuré. Copie .env.example en .env et renseigne l’URL du projet et sa clé anon publique.';
  }

  try {
    const parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== 'https:' &&
      !(parsedUrl.protocol === 'http:' &&
        (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'))
    ) {
      return 'L’URL Supabase doit utiliser HTTPS (ou localhost en développement).';
    }

    if (parsedUrl.hostname === 'supabase.com' || parsedUrl.hostname === 'www.supabase.com') {
      return 'Cette URL correspond au site Supabase, pas à ton projet. Dans Supabase, ouvre Project Settings → API et copie la valeur « Project URL » (par exemple https://<project-ref>.supabase.co) dans EXPO_PUBLIC_SUPABASE_URL.';
    }
  } catch {
    return 'L’URL Supabase configurée est invalide.';
  }

  return null;
}

export function getAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';

  if (/invalid login credentials/i.test(message)) {
    return 'E-mail ou mot de passe incorrect.';
  }
  if (/already registered|user already exists/i.test(message)) {
    return 'Cette adresse e-mail possède déjà un compte.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirme ton adresse e-mail avant de te connecter.';
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.';
  }
  if (/unexpected end of (?:json )?input|json parse|not valid json/i.test(message)) {
    return 'Supabase a renvoyé une réponse invalide. Vérifie l’URL API de ton projet dans Supabase → Project Settings → API, puis redémarre Expo.';
  }

  return message;
}
