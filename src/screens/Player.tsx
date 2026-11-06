import React, {useEffect} from 'react';
import {AppState, Pressable, StyleSheet, Text, useColorScheme, View} from 'react-native';
import {setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus} from 'expo-audio';
import {useRouter} from 'expo-router';
import {STATUS_BAR_HEIGHT} from '../components/StatusBar';
import {testProperties} from '../config/TestProperties';
import Colors from '../config/Colors';
import {t} from '../sleep/i18n';
import type {Session} from '../sleep/sessions';
import {useSleepState} from '../sleep/state';

const TONE = require('../assets/sleep-tone.m4a');

/** 83 seconds → "1:23". */
const clock = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const PlayerScreen = ({session}: {session: Session}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const router = useRouter();
  const {lang, bug} = useSleepState();
  const player = useAudioPlayer(TONE);
  const status = useAudioPlayerStatus(player);
  const color = {color: isDarkMode ? Colors.white : Colors.black};

  useEffect(() => {
    // Keep playing in the background and on the lock screen. On Android, the lock-screen
    // controls are what keep playback alive past about three minutes in the background.
    setAudioModeAsync({shouldPlayInBackground: true, playsInSilentMode: true, interruptionMode: 'doNotMix'}).then(() => {
      player.setActiveForLockScreen(true, {title: session.title[lang], artist: 'Demo app'});
      player.play();
    });
    return () => {
      // useAudioPlayer may release the native player before this cleanup runs (it does on
      // unmount on Android); calling into a released player throws and crashes the app.
      try {
        player.clearLockScreenControls();
      } catch {
        // Already released: its lock-screen controls went with it.
      }
    };
  }, [player, session, lang]);

  useEffect(() => {
    if (bug !== 'bg_audio') {
      return;
    }
    // Seeded bug: playback stops whenever the app leaves the foreground.
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        player.pause();
      }
    });
    return () => subscription.remove();
  }, [bug, player]);

  return (
    <View
      style={[styles.container, {backgroundColor: isDarkMode ? Colors.dark : Colors.lighter}]}
      {...testProperties('Player-screen')}>
      <Pressable style={styles.close} onPress={() => router.back()} {...testProperties('Player-close')}>
        <Text style={color}>{t(lang, 'close', bug)}</Text>
      </Pressable>
      <Text style={[styles.title, color]} {...testProperties('Player-title')}>
        {session.title[lang]}
      </Text>
      <Text style={[styles.status, color]} {...testProperties('Player-status')}>
        {t(lang, status.playing ? 'playing' : 'paused', bug)}
      </Text>
      <Text style={[styles.elapsed, color]} {...testProperties('Player-elapsed')}>
        {clock(status.currentTime)}
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => (status.playing ? player.pause() : player.play())}
        {...testProperties(status.playing ? 'Player-pause' : 'Player-play')}>
        <Text style={styles.buttonText}>{t(lang, status.playing ? 'pause' : 'play', bug)}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, marginTop: STATUS_BAR_HEIGHT, padding: 20, alignItems: 'center'},
  close: {alignSelf: 'flex-start', minHeight: 48, minWidth: 48, justifyContent: 'center'},
  title: {fontSize: 26, fontWeight: '600', marginTop: 40, textAlign: 'center'},
  status: {fontSize: 18, marginTop: 24},
  elapsed: {fontSize: 48, fontVariant: ['tabular-nums'], marginVertical: 24},
  button: {
    minHeight: 56,
    minWidth: 160,
    borderRadius: 28,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {color: Colors.white, fontSize: 18, fontWeight: '600'},
});

export default PlayerScreen;
