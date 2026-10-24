import type {Language, SeededBug} from './state';

/** Every visible string of the sleep screens, in English and Spanish. */
const STRINGS = {
  en: {
    sleepTitle: 'Sleep',
    free: 'Free',
    premium: 'Premium',
    settings: 'Settings',
    subscription: 'Subscription',
    language: 'Language',
    playing: 'Playing',
    paused: 'Paused',
    play: 'Play',
    pause: 'Pause',
    close: 'Close',
    paywallTitle: 'Unlock every session',
    paywallBody: 'Premium sessions need an active subscription.',
    yearly: 'Yearly $59.99',
    monthly: 'Monthly $9.99',
    startTrial: 'Start 7-day trial',
  },
  es: {
    sleepTitle: 'Dormir',
    free: 'Gratis',
    premium: 'Premium',
    settings: 'Ajustes',
    subscription: 'Suscripción',
    language: 'Idioma',
    playing: 'Reproduciendo',
    paused: 'En pausa',
    play: 'Reproducir',
    pause: 'Pausar',
    close: 'Cerrar',
    paywallTitle: 'Desbloquea todas las sesiones',
    paywallBody: 'Las sesiones premium necesitan una suscripción activa.',
    yearly: 'Anual $59.99',
    monthly: 'Mensual $9.99',
    startTrial: 'Empieza la prueba de 7 días',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['en'];

/** Seeded bug `i18n`: the Paywall title was never translated. */
export function t(lang: Language, key: StringKey, bug: SeededBug = 'none'): string {
  if (bug === 'i18n' && key === 'paywallTitle') {
    return STRINGS.en.paywallTitle;
  }
  return STRINGS[lang][key];
}
