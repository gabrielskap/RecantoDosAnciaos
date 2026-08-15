import { supabase } from './supabaseClient';

const TABLE = 'Recanto_PreferenciasUsuario';

export interface UserPreferences {
  emailNotif: boolean;
  stockAlerts: boolean;
  dailyDigest: boolean;
  dismissedAlertIds: string[];
}

export const defaultUserPreferences: UserPreferences = {
  emailNotif: true,
  stockAlerts: true,
  dailyDigest: false,
  dismissedAlertIds: [],
};

type PreferenceRow = {
  preferencias?: {
    emailNotif?: unknown;
    stockAlerts?: unknown;
    dailyDigest?: unknown;
    dismissedAlertIds?: unknown;
  } | null;
};

const normalizeIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];

const normalizePreferences = (row: PreferenceRow | null): UserPreferences => {
  const saved = row?.preferencias;
  return {
    emailNotif: typeof saved?.emailNotif === 'boolean' ? saved.emailNotif : defaultUserPreferences.emailNotif,
    stockAlerts: typeof saved?.stockAlerts === 'boolean' ? saved.stockAlerts : defaultUserPreferences.stockAlerts,
    dailyDigest: typeof saved?.dailyDigest === 'boolean' ? saved.dailyDigest : defaultUserPreferences.dailyDigest,
    dismissedAlertIds: normalizeIds(saved?.dismissedAlertIds),
  };
};

export async function fetchUserPreferences(authUserId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('preferencias')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizePreferences(data as PreferenceRow) : null;
}

async function savePreferences(
  authUserId: string,
  empresaId: string,
  preferences: UserPreferences,
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      auth_user_id: authUserId,
      empresa_id: empresaId,
      preferencias: preferences,
    }, { onConflict: 'empresa_id,auth_user_id' });

  if (error) throw error;
}

export async function saveProfilePreferences(
  authUserId: string,
  empresaId: string,
  preferences: Pick<UserPreferences, 'emailNotif' | 'stockAlerts' | 'dailyDigest'>,
): Promise<void> {
  const existing = await fetchUserPreferences(authUserId);
  await savePreferences(authUserId, empresaId, {
    ...(existing ?? defaultUserPreferences),
    ...preferences,
  });
}

export async function saveDismissedAlertIds(
  authUserId: string,
  empresaId: string,
  dismissedAlertIds: Iterable<string>,
): Promise<void> {
  const existing = await fetchUserPreferences(authUserId);
  await savePreferences(authUserId, empresaId, {
    ...(existing ?? defaultUserPreferences),
    dismissedAlertIds: Array.from(new Set(dismissedAlertIds)),
  });
}
