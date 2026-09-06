import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export const colors = {
  primary: '#0A6CFF',
  primaryDark: '#0952C6',
  bg: '#F2F4F7',
  card: '#FFFFFF',
  text: '#1D2939',
  muted: '#667085',
  border: '#E4E7EC',
  green: '#12B76A',
  amber: '#F79009',
  red: '#F04438',
  gray: '#98A2B3',
  purple: '#7A5AF8',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: colors.green,
  WORKING: colors.green,
  COMPLETED: colors.green,
  PRESENT: colors.green,
  IN_PROGRESS: colors.amber,
  ASSIGNED: colors.amber,
  PLANNED: colors.gray,
  PAUSED: colors.amber,
  BLOCKED: colors.red,
  OPEN: colors.red,
  HIGH: colors.red,
  MEDIUM: colors.amber,
  LOW: colors.gray,
  CANCELLED: colors.gray,
  RESOLVED: colors.green,
  CLOSED: colors.gray,
  DRAFT: colors.gray,
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || colors.gray;
  return (
    <View style={[styles.badge, { backgroundColor: c + '22', borderColor: c + '55' }]}>
      <Text style={[styles.badgeText, { color: c }]}>{String(status).replace(/_/g, ' ')}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  stat: { flex: 1, minWidth: 90, alignItems: 'center', paddingVertical: 8 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
