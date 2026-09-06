import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, fmtTime } from '../../workforce/ui';

type R = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const { params } = useRoute<R>();
  const scope = { teamId: params.teamId, siteId: params.siteId };
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(() => {
    workforceApi
      .getMessages(scope)
      .then((m) => { setMessages(m); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50); })
      .finally(() => setLoading(false));
  }, [params.teamId, params.siteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText('');
    try {
      await workforceApi.sendMessage(params.senderId, body, scope);
      load();
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16 }}>
        {messages.map((m) => {
          const mine = m.sender?.id === params.senderId;
          return (
            <View key={m.id} style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                {!mine && <Text style={styles.sender}>{m.sender?.name}{m.sender?.role === 'SUPERVISOR' ? ' (Supervisor)' : m.sender?.role === 'PROJECT_MANAGER' ? ' (PM)' : ''}</Text>}
                <Text style={[styles.body, mine && { color: '#fff' }]}>{m.body}</Text>
                <Text style={[styles.time, mine && { color: '#DCEAff' }]}>{fmtTime(m.created_at)}</Text>
              </View>
            </View>
          );
        })}
        {messages.length === 0 && <Text style={styles.empty}>No messages yet. Say hello 👋</Text>}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message…"
          placeholderTextColor={colors.gray}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: 10 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 3 },
  body: { fontSize: 15, color: colors.text },
  time: { fontSize: 10, color: colors.gray, marginTop: 4, alignSelf: 'flex-end' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: colors.text },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 22, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
