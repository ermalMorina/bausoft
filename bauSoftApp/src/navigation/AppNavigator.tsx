import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import InvoiceListScreen from '../screens/invoices/InvoiceListScreen';
import InvoiceFormScreen from '../screens/invoices/InvoiceFormScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import WorkforceEntryScreen from '../screens/workforce/WorkforceEntryScreen';
import ManagerDashboardScreen from '../screens/workforce/ManagerDashboardScreen';
import SiteDashboardScreen from '../screens/workforce/SiteDashboardScreen';
import AttendanceScreen from '../screens/workforce/AttendanceScreen';
import WorkerHomeScreen from '../screens/workforce/WorkerHomeScreen';
import DailyReportScreen from '../screens/workforce/DailyReportScreen';
import ChatScreen from '../screens/workforce/ChatScreen';
import ReportIssueScreen from '../screens/workforce/ReportIssueScreen';

export type RootStackParamList = {
  Home: undefined;
  InvoiceList: undefined;
  InvoiceForm: { invoiceId?: string };
  InvoiceDetail: { invoiceId: string };
  // Workforce
  WorkforceEntry: undefined;
  ManagerDashboard: undefined;
  SiteDashboard: { siteId: number; siteName?: string };
  Attendance: { siteId?: number };
  WorkerHome: { employeeId: number };
  DailyReport: { employeeId: number; siteId: number; teamId?: number };
  Chat: { title: string; teamId?: number; siteId?: number; senderId: number };
  ReportIssue: { siteId: number; reporterId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0A6CFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'bauSoft' }} />
        <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Invoices' }} />
        <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'Invoice' }} />
        <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice Details' }} />

        <Stack.Screen name="WorkforceEntry" component={WorkforceEntryScreen} options={{ title: 'Workforce' }} />
        <Stack.Screen name="ManagerDashboard" component={ManagerDashboardScreen} options={{ title: 'Manager Dashboard' }} />
        <Stack.Screen name="SiteDashboard" component={SiteDashboardScreen} options={({ route }) => ({ title: route.params?.siteName || 'Site' })} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
        <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} options={{ title: 'My Work' }} />
        <Stack.Screen name="DailyReport" component={DailyReportScreen} options={{ title: 'Daily Report' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.title || 'Chat' })} />
        <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: 'Report Issue' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
