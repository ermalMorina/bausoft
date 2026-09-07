import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, StatTile, StatusBadge, fmtTime, Loading, ErrorView } from '../../workforce/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'SiteDashboard'>;

const TABS = ['Overview', 'Tasks', 'Attendance', 'Issues', 'Timeline'] as const;

export default function SiteDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const siteId = params.siteId;

  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [dash, setDash] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      workforceApi.getSiteDashboard(siteId),
      workforceApi.getSiteTasks(siteId),
      workforceApi.getAttendance({ siteId, today: true }),
      workforceApi.getIssues(siteId),
      workforceApi.getSiteTimeline(siteId),
    ])
      .then(([d, t, a, i, tl]) => {
        setDash(d); setTasks(t); setAttendance(a); setIssues(i); setTimeline(tl);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [siteId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading && !dash) return <Loading />;
  if (error && !dash) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        {tab === 'Overview' && dash && (
          <>
            <View style={styles.rowBetween}>
              <Text style={styles.h1}>{dash.site.name}</Text>
              <StatusBadge status={dash.site.status} />
            </View>
            {!!dash.site.address && <Text style={styles.sub}>📍 {dash.site.address}</Text>}
            {!!dash.site.project_manager?.name && <Text style={styles.sub}>👷 PM: {dash.site.project_manager.name}</Text>}
            <Card style={{ marginTop: 12 }}>
              <View style={styles.grid}>
                <StatTile label={`Workers (of ${dash.workers_total})`} value={`${dash.currently_working + dash.checked_out}`} />
                <StatTile label="Working" value={dash.currently_working} accent={colors.green} />
                <StatTile label="Checked out" value={dash.checked_out} accent={colors.gray} />
              </View>
              <View style={styles.grid}>
                <StatTile label="Absent" value={dash.absent} accent={colors.amber} />
                <StatTile label="Open issues" value={dash.open_issues} accent={colors.red} />
                <StatTile label="Today's tasks" value={dash.todays_tasks} accent={colors.primary} />
              </View>
              <View style={styles.progressWrap}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Today's Progress</Text>
                  <Text style={styles.progressPct}>{dash.progress}%</Text>
                </View>
                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${dash.progress}%` }]} /></View>
              </View>
            </Card>
          </>
        )}

        {tab === 'Tasks' && tasks.map((t) => (
          <Card key={t.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{t.title}</Text>
              <StatusBadge status={t.status} />
            </View>
            <Text style={styles.sub}>
              {(t.expected_start || '—')}–{(t.expected_end || '—')} · {t.assignee?.name || 'Unassigned'} · <Text style={{ color: colors.muted }}>Priority {t.priority}</Text>
            </Text>
          </Card>
        ))}
        {tab === 'Tasks' && tasks.length === 0 && <Text style={styles.empty}>No tasks for this site.</Text>}

        {tab === 'Attendance' && attendance.map((a) => (
          <Card key={a.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{a.employee?.name}</Text>
              <StatusBadge status={a.status} />
            </View>
            <Text style={styles.sub}>
              In {fmtTime(a.check_in)} · Out {fmtTime(a.check_out)} · {a.hours != null ? `${a.hours}h` : 'working'}
              {a.within_geofence ? '' : '  ⚠️ off-site'}
            </Text>
          </Card>
        ))}
        {tab === 'Attendance' && attendance.length === 0 && <Text style={styles.empty}>No check-ins today.</Text>}

        {tab === 'Issues' && issues.map((i) => (
          <Card key={i.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{i.title}</Text>
              <StatusBadge status={i.status} />
            </View>
            {!!i.description && <Text style={styles.sub}>{i.description}</Text>}
            <Text style={styles.meta}>Reported by {i.reported_by?.name} · Priority {i.priority}{i.assigned_to?.name ? ` · → ${i.assigned_to.name}` : ''}</Text>
          </Card>
        ))}
        {tab === 'Issues' && issues.length === 0 && <Text style={styles.empty}>No issues reported.</Text>}

        {tab === 'Timeline' && timeline.map((e, idx) => (
          <View key={idx} style={styles.timelineRow}>
            <Text style={styles.timelineTime}>{fmtTime(e.time)}</Text>
            <View style={[styles.dot, { backgroundColor: kindColor(e.kind) }]} />
            <Text style={styles.timelineLabel}>{e.label}</Text>
          </View>
        ))}
        {tab === 'Timeline' && timeline.length === 0 && <Text style={styles.empty}>No recent activity.</Text>}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function kindColor(kind: string) {
  return { checkin: colors.green, checkout: colors.gray, issue: colors.red, report: colors.primary, task: colors.purple }[kind] || colors.gray;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 8 },
  sub: { fontSize: 13, color: colors.muted, marginTop: 6 },
  meta: { fontSize: 12, color: colors.gray, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  progressWrap: { marginTop: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { color: colors.text, fontWeight: '600' },
  progressPct: { color: colors.primary, fontWeight: '800' },
  progressBar: { height: 10, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: colors.primary },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  timelineTime: { width: 56, fontSize: 12, color: colors.muted, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  timelineLabel: { flex: 1, color: colors.text, fontSize: 14 },
});
