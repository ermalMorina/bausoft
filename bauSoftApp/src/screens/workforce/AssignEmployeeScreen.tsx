import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card, Loading, ErrorView } from '../../workforce/ui';

type R = RouteProp<RootStackParamList, 'AssignEmployee'>;

export default function AssignEmployeeScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<R>();
  const employeeId = params.employeeId;

  const [employee, setEmployee] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([workforceApi.getEmployee(employeeId), workforceApi.getSites()])
      .then(([emp, s]) => {
        setEmployee(emp);
        setSites(s);
        if (emp?.current_site?.id) selectSite(emp.current_site.id, emp?.current_team?.id ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectSite = (id: number, preselectTeamId: number | null = null) => {
    setSiteId(id);
    setTeamId(preselectTeamId);
    setShowNewTeam(false);
    setTeamsLoading(true);
    workforceApi
      .getTeams(id)
      .then(setTeams)
      .catch((e) => setError(e.message))
      .finally(() => setTeamsLoading(false));
  };

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name || !siteId) return;
    setSubmitting(true);
    try {
      const t = await workforceApi.createTeam({ name, site_id: siteId });
      setNewTeamName('');
      setShowNewTeam(false);
      const refreshed = await workforceApi.getTeams(siteId);
      setTeams(refreshed);
      setTeamId(t.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const assign = async () => {
    if (!siteId) {
      Alert.alert('Pick a site', 'Select a construction site first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await workforceApi.assignEmployee(employeeId, siteId, teamId ?? undefined);
      const site = res.employee?.current_site?.name;
      const team = res.employee?.current_team?.name;
      Alert.alert(
        'Assigned',
        `${res.employee?.name} is now on ${team || 'no team'} at ${site || 'the site'}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !employee) return <Loading />;
  if (error && !employee) return <ErrorView message={error} onRetry={() => { setLoading(true); load(); }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{employee?.name}</Text>
      <Text style={styles.sub}>
        Currently: {employee?.current_team?.name || 'no team'} · {employee?.current_site?.name || 'unassigned'}
      </Text>

      <Text style={styles.section}>1. Construction site</Text>
      <Card>
        {sites.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.option, siteId === s.id && styles.optionActive]} onPress={() => selectSite(s.id)}>
            <Text style={[styles.optionText, siteId === s.id && styles.optionTextActive]}>{s.name}</Text>
            {siteId === s.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
        {sites.length === 0 && <Text style={styles.empty}>No sites yet.</Text>}
      </Card>

      {siteId && (
        <>
          <Text style={styles.section}>2. Team</Text>
          <Card>
            {teamsLoading && <ActivityIndicator color={colors.primary} />}
            {!teamsLoading && teams.map((t) => (
              <TouchableOpacity key={t.id} style={[styles.option, teamId === t.id && styles.optionActive]} onPress={() => setTeamId(t.id)}>
                <Text style={[styles.optionText, teamId === t.id && styles.optionTextActive]}>
                  {t.name}
                  <Text style={styles.teamMeta}>{`  ·  ${t.members?.length || 0} members${t.leader?.name ? ` · lead ${t.leader.name}` : ''}`}</Text>
                </Text>
                {teamId === t.id && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
            {!teamsLoading && teams.length === 0 && <Text style={styles.empty}>No teams on this site yet — create one below.</Text>}

            {showNewTeam ? (
              <View style={styles.newTeamRow}>
                <TextInput
                  style={styles.newTeamInput}
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                  placeholder="New team name (e.g. Team Delta)"
                  placeholderTextColor={colors.gray}
                  autoFocus
                />
                <TouchableOpacity style={styles.newTeamBtn} onPress={createTeam} disabled={submitting || !newTeamName.trim()}>
                  <Text style={styles.newTeamBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowNewTeam(true)}>
                <Text style={styles.addTeam}>＋ New team on this site</Text>
              </TouchableOpacity>
            )}
          </Card>
        </>
      )}

      <TouchableOpacity style={[styles.assignBtn, (!siteId || submitting) && styles.assignDisabled]} onPress={assign} disabled={!siteId || submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.assignText}>Assign to team</Text>}
      </TouchableOpacity>
      <Text style={styles.note}>Assigning moves the employee to this site/team and keeps a dated assignment history.</Text>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 8 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  optionText: { fontSize: 15, color: colors.text, fontWeight: '600', flex: 1 },
  optionTextActive: { color: colors.primary },
  teamMeta: { fontSize: 12, color: colors.gray, fontWeight: '400' },
  check: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  empty: { color: colors.muted, paddingVertical: 8 },
  addTeam: { color: colors.primary, fontWeight: '700', paddingVertical: 8 },
  newTeamRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  newTeamInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: '#fff' },
  newTeamBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  newTeamBtnText: { color: '#fff', fontWeight: '700' },
  assignBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 22 },
  assignDisabled: { opacity: 0.5, backgroundColor: colors.gray },
  assignText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  note: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
