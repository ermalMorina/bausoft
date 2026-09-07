import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, StatusBadge, fmtTime, Loading, ErrorView } from '../../workforce/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'WorkerHome'>;

const ACTIVITIES = ['WORKING', 'BREAK', 'WAITING', 'TRAVELING', 'MEETING'];
const TASK_NEXT: Record<string, string> = { PLANNED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', COMPLETED: 'PLANNED', BLOCKED: 'IN_PROGRESS' };

export default function WorkerHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const employeeId = params.employeeId;

  const [home, setHome] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    workforceApi
      .getWorkerHome(employeeId)
      .then(setHome)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doCheckIn = async () => {
    if (!home?.site) return;
    setBusy(true);
    try {
      const res = await workforceApi.checkIn(employeeId, home.site.id);
      if (!res.within_geofence) Alert.alert('Checked in', 'Warning: you appear to be outside the site geofence.');
      load();
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
  };
  const doCheckOut = async () => {
    setBusy(true);
    try { await workforceApi.checkOut(employeeId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
  };
  const changeActivity = async (state: string) => {
    setBusy(true);
    try { await workforceApi.setActivity(employeeId, state, state === 'WORKING' ? 'Working' : state.charAt(0) + state.slice(1).toLowerCase()); load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
  };
  const advanceTask = async (t: any) => {
    setBusy(true);
    try { await workforceApi.updateTaskStatus(t.id, TASK_NEXT[t.status] || 'IN_PROGRESS'); load(); }
    catch (e: any) { Alert.alert('Error', e.message); } finally { setBusy(false); }
  };

  if (loading && !home) return <Loading />;
  if (error && !home) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  const emp = home?.employee;
  const site = home?.site;
  const checkedIn = home?.checked_in;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={styles.greeting}>Good morning, {emp?.name?.split(' ')[0]}</Text>
      {site ? (
        <Text style={styles.siteLine}>{site.name}{site.address ? ` · ${site.address.split(',').slice(-1)[0].trim()}` : ''}</Text>
      ) : (
        <Text style={styles.siteLine}>No site assigned</Text>
      )}

      {home && !site && (
        <Card style={{ marginTop: 14, backgroundColor: '#FEF3F2', borderColor: '#FECDCA' }}>
          <Text style={styles.noticeTitle}>You're not assigned to a site yet</Text>
          <Text style={styles.noticeBody}>
            Check-in, daily report, chat and tasks stay disabled until a manager assigns you to a
            construction site and team. If you're just trying the app, seed demo data on the backend
            (run <Text style={styles.mono}>npm run seed:workforce</Text>) and pick a worker that shows a
            site and team on the previous screen.
          </Text>
        </Card>
      )}

      <Card style={{ marginTop: 14 }}>
        <View style={styles.rowBetween}>
          <View style={styles.statusPillWrap}>
            <View style={[styles.pillDot, { backgroundColor: checkedIn ? colors.green : colors.gray }]} />
            <Text style={styles.statusText}>{checkedIn ? 'Checked In' : 'Not checked in'}</Text>
          </View>
          <Text style={styles.checkTime}>{checkedIn ? fmtTime(home?.attendance?.check_in) : ''}</Text>
        </View>

        {home?.team && <Text style={styles.teamLine}>👥 {home.team.name}</Text>}

        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: checkedIn ? colors.red : colors.green }, (busy || !site) && styles.disabled]}
          disabled={busy || !site}
          onPress={checkedIn ? doCheckOut : doCheckIn}
        >
          <Text style={styles.bigBtnText}>{checkedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Current Activity</Text>
        <Text style={styles.activity}>{home?.current_activity?.description || home?.current_activity?.state || 'Not set'}</Text>
        <View style={styles.chipRow}>
          {ACTIVITIES.map((a) => (
            <TouchableOpacity key={a} style={styles.chip} disabled={busy} onPress={() => changeActivity(a)}>
              <Text style={styles.chipText}>{a.charAt(0) + a.slice(1).toLowerCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {(home?.announcements || []).length > 0 && (
        <Card style={{ backgroundColor: '#FFF7E6', borderColor: '#FFE1A8' }}>
          <Text style={styles.annTitle}>⚠ Site Announcement</Text>
          <Text style={styles.annBody}>{home.announcements[0].body}</Text>
          {!!home.announcements[0].author?.name && <Text style={styles.annAuthor}>— {home.announcements[0].author.name}</Text>}
        </Card>
      )}

      <Text style={styles.section}>Today's Tasks</Text>
      {(home?.todays_tasks || []).map((t: any) => (
        <TouchableOpacity key={t.id} disabled={busy} onPress={() => advanceTask(t)}>
          <Card style={styles.taskCard}>
            <Text style={styles.taskMark}>{t.status === 'COMPLETED' ? '✓' : t.status === 'IN_PROGRESS' ? '●' : '○'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, t.status === 'COMPLETED' && styles.taskDone]}>{t.title}</Text>
              <Text style={styles.taskMeta}>{(t.expected_start || '—')}–{(t.expected_end || '—')}</Text>
            </View>
            <StatusBadge status={t.status} />
          </Card>
        </TouchableOpacity>
      ))}
      {(home?.todays_tasks || []).length === 0 && <Text style={styles.empty}>No tasks assigned today.</Text>}
      <Text style={styles.hint}>Tap a task to advance its status</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, !site && styles.disabled]} onPress={() => navigation.navigate('DailyReport', { employeeId, siteId: site?.id, teamId: home?.team?.id })} disabled={!site}>
          <Text style={styles.actionText}>📝 Daily Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, !home?.team && styles.disabled]} onPress={() => navigation.navigate('Chat', { title: home?.team?.name || 'Team Chat', teamId: home?.team?.id, senderId: employeeId })} disabled={!home?.team}>
          <Text style={styles.actionText}>💬 Team Chat</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionAlt, !site && styles.disabled]} onPress={() => navigation.navigate('ReportIssue', { siteId: site?.id, reporterId: employeeId })} disabled={!site}>
          <Text style={[styles.actionText, { color: colors.red }]}>⚠️ Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionAlt, !site && styles.disabled]} onPress={() => navigation.navigate('Chat', { title: `${site?.name} — Site`, siteId: site?.id, senderId: employeeId })} disabled={!site}>
          <Text style={[styles.actionText, { color: colors.primary }]}>🏗️ Site Chat</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  siteLine: { fontSize: 15, color: colors.muted, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPillWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '700', color: colors.text },
  checkTime: { fontSize: 15, color: colors.muted, fontWeight: '600' },
  teamLine: { fontSize: 14, color: colors.muted, marginTop: 10 },
  bigBtn: { marginTop: 16, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  cardLabel: { fontSize: 12, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  activity: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: colors.primary + '15', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  annTitle: { color: '#B54708', fontWeight: '800', fontSize: 14 },
  annBody: { color: '#7A2E0E', marginTop: 6, fontSize: 14, lineHeight: 20 },
  annAuthor: { color: '#B54708', marginTop: 8, fontStyle: 'italic' },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  taskMark: { fontSize: 18, color: colors.primary, width: 20, textAlign: 'center' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskDone: { textDecorationLine: 'line-through', color: colors.muted },
  taskMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 10 },
  hint: { color: colors.gray, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  actionAlt: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.5, backgroundColor: colors.gray, borderColor: colors.gray },
  noticeTitle: { color: colors.red, fontWeight: '800', fontSize: 15 },
  noticeBody: { color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 19 },
  mono: { fontWeight: '700', color: colors.text },
});
