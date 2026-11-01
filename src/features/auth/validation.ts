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

  return message;
}
