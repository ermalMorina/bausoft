import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import InvoiceListScreen from '../screens/invoices/InvoiceListScreen';
import InvoiceFormScreen from '../screens/invoices/InvoiceFormScreen';
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';

export type RootStackParamList = {
  Home: undefined;
  InvoiceList: undefined;
  InvoiceForm: { invoiceId?: string };
  InvoiceDetail: { invoiceId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'bauSoft' }}
        />
        <Stack.Screen
          name="InvoiceList"
          component={InvoiceListScreen}
          options={{ title: 'Invoices' }}
        />
        <Stack.Screen
          name="InvoiceForm"
          component={InvoiceFormScreen}
          options={{ title: 'Invoice' }}
        />
        <Stack.Screen
          name="InvoiceDetail"
          component={InvoiceDetailScreen}
          options={{ title: 'Invoice Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
