import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { InvoiceProvider } from './src/context/InvoiceContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <InvoiceProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </InvoiceProvider>
  );
}
