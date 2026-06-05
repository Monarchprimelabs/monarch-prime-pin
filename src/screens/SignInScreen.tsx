import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, BrandMark } from '../components/UI';
import { colors, radius, DEV_PASSCODE } from '../theme';
import { useAuth } from '../lib/auth';

declare const __DEV__: boolean;

export function SignInScreen() {
  const { signInEmail, signUp, signInDeveloper } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [logoTaps, setLogoTaps] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    if (!__DEV__) return;
    setLogoTaps(t => t + 1);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setLogoTaps(0), 3000);
    if (logoTaps + 1 >= 5) {
      setShowPasscode(true);
      setLogoTaps(0);
    }
  };

  const handlePasscode = async () => {
    if (passcode === DEV_PASSCODE) {
      await signInDeveloper();
    } else {
      setPasscodeError('Invalid passcode');
      setTimeout(() => setPasscodeError(''), 2000);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your name so Monarch Prime Pin can personalize your dashboard.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
      } else {
        await signInEmail(email, password);
      }
    } catch (e: any) {
      Alert.alert('Authentication failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.app} edges={['top', 'bottom']}>
      <Disclaimer />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={handleLogoTap} style={s.logoWrap}>
            <BrandMark large />
          </Pressable>

          <Text style={s.subBrand}>PIN · RESEARCH TRACKER</Text>

          {!showPasscode ? (
            <>
              <View style={s.modeTabs}>
                {(['signin', 'signup'] as const).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    style={[s.modeTab, mode === m && s.modeTabActive]}
                  >
                    <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                      {m === 'signin' ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {mode === 'signup' && (
                <TextInput
                  placeholder="Name"
                  placeholderTextColor={colors.textFaint}
                  value={name}
                  onChangeText={setName}
                  style={s.input}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                />
              )}
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.textFaint}
                value={email}
                onChangeText={setEmail}
                style={s.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textFaint}
                value={password}
                onChangeText={setPassword}
                style={s.input}
                secureTextEntry
              />

              <Pressable style={s.primary} onPress={handleAuth} disabled={loading}>
                <Text style={s.primaryText}>
                  {loading ? '...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={s.passWrap}>
              <Text style={s.passTitle}>Developer Bypass</Text>
              <Text style={s.passSub}>Enter 4-digit passcode</Text>
              <TextInput
                value={passcode}
                onChangeText={(v) => setPasscode(v.replace(/\D/g, ''))}
                style={s.passInput}
                maxLength={4}
                keyboardType="number-pad"
                secureTextEntry
                autoFocus
                onSubmitEditing={handlePasscode}
              />
              {!!passcodeError && <Text style={s.passError}>{passcodeError}</Text>}
              <Pressable style={s.primary} onPress={handlePasscode}>
                <Text style={s.primaryText}>Unlock</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowPasscode(false); setPasscode(''); }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          <Text style={s.footer}>
            For Research Use Only · Not for Human Consumption
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, alignItems: 'center', paddingBottom: 60 },
  logoWrap: { marginTop: 24, marginBottom: 4 },
  subBrand: {
    fontSize: 11, color: colors.accent, letterSpacing: 2.5,
    marginBottom: 32, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modeTabs: {
    flexDirection: 'row', width: '100%', maxWidth: 360,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 3, marginBottom: 18,
  },
  modeTab: { flex: 1, paddingVertical: 12, borderRadius: 9, alignItems: 'center' },
  modeTabActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)' },
  modeTabText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  modeTabTextActive: { color: colors.white },
  input: {
    width: '100%', maxWidth: 360,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 15, marginBottom: 10,
  },
  primary: {
    width: '100%', maxWidth: 360,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: 6, marginBottom: 18,
  },
  primaryText: { color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  footer: { fontSize: 10, color: colors.textDim, letterSpacing: 1.5, marginTop: 32, textAlign: 'center' },

  passWrap: {
    width: '100%', maxWidth: 360, alignItems: 'center', padding: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: radius.lg,
  },
  passTitle: { fontSize: 18, fontWeight: '700', color: colors.accent, marginBottom: 4 },
  passSub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  passInput: {
    width: 160, textAlign: 'center', fontSize: 32, letterSpacing: 12, padding: 14,
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.4)',
    borderRadius: radius.md, color: colors.white, marginBottom: 14,
  },
  passError: { color: colors.red, fontSize: 13, marginBottom: 10 },
  cancelText: { color: colors.textMuted, fontSize: 14 },
});
