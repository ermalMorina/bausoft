import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useInvoices } from '../../context/InvoiceContext';
import { Invoice, LineItem, BusinessInfo, ClientInfo } from '../../types/invoice';
import { calculateLineItemTotal } from '../../utils/invoiceCalculations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'InvoiceForm'>;

export default function InvoiceFormScreen() {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { getInvoice, addInvoice, updateInvoice } = useInvoices();

  const isEditing = !!route.params?.invoiceId;
  const existingInvoice = route.params?.invoiceId
    ? getInvoice(route.params.invoiceId)
    : null;

  // Business Info
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(
    existingInvoice?.businessInfo || {
      companyName: '',
      address: '',
      vatNumber: '',
      businessNumber: '',
    }
  );

  // Client Info
  const [clientInfo, setClientInfo] = useState<ClientInfo>(
    existingInvoice?.clientInfo || {
      name: '',
      address: '',
      email: '',
      phone: '',
    }
  );

  // Invoice Details
  const [issueDate, setIssueDate] = useState(
    existingInvoice?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    existingInvoice?.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
  );
  const [discount, setDiscount] = useState(
    existingInvoice?.discount?.toString() || '0'
  );

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingInvoice?.lineItems || [
      {
        id: `item_${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxPercent: 0,
        total: 0,
      },
    ]
  );

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.total = calculateLineItemTotal(updated);
          return updated;
        }
        return item;
      })
    );
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: `item_${Date.now()}_${Math.random()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxPercent: 0,
        total: 0,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    } else {
      Alert.alert('Cannot Remove', 'Invoice must have at least one item');
    }
  };

  const handleSave = () => {
    // Validation
    if (!businessInfo.companyName.trim()) {
      Alert.alert('Error', 'Please enter company name');
      return;
    }
    if (!clientInfo.name.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      Alert.alert('Error', 'Please fill in all item descriptions');
      return;
    }

    const invoiceData = {
      businessInfo,
      clientInfo,
      issueDate,
      dueDate,
      status: existingInvoice?.status || 'draft',
      lineItems,
      discount: parseFloat(discount) || 0,
      paymentInfo: existingInvoice?.paymentInfo || {
        paidAmount: 0,
        remainingBalance: 0,
      },
    };

    if (isEditing && existingInvoice) {
      updateInvoice(existingInvoice.id, invoiceData);
      Alert.alert('Success', 'Invoice updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      const newInvoice = addInvoice(invoiceData);
      Alert.alert('Success', 'Invoice created', [
        {
          text: 'View',
          onPress: () =>
            navigation.replace('InvoiceDetail', { invoiceId: newInvoice.id }),
        },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {/* Business Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Company Name *"
              value={businessInfo.companyName}
              onChangeText={(text) =>
                setBusinessInfo({ ...businessInfo, companyName: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Address *"
              value={businessInfo.address}
              onChangeText={(text) =>
                setBusinessInfo({ ...businessInfo, address: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="VAT Number"
              value={businessInfo.vatNumber || ''}
              onChangeText={(text) =>
                setBusinessInfo({ ...businessInfo, vatNumber: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Business Number"
              value={businessInfo.businessNumber || ''}
              onChangeText={(text) =>
                setBusinessInfo({ ...businessInfo, businessNumber: text })
              }
            />
          </View>

          {/* Client Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Client Name *"
              value={clientInfo.name}
              onChangeText={(text) =>
                setClientInfo({ ...clientInfo, name: text })
              }
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Address *"
              value={clientInfo.address}
              onChangeText={(text) =>
                setClientInfo({ ...clientInfo, address: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={clientInfo.email || ''}
              onChangeText={(text) =>
                setClientInfo({ ...clientInfo, email: text })
              }
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={clientInfo.phone || ''}
              onChangeText={(text) =>
                setClientInfo({ ...clientInfo, phone: text })
              }
              keyboardType="phone-pad"
            />
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Issue Date</Text>
                <TextInput
                  style={styles.input}
                  value={issueDate}
                  onChangeText={setIssueDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <Text style={styles.label}>Discount (€)</Text>
            <TextInput
              style={styles.input}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={addLineItem}
              >
                <Text style={styles.addItemButtonText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.map((item, index) => (
              <View key={item.id} style={styles.lineItemCard}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.itemNumber}>Item {index + 1}</Text>
                  {lineItems.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeLineItem(item.id)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Description *"
                  value={item.description}
                  onChangeText={(text) =>
                    updateLineItem(item.id, { description: text })
                  }
                />
                <View style={styles.row}>
                  <View style={styles.quarterInput}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity.toString()}
                      onChangeText={(text) =>
                        updateLineItem(item.id, {
                          quantity: parseFloat(text) || 0,
                        })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.quarterInput}>
                    <Text style={styles.label}>Unit Price</Text>
                    <TextInput
                      style={styles.input}
                      value={item.unitPrice.toString()}
                      onChangeText={(text) =>
                        updateLineItem(item.id, {
                          unitPrice: parseFloat(text) || 0,
                        })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.quarterInput}>
                    <Text style={styles.label}>Tax %</Text>
                    <TextInput
                      style={styles.input}
                      value={item.taxPercent.toString()}
                      onChangeText={(text) =>
                        updateLineItem(item.id, {
                          taxPercent: parseFloat(text) || 0,
                        })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.quarterInput}>
                    <Text style={styles.label}>Total</Text>
                    <Text style={styles.totalDisplay}>
                      €{item.total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Invoice' : 'Create Invoice'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  quarterInput: {
    flex: 1,
  },
  lineItemCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
  },
  totalDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 12,
    textAlign: 'center',
  },
  addItemButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
