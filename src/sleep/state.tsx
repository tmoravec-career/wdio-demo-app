import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import Storage from 'expo-sqlite/kv-store';

/**
 * Mocked sleep-app state: subscription, language, and the seeded bug. Persisted, so it survives a
 * relaunch. Set from the Sleep tab or by deep link: wdio://state?sub=trial&lang=es and, in test
 * builds only, wdio://debug?bug=paywall.
 */

export const SUBSCRIPTIONS = ['free', 'trial', 'active', 'expired'] as const;
export type Subscription = (typeof SUBSCRIPTIONS)[number];

export const LANGUAGES = ['en', 'es'] as const;
export type Language = (typeof LANGUAGES)[number];

export const SEEDED_BUGS = ['none', 'bg_audio', 'paywall', 'i18n'] as const;
export type SeededBug = (typeof SEEDED_BUGS)[number];

/** Test builds set EXPO_PUBLIC_SEEDED_BUGS=1 at bundle time; release builds leave it unset. */
export const SEEDED_BUGS_ENABLED = process.env.EXPO_PUBLIC_SEEDED_BUGS === '1';

type SleepState = {sub: Subscription; lang: Language; bug: SeededBug};

type SleepStateValue = SleepState & {
  setSub: (sub: Subscription) => void;
  setLang: (lang: Language) => void;
  setBug: (bug: SeededBug) => void;
  /** True when this subscription may play premium sessions (honouring the `paywall` bug). */
  canPlayPremium: boolean;
};

const KEY = 'sleep-state';
const DEFAULT: SleepState = {sub: 'free', lang: 'en', bug: 'none'};

export const pick = <T extends string>(allowed: readonly T[], value: unknown, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

function load(): SleepState {
  try {
    const saved = JSON.parse(Storage.getItemSync(KEY) ?? '{}') as Partial<SleepState>;
    return {
      sub: pick(SUBSCRIPTIONS, saved.sub, DEFAULT.sub),
      lang: pick(LANGUAGES, saved.lang, DEFAULT.lang),
      bug: SEEDED_BUGS_ENABLED ? pick(SEEDED_BUGS, saved.bug, DEFAULT.bug) : 'none',
    };
  } catch {
    return DEFAULT;
  }
}

const SleepStateContext = createContext<SleepStateValue | null>(null);

export function SleepStateProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<SleepState>(load);
  const update = useCallback((patch: Partial<SleepState>) => {
    setState(prev => {
      const next = {...prev, ...patch};
      Storage.setItemSync(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<SleepStateValue>(
    () => ({
      ...state,
      setSub: sub => update({sub}),
      setLang: lang => update({lang}),
      setBug: bug => update({bug: SEEDED_BUGS_ENABLED ? bug : 'none'}),
      canPlayPremium:
        state.sub === 'trial' ||
        state.sub === 'active' ||
        // Seeded bug: the entitlement check forgets that an expired subscription has lapsed.
        (state.bug === 'paywall' && state.sub === 'expired'),
    }),
    [state, update],
  );

  return <SleepStateContext.Provider value={value}>{children}</SleepStateContext.Provider>;
}

export function useSleepState(): SleepStateValue {
  const value = useContext(SleepStateContext);
  if (!value) {
    throw new Error('useSleepState must be used inside SleepStateProvider');
  }
  return value;
}
