/**
 * Test data mirrors the app's catalog (src/sleep/sessions.ts, src/sleep/i18n.ts) on purpose:
 * the suite states what the product should do, independently of the app code.
 */
import type { Language, Subscription } from '../support/app.js';

export const FREE_SESSION = { id: 'evening-wind-down', title: { en: 'Evening Wind Down', es: 'Relajación nocturna' } };
export const PREMIUM_SESSION = { id: 'deep-sleep-journey', title: { en: 'Deep Sleep Journey', es: 'Viaje al sueño profundo' } };

/** The entitlement rule: who may play premium content. */
export const ENTITLEMENTS: { sub: Subscription; premium: boolean }[] = [
  { sub: 'free', premium: false },
  { sub: 'trial', premium: true },
  { sub: 'active', premium: true },
  { sub: 'expired', premium: false },
];

export const COPY: Record<Language, { sleepTitle: string; paywallTitle: string; playing: string }> = {
  en: { sleepTitle: 'Sleep', paywallTitle: 'Unlock every session', playing: 'Playing' },
  es: { sleepTitle: 'Dormir', paywallTitle: 'Desbloquea todas las sesiones', playing: 'Reproduciendo' },
};
