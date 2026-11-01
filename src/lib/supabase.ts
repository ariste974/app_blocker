import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function getConfigurationError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Supabase n’est pas configuré. Copie .env.example en .env et renseigne l’URL du projet et sa clé anon publique.';
  }

  try {
    const url = new URL(supabaseUrl);
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')
    ) {
      return 'L’URL Supabase doit utiliser HTTPS (ou localhost en développement).';
    }
  } catch {
    return 'L’URL Supabase configurée est invalide.';
  }

  return null;
}

export const supabaseConfigurationError = getConfigurationError();
export const supabase = supabaseConfigurationError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
