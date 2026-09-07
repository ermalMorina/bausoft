import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card } from '../../workforce/ui';

type R = RouteProp<RootStackParamList, 'DailyReport'>;

function Field({ label, value, onChange, placeholder, lines = 3 }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, { height: lines * 22 + 20 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        multiline
      />
    </View>
  );
}

export default function DailyReportScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<R>();
  const [completed, setCompleted] = useState('');
  const [inProgress, setInProgress] = useState('');
  const [plannedNext, setPlannedNext] = useState('');
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState('');
  const [materials, setMaterials] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    if (!completed && !inProgress) {
      setMsg('Please describe what you completed or worked on.');
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      await workforceApi.submitDailyReport({
        site_id: params.siteId,
        team_id: params.teamId,
        employee_id: params.employeeId,
        completed, in_progress: inProgress, planned_next: plannedNext, notes, issues, materials,
      });
      navigation.goBack();
    } catch (e: any) {
      setMsg(e.message);
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Daily Report</Text>
      <Text style={styles.sub}>Describe today's work</Text>
      <Card>
        <Field label="✅ Completed today" value={completed} onChange={setCompleted} placeholder="e.g. Finished wall preparation" />
        <Field label="🔄 Still in progress" value={inProgress} onChange={setInProgress} placeholder="e.g. First-floor plastering" />
        <Field label="➡️ Planned for tomorrow" value={plannedNext} onChange={setPlannedNext} placeholder="e.g. Start second-floor preparation" />
        <Field label="🧱 Materials used" value={materials} onChange={setMaterials} placeholder="e.g. Cement (12 bags)" lines={2} />
        <Field label="📝 Notes" value={notes} onChange={setNotes} placeholder="Anything worth noting" lines={2} />
        <Field label="⚠️ Issues / problems" value={issues} onChange={setIssues} placeholder="e.g. Missing plastering material" lines={2} />
      </Card>
      {msg && <Text style={styles.msg}>{msg}</Text>}
      <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Report</Text>}
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.text, backgroundColor: '#fff', textAlignVertical: 'top' },
  submit: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  msg: { color: colors.red, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
});
