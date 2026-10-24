import {useEffect} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {pick, SEEDED_BUGS, SEEDED_BUGS_ENABLED, useSleepState} from '../src/sleep/state';

/**
 * wdio://debug?bug=paywall switches on one seeded bug (none, bg_audio, paywall, i18n). Test
 * builds only: without EXPO_PUBLIC_SEEDED_BUGS=1 the link changes nothing.
 */
export default function DebugLink() {
  const {bug} = useLocalSearchParams<{bug?: string}>();
  const {setBug} = useSleepState();
  const router = useRouter();

  useEffect(() => {
    if (SEEDED_BUGS_ENABLED && bug) {
      setBug(pick(SEEDED_BUGS, bug, 'none'));
    }
    router.replace('/sleep');
    // Runs once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
