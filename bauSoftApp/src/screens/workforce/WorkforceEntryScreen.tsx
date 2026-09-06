import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { workforceApi } from '../../services/workforceApi';
import { colors, Card } from '../../workforce/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WorkforceEntryScreen() {
  const navigation = useNavigation<Nav>();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workforceApi
      .getWorkers()
      .then((w) => setWorkers(w))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Construction Workforce</Text>
      <Text style={styles.sub}>Choose how you want to enter the platform</Text>

      <TouchableOpacity style={styles.manager} onPress={() => navigation.navigate('ManagerDashboard')}>
        <Text style={styles.managerIcon}>🗂️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.managerTitle}>Manager Web Dashboard</Text>
          <Text style={styles.managerSub}>Global workforce overview, sites, attendance & issues</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Open worker app as…</Text>
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {workers.map((w) => (
        <TouchableOpacity
          key={w.id}
          onPress={() => navigation.navigate('WorkerHome', { employeeId: w.id })}
        >
          <Card style={styles.workerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{w.name.split(' ').map((s: string) => s[0]).join('').slice(0, 2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>{w.name}</Text>
              <Text style={styles.workerMeta}>
                {(w.current_site?.name || 'Unassigned')} · {(w.current_team?.name || 'No team')}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Card>
        </TouchableOpacity>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 18 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 },
  manager: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary, borderRadius: 16, padding: 18,
  },
  managerIcon: { fontSize: 30 },
  managerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  managerSub: { color: '#DCEAff', fontSize: 13, marginTop: 2 },
  chev: { color: colors.gray, fontSize: 28, fontWeight: '300' },
  workerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  workerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  workerMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  error: { color: colors.red, marginTop: 12 },
});
