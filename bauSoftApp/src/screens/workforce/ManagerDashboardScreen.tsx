import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, StatTile, StatusBadge, Loading, ErrorView } from '../../workforce/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ManagerDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    workforceApi
      .getOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.h1}>Global Workforce</Text>
      <Text style={styles.sub}>Real-time view of every site and team</Text>

      <Card>
        <View style={styles.grid}>
          <StatTile label="Active Projects" value={data?.active_projects ?? 0} accent={colors.primary} />
          <StatTile label="Active Sites" value={data?.active_sites ?? 0} accent={colors.primary} />
          <StatTile label="Teams Active" value={data?.teams_active ?? 0} accent={colors.purple} />
        </View>
        <View style={[styles.grid, { marginTop: 4 }]}>
          <StatTile label="Working Now" value={data?.employees_working ?? 0} accent={colors.green} />
          <StatTile label="Absent" value={data?.employees_absent ?? 0} accent={colors.amber} />
          <StatTile label="Open Issues" value={data?.open_issues ?? 0} accent={colors.red} />
        </View>
      </Card>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Employees')}>
          <Text style={styles.quickText}>👥 Manage Employees & Teams</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickBtn, styles.quickAlt]} onPress={() => navigation.navigate('Attendance', {})}>
          <Text style={[styles.quickText, { color: colors.primary }]}>🕒 Attendance</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.section}>Construction Sites</Text>
      </View>

      {(data?.sites || []).map((s: any) => (
        <TouchableOpacity key={s.id} onPress={() => navigation.navigate('SiteDashboard', { siteId: s.id, siteName: s.name })}>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.siteName}>{s.name}</Text>
              <StatusBadge status={s.status} />
            </View>
            {!!s.project_name && <Text style={styles.siteMeta}>📋 {s.project_name}</Text>}
            {!!s.address && <Text style={styles.siteMeta}>📍 {s.address}</Text>}
            <Text style={styles.open}>Open site dashboard ›</Text>
          </Card>
        </TouchableOpacity>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  siteName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  siteMeta: { fontSize: 13, color: colors.muted, marginTop: 6 },
  open: { color: colors.primary, fontWeight: '600', marginTop: 10 },
  link: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.red, marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  quickBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  quickAlt: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quickText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
