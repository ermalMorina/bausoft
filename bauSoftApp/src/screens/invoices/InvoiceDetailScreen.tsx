import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useInvoices } from '../../context/InvoiceContext';
import { InvoiceStatus } from '../../types/invoice';

// Optional imports for PDF and Email features
let Print: any;
let shareAsync: any;
let sendInvoiceEmail: any;
let generateInvoiceHTML: any;

try {
  Print = require('expo-print').default || require('expo-print');
  shareAsync = require('expo-sharing').shareAsync;
  generateInvoiceHTML = require('../../utils/pdfGenerator').generateInvoiceHTML;
  sendInvoiceEmail = require('../../utils/emailService').sendInvoiceEmail;
} catch (e) {
  // Dependencies not installed - features will be disabled
  console.log('PDF/Email features not available - install expo-print, expo-sharing, expo-mail-composer');
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'InvoiceDetail'>;

const statusColors: Record<InvoiceStatus, string> = {
  draft: '#999',
  sent: '#007AFF',
  paid: '#34C759',
  overdue: '#FF3B30',
};

export default function InvoiceDetailScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { getInvoice, updateInvoice, duplicateInvoice, deleteInvoice, refreshInvoices, invoices } =
    useInvoices();

  // Get fresh invoice from context whenever invoices change - this ensures re-render
  const invoice = React.useMemo(() => {
    const inv = getInvoice(route.params.invoiceId);
    console.log('=== InvoiceDetailScreen: useMemo ===');
    console.log('Looking for invoice ID:', route.params.invoiceId);
    console.log('Found invoice:', inv ? { id: inv.id, status: inv.status, paymentInfo: inv.paymentInfo } : 'NOT FOUND');
    console.log('Total invoices in context:', invoices.length);
    console.log('All invoice IDs:', invoices.map(i => i.id));
    return inv;
  }, [getInvoice, route.params.invoiceId, invoices]);
  
  // Refresh invoice when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshInvoices();
    });
    return unsubscribe;
  }, [navigation, refreshInvoices]);
  
  // Re-fetch invoice when invoices list changes
  useEffect(() => {
    if (invoice && invoice.id.startsWith('inv_')) {
      // If it's a temporary ID, try to refresh to get the real ID
      refreshInvoices();
    }
  }, [invoices.length, refreshInvoices, invoice]);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleMarkAsSent = async () => {
    try {
      console.log('Marking invoice as sent:', invoice.id);
      const a = await updateInvoice(invoice.id, { status: 'sent' });
      console.log('ermal Updated invoice:', a);
      // Force refresh to get latest data
      await refreshInvoices();
      Alert.alert('Success', 'Invoice marked as sent');
    } catch (error: any) {
      console.error('Error marking as sent:', error);
      Alert.alert('Error', error.message || 'Failed to update invoice');
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      console.log('=== handleMarkAsPaid START ===');
      console.log('Invoice ID:', invoice.id);
      console.log('Current invoice status:', invoice.status);
      console.log('Current paymentInfo:', invoice.paymentInfo);
      console.log('Current grandTotal:', invoice.grandTotal);
      
      const updates = {
        status: 'paid' as const,
        paymentInfo: {
          ...invoice.paymentInfo,
          paidAmount: invoice.grandTotal,
          remainingBalance: 0,
          paymentDate: new Date().toISOString(),
        },
      };
      
      console.log('Sending updates to updateInvoice:', updates);
      const result = await updateInvoice(invoice.id, updates);
      console.log('updateInvoice returned:', result);
      console.log('Result status:', result?.status);
      console.log('Result paymentInfo:', result?.paymentInfo);
      
      // Force refresh to get latest data
      console.log('Refreshing invoices from backend...');
      await refreshInvoices();
      console.log('Refresh complete');
      
      // Get updated invoice after refresh
      const updatedInvoice = getInvoice(invoice.id);
      console.log('Invoice after refresh:', updatedInvoice);
      console.log('Updated invoice status:', updatedInvoice?.status);
      console.log('Updated invoice paymentInfo:', updatedInvoice?.paymentInfo);
      console.log('=== handleMarkAsPaid END ===');
      
      Alert.alert('Success', 'Invoice marked as paid');
    } catch (error: any) {
      console.error('=== handleMarkAsPaid ERROR ===');
      console.error('Error marking as paid:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Error', error.message || 'Failed to update invoice');
    }
  };

  const handleDuplicate = () => {
    const duplicated = duplicateInvoice(invoice.id);
    if (duplicated) {
      Alert.alert('Success', 'Invoice duplicated', [
        {
          text: 'View',
          onPress: () =>
            navigation.replace('InvoiceDetail', { invoiceId: duplicated.id }),
        },
        { text: 'OK' },
      ]);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleGeneratePDF = async () => {
    if (!Print || !shareAsync || !generateInvoiceHTML) {
      Alert.alert(
        'Feature Unavailable',
        'PDF generation requires expo-print and expo-sharing packages. Please install them:\n\nnpm install expo-print expo-sharing'
      );
      return;
    }

    try {
      setIsGeneratingPDF(true);
      const html = generateInvoiceHTML(invoice);
      const { uri } = await Print.printToFileAsync({ html });
      
      await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save Invoice PDF' });
      
      Alert.alert('Success', 'PDF generated and saved');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!Print || !sendInvoiceEmail || !generateInvoiceHTML) {
      Alert.alert(
        'Feature Unavailable',
        'Email sending requires expo-print and expo-mail-composer packages. Please install them:\n\nnpm install expo-print expo-mail-composer'
      );
      return;
    }

    if (!invoice.clientInfo.email) {
      Alert.alert('Error', 'Client email address is required to send invoice');
      return;
    }

    try {
      setIsSendingEmail(true);
      const html = generateInvoiceHTML(invoice);
      const { uri } = await Print.printToFileAsync({ html });
      
      await sendInvoiceEmail(invoice, uri);
      Alert.alert('Success', 'Invoice sent via email');
    } catch (error: any) {
      console.error('Error sending email:', error);
      Alert.alert('Error', error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoice.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (invoice.status === 'paid') {
      Alert.alert('Cannot Edit', 'Paid invoices cannot be edited');
      return;
    }
    navigation.navigate('InvoiceForm', { invoiceId: invoice.id });
  };

  // Force re-render when invoice changes by using invoice ID as key
  if (!invoice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invoice not found</Text>
          <Text style={styles.errorText}>ID: {route.params.invoiceId}</Text>
          <Text style={styles.errorText}>Available IDs: {invoices.map(i => i.id).join(', ')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView key={`invoice-${invoice.id}-${invoice.updatedAt}`} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.statusLabel}>Status</Text>
              {/* Debug info - remove in production */}
              <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                ID: {invoice.id} | Updated: {new Date(invoice.updatedAt).toLocaleTimeString()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[invoice.status] + '20' },
              ]}
            >
              <Text
                style={[styles.statusText, { color: statusColors[invoice.status] }]}
              >
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>From</Text>
          <Text style={styles.businessName}>{invoice.businessInfo.companyName}</Text>
          <Text style={styles.address}>{invoice.businessInfo.address}</Text>
          {invoice.businessInfo.vatNumber && String(invoice.businessInfo.vatNumber).trim() !== '' ? (
            <Text style={styles.vat}>VAT: {invoice.businessInfo.vatNumber}</Text>
          ) : null}
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To</Text>
          <Text style={styles.clientName}>{invoice.clientInfo.name}</Text>
          <Text style={styles.address}>{invoice.clientInfo.address}</Text>
          {invoice.clientInfo.email && String(invoice.clientInfo.email).trim() !== '' ? (
            <Text style={styles.contact}>{invoice.clientInfo.email}</Text>
          ) : null}
          {invoice.clientInfo.phone && String(invoice.clientInfo.phone).trim() !== '' ? (
            <Text style={styles.contact}>{invoice.clientInfo.phone}</Text>
          ) : null}
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Issue Date:</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date:</Text>
            <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {invoice.lineItems.map((item, index) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemDescription}>{item.description}</Text>
                <Text style={styles.lineItemTotal}>€{item.total.toFixed(2)}</Text>
              </View>
              <Text style={styles.lineItemDetails}>
                {item.quantity} × €{item.unitPrice.toFixed(2)} + {item.taxPercent}% tax
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>€{invoice.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>€{invoice.taxTotal.toFixed(2)}</Text>
          </View>
          {invoice.discount && invoice.discount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-€{invoice.discount.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>€{invoice.grandTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Info */}
        {invoice.paymentInfo.paidAmount > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Paid:</Text>
              <Text style={styles.detailValue}>
                €{invoice.paymentInfo.paidAmount.toFixed(2)}
              </Text>
            </View>
            {invoice.paymentInfo.remainingBalance > 0 ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Remaining:</Text>
                <Text style={[styles.detailValue, styles.balanceText]}>
                  €{invoice.paymentInfo.remainingBalance.toFixed(2)}
                </Text>
              </View>
            ) : null}
            {invoice.paymentInfo.paymentDate && String(invoice.paymentInfo.paymentDate).trim() !== '' ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Date:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(invoice.paymentInfo.paymentDate)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.pdfButton]}
          onPress={handleGeneratePDF}
          disabled={isGeneratingPDF}
        >
          <Text style={styles.actionButtonText}>
            {isGeneratingPDF ? 'Generating...' : '📄 Generate PDF'}
          </Text>
        </TouchableOpacity>
        {invoice.clientInfo.email && String(invoice.clientInfo.email).trim() !== '' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={handleSendEmail}
            disabled={isSendingEmail}
          >
            <Text style={styles.actionButtonText}>
              {isSendingEmail ? 'Sending...' : '✉️ Send Email'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {invoice.status !== 'paid' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            {invoice.status === 'draft' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.sendButton]}
                onPress={handleMarkAsSent}
              >
                <Text style={styles.actionButtonText}>Mark as Sent</Text>
              </TouchableOpacity>
            )}
            {invoice.paymentInfo.remainingBalance > 0 ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.paidButton]}
                onPress={handleMarkAsPaid}
              >
                <Text style={styles.actionButtonText}>Mark as Paid</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.duplicateButton]}
          onPress={handleDuplicate}
        >
          <Text style={styles.actionButtonText}>Duplicate</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vat: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  contact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  lineItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lineItemDescription: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  lineItemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lineItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  totalsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  balanceText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  sendButton: {
    backgroundColor: '#34C759',
  },
  paidButton: {
    backgroundColor: '#34C759',
  },
  pdfButton: {
    backgroundColor: '#5856D6',
  },
  emailButton: {
    backgroundColor: '#34C759',
  },
  duplicateButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
  },
});
