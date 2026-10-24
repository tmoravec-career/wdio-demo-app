import React from 'react';
import {Pressable, StyleSheet, Text, useColorScheme, View} from 'react-native';
import {useRouter} from 'expo-router';
import {STATUS_BAR_HEIGHT} from '../components/StatusBar';
import {testProperties} from '../config/TestProperties';
import Colors from '../config/Colors';
import {t} from '../sleep/i18n';
import {useSleepState} from '../sleep/state';

/** A mocked Paywall: no purchase SDK. "Start trial" only switches the mocked subscription. */
const PaywallScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const router = useRouter();
  const {lang, bug, setSub} = useSleepState();
  const color = {color: isDarkMode ? Colors.white : Colors.black};

  return (
    <View
      style={[styles.container, {backgroundColor: isDarkMode ? Colors.dark : Colors.lighter}]}
      {...testProperties('Paywall-screen')}>
      <Pressable style={styles.close} onPress={() => router.back()} {...testProperties('Paywall-close')}>
        <Text style={color}>{t(lang, 'close', bug)}</Text>
      </Pressable>
      <Text style={[styles.title, color]} {...testProperties('Paywall-title')}>
        {t(lang, 'paywallTitle', bug)}
      </Text>
      <Text style={[styles.body, color]} {...testProperties('Paywall-body')}>
        {t(lang, 'paywallBody', bug)}
      </Text>
      <Text style={[styles.plan, color]} {...testProperties('Paywall-yearly')}>
        {t(lang, 'yearly', bug)}
      </Text>
      <Text style={[styles.plan, color]} {...testProperties('Paywall-monthly')}>
        {t(lang, 'monthly', bug)}
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          setSub('trial');
          router.back();
        }}
        {...testProperties('Paywall-startTrial')}>
        <Text style={styles.buttonText}>{t(lang, 'startTrial', bug)}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, marginTop: STATUS_BAR_HEIGHT, padding: 20},
  close: {alignSelf: 'flex-start', minHeight: 48, minWidth: 48, justifyContent: 'center'},
  title: {fontSize: 28, fontWeight: '600', marginTop: 32},
  body: {fontSize: 16, marginVertical: 16},
  plan: {fontSize: 18, marginVertical: 8},
  button: {
    marginTop: 32,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {color: Colors.white, fontSize: 18, fontWeight: '600'},
});

export default PaywallScreen;
