import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, FormattedText } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../lib/auth';
import { aiAnswer } from '../data/aiKnowledge';

type Message = { role: 'user' | 'ai'; text: string; refs?: string[]; isRefusal?: boolean };

export function AICoachScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: `Hello, ${user?.name || 'Researcher'}.\n\nI'm **Prime Coach** — your educational research assistant. Ask me about peptide pharmacology, titration patterns from published trials, reconstitution principles, or site rotation practices.\n\n_I'm in **Educational Mode** — I provide research context, not personal dosing advice._`,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, thinking]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const result = aiAnswer(text);
      setMessages(m => [...m, { role: 'ai', text: result.answer, refs: result.refs, isRefusal: result.isRefusal }]);
      setThinking(false);
    }, 800);
  };

  const suggestions = [
    'How does titration work?',
    'What is half-life?',
    'How do I reconstitute a peptide?',
    'Why rotate injection sites?',
    'How does GLP-1 work?',
    'Storage and stability?',
  ];

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Prime Coach" subtitle="Educational Mode · AI Assistant" />

      <View style={s.tierWrap}>
        <View style={s.tierFree}>
          <Text style={s.tierFreeText}>● FREE TIER</Text>
        </View>
        <Pressable style={s.tierUpgrade}>
          <Text style={s.tierUpgradeText}>⭐ Upgrade to Prime AI+</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        {messages.map((m, i) => (
          <View key={i} style={m.role === 'user' ? s.msgUser : s.msgAI}>
            {m.role === 'ai' && (
              <View style={s.msgAIHeader}>
                <View style={s.aiAvatar}><Text style={{ fontSize: 14 }}>🧠</Text></View>
                <Text style={s.aiName}>Prime Coach</Text>
                {m.isRefusal && (
                  <View style={s.refuseBadge}><Text style={s.refuseBadgeText}>SAFETY</Text></View>
                )}
              </View>
            )}
            <View style={m.role === 'user' ? s.userBubble : s.aiBubble}>
              <FormattedText
                text={m.text}
                baseStyle={m.role === 'user' ? { color: colors.white } : { color: '#C8D4E6' }}
              />
              {m.refs && m.refs.length > 0 && (
                <Text style={s.refs}>References: {m.refs.join(' · ')}</Text>
              )}
            </View>
          </View>
        ))}

        {thinking && (
          <View style={s.msgAI}>
            <View style={s.msgAIHeader}>
              <View style={s.aiAvatar}><Text style={{ fontSize: 14 }}>🧠</Text></View>
              <Text style={s.aiName}>Prime Coach</Text>
            </View>
            <View style={s.aiBubble}>
              <Text style={{ color: colors.primary }}>● ● ●</Text>
            </View>
          </View>
        )}

        {messages.length <= 1 && (
          <View style={s.suggestWrap}>
            <Text style={s.suggestLabel}>TRY ASKING</Text>
            <View style={s.suggestList}>
              {suggestions.map(text => (
                <Pressable key={text} style={s.suggestChip} onPress={() => setInput(text)}>
                  <Text style={s.suggestChipText}>{text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={s.lockedCard}>
          <View style={s.lockedHeader}>
            <Text style={{ fontSize: 14 }}>🔒</Text>
            <Text style={s.lockedLabel}>PRIME AI+ FEATURES</Text>
            <View style={s.lockedBadge}><Text style={s.lockedBadgeText}>SOON</Text></View>
          </View>
          <LockedRow icon="🎯" title="Personal Titration Coach" desc="Phase recommendations from your log history" />
          <LockedRow icon="📊" title="Pattern Analysis" desc="Side effect correlations with dose & site" />
          <LockedRow icon="💬" title="Unlimited Q&A" desc="Full LLM with research context" />
        </View>
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Ask about pharmacology, titration, mixing…"
          placeholderTextColor={colors.textFaint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable
          style={[s.sendBtn, !input.trim() && { opacity: 0.4 }]}
          onPress={send}
          disabled={!input.trim()}
        >
          <Text style={s.sendBtnText}>↑</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function LockedRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={s.lockedRow}>
      <Text style={{ fontSize: 18, opacity: 0.7 }}>{icon}</Text>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.lockedTitle}>{title}</Text>
        <Text style={s.lockedSub}>{desc}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  tierWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: 12 },
  tierFree: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 16,
  },
  tierFreeText: { color: colors.teal, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  tierUpgrade: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: colors.gold, borderRadius: 16,
  },
  tierUpgradeText: { color: '#0a1628', fontSize: 12, fontWeight: '700' },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 130 },
  msgUser: { alignItems: 'flex-end', marginBottom: 12 },
  msgAI: { alignItems: 'flex-start', marginBottom: 12 },
  msgAIHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  aiName: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  refuseBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(229, 57, 53, 0.2)', borderRadius: 4, marginLeft: 8,
  },
  refuseBadgeText: { color: colors.red, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%',
  },
  aiBubble: {
    backgroundColor: 'rgba(15, 25, 45, 0.6)',
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomRightRadius: 14, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 12, maxWidth: '90%',
  },
  refs: {
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(30, 136, 229, 0.1)',
    fontSize: 11, color: colors.textFaint, fontStyle: 'italic',
  },

  suggestWrap: { marginTop: 16, marginBottom: 14 },
  suggestLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  suggestList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestChip: {
    backgroundColor: 'rgba(30, 136, 229, 0.08)',
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.25)',
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
  },
  suggestChipText: { color: colors.primary, fontSize: 12 },

  lockedCard: {
    marginTop: 12, padding: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: radius.lg,
  },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lockedLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginLeft: 6, flex: 1 },
  lockedBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(255, 140, 0, 0.25)', borderRadius: 4 },
  lockedBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255, 140, 0, 0.1)',
  },
  lockedTitle: { color: colors.white, fontSize: 13, fontWeight: '600' },
  lockedSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  inputBar: {
    position: 'absolute', bottom: 8, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(8, 15, 28, 0.95)',
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 24, padding: 6,
  },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 8,
    color: colors.white, fontSize: 14,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: colors.white, fontSize: 20, fontWeight: '700' },
});
