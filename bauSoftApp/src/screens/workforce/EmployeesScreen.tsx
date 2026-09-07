import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, StatusBadge, Loading, ErrorView } from '../../workforce/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  PROJECT_MANAGER: 'Project Manager',
  SUPERVISOR: 'Supervisor',
  WORKER: 'Worker',
};

export default function EmployeesScreen() {
  const navigation = useNavigation<Nav>();
  const [employees, setEmployees] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    workforceApi
      .listEmployees()
      .then(setEmployees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && employees.length === 0) return <Loading />;
  if (error && employees.length === 0) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.position || '').toLowerCase().includes(q) ||
          (e.current_team?.name || '').toLowerCase().includes(q) ||
          (e.current_site?.name || '').toLowerCase().includes(q)
      )
    : employees;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.h1}>Employees</Text>
      <Text style={styles.sub}>Tap an employee to assign them to a site & team</Text>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, role, team or site…"
        placeholderTextColor={colors.gray}
      />

      {filtered.map((e) => (
        <TouchableOpacity
          key={e.id}
          onPress={() => navigation.navigate('AssignEmployee', { employeeId: e.id, employeeName: e.name })}
        >
          <Card style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{e.name.split(' ').map((s: string) => s[0]).join('').slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{e.name}</Text>
                <StatusBadge status={e.employment_status} />
              </View>
              <Text style={styles.meta}>{ROLE_LABEL[e.role] || e.role}{e.position ? ` · ${e.position}` : ''}</Text>
              <Text style={styles.assign}>
                {e.current_team?.name ? `👥 ${e.current_team.name}` : '👥 No team'}
                {'   '}
                {e.current_site?.name ? `🏗️ ${e.current_site.name}` : '🏗️ Unassigned'}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Card>
        </TouchableOpacity>
      ))}
      {filtered.length === 0 && <Text style={styles.empty}>No employees match "{query}".</Text>}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 14 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', color: colors.text, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  assign: { fontSize: 12, color: colors.gray, marginTop: 6 },
  chev: { color: colors.gray, fontSize: 26, fontWeight: '300' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
});
