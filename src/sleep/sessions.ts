/** The session catalog. Every session plays the same bundled tone; only the gating differs. */
export type Session = {
  id: string;
  title: {en: string; es: string};
  premium: boolean;
};

export const SESSIONS: Session[] = [
  {id: 'evening-wind-down', title: {en: 'Evening Wind Down', es: 'Relajación nocturna'}, premium: false},
  {id: 'rain-on-the-roof', title: {en: 'Rain on the Roof', es: 'Lluvia en el tejado'}, premium: false},
  {id: 'deep-sleep-journey', title: {en: 'Deep Sleep Journey', es: 'Viaje al sueño profundo'}, premium: true},
  {id: 'ocean-night', title: {en: 'Ocean Night', es: 'Noche en el océano'}, premium: true},
];

export const findSession = (id: string): Session | undefined => SESSIONS.find(s => s.id === id);
