import {Redirect, useLocalSearchParams} from 'expo-router';
import PlayerScreen from '../../src/screens/Player';
import {findSession} from '../../src/sleep/sessions';
import {useSleepState} from '../../src/sleep/state';

export default function PlayerRoute() {
  const {id} = useLocalSearchParams<{id: string}>();
  const {canPlayPremium} = useSleepState();
  const session = findSession(id);
  if (!session) {
    return <Redirect href="/sleep" />;
  }
  // The gate is enforced here too, so a deep link can't skip the Paywall.
  if (session.premium && !canPlayPremium) {
    return <Redirect href="/paywall" />;
  }
  return <PlayerScreen session={session} />;
}
