import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card } from '../../workforce/ui';

type R = RouteProp<RootStackParamList, 'ReportIssue'>;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export default function ReportIssueScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<R>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) { setMsg('Please describe the problem briefly.'); return; }
    setSubmitting(true);
    setMsg(null);
    try {
      await workforceApi.createIssue({
        site_id: params.siteId, reported_by_id: params.reporterId, title: title.trim(), description, priority,
      });
      navigation.goBack();
    } catch (e: any) {
      setMsg(e.message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Report a Problem</Text>
      <Text style={styles.sub}>Flag an issue at your site</Text>
      <Card>
        <Text style={styles.label}>Problem</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Missing materials" placeholderTextColor={colors.gray} />
        <Text style={[styles.label, { marginTop: 14 }]}>Details</Text>
        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Describe the issue…" placeholderTextColor={colors.gray} multiline />
        <Text style={[styles.label, { marginTop: 14 }]}>Priority</Text>
        <View style={styles.prioRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity key={p} style={[styles.prio, priority === p && styles.prioActive]} onPress={() => setPriority(p)}>
              <Text style={[styles.prioText, priority === p && styles.prioTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Issue</Text>}
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, backgroundColor: '#fff' },
  prioRow: { flexDirection: 'row', gap: 10 },
  prio: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  prioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  prioText: { color: colors.muted, fontWeight: '700' },
  prioTextActive: { color: '#fff' },
  submit: { backgroundColor: colors.red, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  msg: { color: colors.red, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
});
