import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, useColorScheme, View} from 'react-native';
import {useRouter} from 'expo-router';
import {STATUS_BAR_HEIGHT} from '../components/StatusBar';
import {testProperties} from '../config/TestProperties';
import Colors from '../config/Colors';
import {t} from '../sleep/i18n';
import {SESSIONS} from '../sleep/sessions';
import {LANGUAGES, SUBSCRIPTIONS, useSleepState} from '../sleep/state';

const SleepScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const router = useRouter();
  const {sub, lang, bug, setSub, setLang, canPlayPremium} = useSleepState();
  const color = {color: isDarkMode ? Colors.white : Colors.black};

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: isDarkMode ? Colors.dark : Colors.lighter}]}
      {...testProperties('Sleep-screen')}>
      <Text style={[styles.title, color]} {...testProperties('Sleep-title')}>
        {t(lang, 'sleepTitle', bug)}
      </Text>

      {SESSIONS.map(session => (
        <Pressable
          key={session.id}
          style={styles.session}
          onPress={() =>
            router.push(session.premium && !canPlayPremium ? '/paywall' : `/player/${session.id}`)
          }
          {...testProperties(`Session-${session.id}`)}>
          <Text style={[styles.sessionTitle, color]}>{session.title[lang]}</Text>
          <Text style={session.premium ? styles.premium : styles.free}>
            {t(lang, session.premium ? 'premium' : 'free', bug)}
          </Text>
        </Pressable>
      ))}

      <Text style={[styles.heading, color]}>{t(lang, 'settings', bug)}</Text>
      <Text style={[styles.label, color]}>{t(lang, 'subscription', bug)}</Text>
      <View style={styles.chips}>
        {SUBSCRIPTIONS.map(value => (
          <Pressable
            key={value}
            style={[styles.chip, value === sub && styles.chipSelected]}
            accessibilityState={{selected: value === sub}}
            onPress={() => setSub(value)}
            {...testProperties(`Sub-${value}`)}>
            <Text style={value === sub ? styles.chipTextSelected : color}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.label, color]}>{t(lang, 'language', bug)}</Text>
      <View style={styles.chips}>
        {LANGUAGES.map(value => (
          <Pressable
            key={value}
            style={[styles.chip, value === lang && styles.chipSelected]}
            accessibilityState={{selected: value === lang}}
            onPress={() => setLang(value)}
            {...testProperties(`Lang-${value}`)}>
            <Text style={value === lang ? styles.chipTextSelected : color}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, marginTop: STATUS_BAR_HEIGHT, paddingHorizontal: 20},
  title: {fontSize: 28, fontWeight: '600', marginVertical: 20},
  session: {
    minHeight: 56,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {fontSize: 18},
  free: {color: Colors.orange, fontWeight: '600'},
  premium: {color: '#7a5af8', fontWeight: '600'},
  heading: {fontSize: 22, fontWeight: '600', marginTop: 32, marginBottom: 12},
  label: {fontSize: 16, marginTop: 12, marginBottom: 8},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {backgroundColor: Colors.orange, borderColor: Colors.orange},
  chipTextSelected: {color: Colors.white, fontWeight: '600'},
});

export default SleepScreen;
