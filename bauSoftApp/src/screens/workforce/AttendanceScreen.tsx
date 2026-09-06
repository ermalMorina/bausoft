import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, StatusBadge, fmtTime } from '../../workforce/ui';

type R = RouteProp<RootStackParamList, 'Attendance'>;

export default function AttendanceScreen() {
  const { params } = useRoute<R>();
  const siteId = params?.siteId;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    workforceApi
      .getAttendance({ siteId, today: true })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [siteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && rows.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const working = rows.filter((r) => !r.check_out).length;
  const done = rows.filter((r) => r.check_out).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={styles.h1}>Attendance — Today</Text>
      <Text style={styles.sub}>{working} working · {done} checked out · {rows.length} total check-ins</Text>

      {rows.map((r) => (
        <Card key={r.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.name}>{r.employee?.name}</Text>
            <StatusBadge status={r.status} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>🏗️ {r.site?.name}</Text>
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>In: <Text style={styles.timeVal}>{fmtTime(r.check_in)}</Text></Text>
            <Text style={styles.time}>Out: <Text style={styles.timeVal}>{fmtTime(r.check_out)}</Text></Text>
            <Text style={styles.time}>Hours: <Text style={styles.timeVal}>{r.hours != null ? `${r.hours}h` : '—'}</Text></Text>
          </View>
          {!r.within_geofence && <Text style={styles.warn}>⚠️ Checked in outside the site geofence</Text>}
        </Card>
      ))}
      {rows.length === 0 && <Text style={styles.empty}>No attendance records today.</Text>}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  metaRow: { marginTop: 4 },
  meta: { fontSize: 13, color: colors.muted },
  timeRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  time: { fontSize: 13, color: colors.muted },
  timeVal: { color: colors.text, fontWeight: '700' },
  warn: { color: colors.amber, fontSize: 12, marginTop: 8, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
});
