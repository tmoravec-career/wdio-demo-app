import {useEffect} from 'react';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {LANGUAGES, pick, SUBSCRIPTIONS, useSleepState} from '../src/sleep/state';

/** wdio://state?sub=trial&lang=es sets the mocked subscription and language, then opens Sleep. */
export default function StateLink() {
  const params = useLocalSearchParams<{sub?: string; lang?: string}>();
  const {sub, lang, setSub, setLang} = useSleepState();
  const router = useRouter();

  useEffect(() => {
    if (params.sub) {
      setSub(pick(SUBSCRIPTIONS, params.sub, sub));
    }
    if (params.lang) {
      setLang(pick(LANGUAGES, params.lang, lang));
    }
    router.replace('/sleep');
    // Runs once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
