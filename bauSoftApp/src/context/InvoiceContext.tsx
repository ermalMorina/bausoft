import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Invoice, InvoiceStatus, BusinessInfo } from '../types/invoice';
import {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  calculateRemainingBalance,
  determineInvoiceStatus,
} from '../utils/invoiceCalculations';
import { api } from '../services/api';

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  duplicateInvoice: (id: string) => Promise<Invoice | null>;
  getInvoice: (id: string) => Invoice | undefined;
  loading: boolean;
  error: string | null;
  refreshInvoices: () => Promise<void>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

// Default business info - in a real app, this would come from user settings/auth
const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  companyName: 'Your Company',
  address: 'Your Address',
  vatNumber: '',
};

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load invoices from backend on mount
  useEffect(() => {
    refreshInvoices();
  }, []);

  const refreshInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const backendInvoices = await api.getInvoices(1, DEFAULT_BUSINESS_INFO);
      setInvoices(backendInvoices);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setError(err.message || 'Failed to load invoices');
      // Keep local invoices if API fails
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvoice = useCallback(async (
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<Invoice> => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();
      const invoiceNumber = generateInvoiceNumber(invoices);
      
      const totals = calculateInvoiceTotals(
        invoiceData.lineItems,
        invoiceData.discount || 0
      );

      const remainingBalance = calculateRemainingBalance(
        totals.grandTotal,
        invoiceData.paymentInfo.paidAmount
      );

      const status = determineInvoiceStatus(
        invoiceData.dueDate,
        invoiceData.paymentInfo.paidAmount,
        totals.grandTotal,
        invoiceData.status
      );

      // Create temporary invoice for local state
      const tempInvoice: Invoice = {
        ...invoiceData,
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        paymentInfo: {
          ...invoiceData.paymentInfo,
          remainingBalance,
        },
        status,
        createdAt: now,
        updatedAt: now,
      };

      // Add to local state immediately for optimistic update
      setInvoices((prev) => [...prev, tempInvoice]);

      // Save to backend
      const savedInvoice = await api.createInvoice(tempInvoice, invoiceData.businessInfo || DEFAULT_BUSINESS_INFO);
      
      // Replace temp invoice with saved one
      setInvoices((prev) => 
        prev.map(inv => inv.id === tempInvoice.id ? savedInvoice : inv)
      );

      return savedInvoice;
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Failed to create invoice');
      // Remove temp invoice on error - find it by checking the last added invoice
      setInvoices((prev) => {
        const lastInvoice = prev[prev.length - 1];
        if (lastInvoice && lastInvoice.id.startsWith('inv_')) {
          return prev.filter(inv => inv.id !== lastInvoice.id);
        }
        return prev;
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoices]);

  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    try {
      setLoading(true);
      setError(null);

      const invoice = invoices.find(inv => inv.id === id);
      if (!invoice) {
        console.error('Invoice not found in context. ID:', id, 'Available invoices:', invoices.map(i => ({ id: i.id, number: i.invoiceNumber })));
        throw new Error(`Invoice not found: ${id}`);
      }

      console.log('Updating invoice:', {
        id,
        invoiceNumber: invoice.invoiceNumber,
        currentStatus: invoice.status,
        updates
      });

      // Check if this is a temporary ID (not saved to backend yet)
      if (id.startsWith('inv_')) {
        console.warn('Cannot update invoice with temporary ID. Invoice needs to be saved to backend first.');
        // For temporary invoices, just do local update
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.id !== id) return inv;

            // Recalculate totals if line items changed
            const lineItems = updates.lineItems || inv.lineItems;
            const discount = updates.discount !== undefined ? updates.discount : inv.discount || 0;
            
            const totals = calculateInvoiceTotals(lineItems, discount);
            
            const paidAmount = updates.paymentInfo?.paidAmount ?? inv.paymentInfo.paidAmount;
            const remainingBalance = calculateRemainingBalance(totals.grandTotal, paidAmount);
            
            const status = determineInvoiceStatus(
              updates.dueDate || inv.dueDate,
              paidAmount,
              totals.grandTotal,
              updates.status || inv.status
            );

            // Update line items with calculated totals
            const updatedLineItems = lineItems.map((item) => ({
              ...item,
              total: item.quantity * item.unitPrice * (1 + item.taxPercent / 100),
            }));

            return {
              ...inv,
              ...updates,
              lineItems: updatedLineItems,
              subtotal: totals.subtotal,
              taxTotal: totals.taxTotal,
              grandTotal: totals.grandTotal,
              paymentInfo: {
                ...inv.paymentInfo,
                ...updates.paymentInfo,
                remainingBalance,
              },
              status,
              updatedAt: new Date().toISOString(),
            };
          })
        );
        setLoading(false);
        return;
      }

      // Optimistic update
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== id) return inv;

          // Recalculate totals if line items changed
          const lineItems = updates.lineItems || inv.lineItems;
          const discount = updates.discount !== undefined ? updates.discount : inv.discount || 0;
          
          const totals = calculateInvoiceTotals(lineItems, discount);
          
          const paidAmount = updates.paymentInfo?.paidAmount ?? inv.paymentInfo.paidAmount;
          const remainingBalance = calculateRemainingBalance(totals.grandTotal, paidAmount);
          
          const status = determineInvoiceStatus(
            updates.dueDate || inv.dueDate,
            paidAmount,
            totals.grandTotal,
            updates.status || inv.status
          );

          // Update line items with calculated totals
          const updatedLineItems = lineItems.map((item) => ({
            ...item,
            total: item.quantity * item.unitPrice * (1 + item.taxPercent / 100),
          }));

          return {
            ...inv,
            ...updates,
            lineItems: updatedLineItems,
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            paymentInfo: {
              ...inv.paymentInfo,
              ...updates.paymentInfo,
              remainingBalance,
            },
            status,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      // Update on backend - send all supported fields
      const backendUpdates: Partial<Invoice> = {};
      if (updates.status !== undefined) backendUpdates.status = updates.status;
      if (updates.dueDate !== undefined) backendUpdates.dueDate = updates.dueDate;
      if (updates.issueDate !== undefined) backendUpdates.issueDate = updates.issueDate;
      if (updates.invoiceNumber !== undefined) backendUpdates.invoiceNumber = updates.invoiceNumber;
      if (updates.clientInfo !== undefined) backendUpdates.clientInfo = updates.clientInfo;
      // Include lineItems if they were updated
      if (updates.lineItems !== undefined) {
        backendUpdates.lineItems = updates.lineItems;
        console.log('Including lineItems in backend update:', updates.lineItems.length, 'items');
      }
      
      console.log('=== updateInvoice: Backend Updates ===');
      console.log('Backend updates to send:', backendUpdates);
      console.log('Backend updates keys:', Object.keys(backendUpdates));
      
      // Only call backend if there are supported updates
      if (Object.keys(backendUpdates).length > 0) {
        console.log('Calling api.updateInvoice with:', {
          id,
          backendUpdates,
          businessInfo: invoice.businessInfo?.companyName || 'N/A'
        });
        
        const updatedInvoice = await api.updateInvoice(id, backendUpdates, invoice.businessInfo || DEFAULT_BUSINESS_INFO);
        
        console.log('=== updateInvoice: Backend Response ===');
        console.log('Backend returned invoice:', updatedInvoice);
        console.log('Backend invoice status:', updatedInvoice.status);
        console.log('Backend invoice paymentInfo (if any):', (updatedInvoice as any).paymentInfo);
        
        // Merge backend response with frontend-only fields (like paymentInfo)
        const mergedInvoice: Invoice = {
          ...updatedInvoice,
          // Preserve frontend-only fields that backend doesn't track
          paymentInfo: updates.paymentInfo || invoice.paymentInfo,
          discount: updates.discount !== undefined ? updates.discount : invoice.discount,
          notes: updates.notes !== undefined ? updates.notes : invoice.notes,
        };
        
        console.log('=== updateInvoice: Merged Invoice ===');
        console.log('Merged invoice:', mergedInvoice);
        console.log('Merged invoice status:', mergedInvoice.status);
        console.log('Merged invoice paymentInfo:', mergedInvoice.paymentInfo);
        console.log('Original invoice paymentInfo:', invoice.paymentInfo);
        console.log('Updates paymentInfo:', updates.paymentInfo);
        
        // Replace with merged invoice
        setInvoices((prev) => {
          console.log('=== updateInvoice: setInvoices callback ===');
          console.log('Previous invoices count:', prev.length);
          console.log('Looking for invoice with ID:', id);
          console.log('Previous invoice found:', prev.find(inv => inv.id === id));
          
          const updated = prev.map(inv => {
            if (inv.id === id) {
              console.log('Replacing invoice:', {
                oldId: inv.id,
                oldStatus: inv.status,
                oldPaymentInfo: inv.paymentInfo,
                newId: mergedInvoice.id,
                newStatus: mergedInvoice.status,
                newPaymentInfo: mergedInvoice.paymentInfo,
              });
              return mergedInvoice;
            }
            return inv;
          });
          
          console.log('Updated invoices count:', updated.length);
          const foundUpdated = updated.find(inv => inv.id === id);
          console.log('Updated invoice in list:', foundUpdated);
          console.log('Updated invoice status in list:', foundUpdated?.status);
          console.log('Updated invoice paymentInfo in list:', foundUpdated?.paymentInfo);
          
          return updated;
        });
        
        console.log('=== updateInvoice: Returning merged invoice ===');
        return mergedInvoice;
      } else {
        // No backend updates needed, just keep the optimistic update
        console.log('=== updateInvoice: No Backend Updates ===');
        console.log('No backend-supported fields to update, keeping local changes');
        console.log('Updates received:', updates);
        console.log('Backend updates would be:', backendUpdates);
        
        // Return the optimistically updated invoice
        const optimisticInvoice = invoices.find(inv => inv.id === id);
        if (optimisticInvoice) {
          console.log('Returning optimistic invoice:', optimisticInvoice);
          return optimisticInvoice;
        }
      }
    } catch (err: any) {
      console.error('=== updateInvoice: ERROR ===');
      console.error('Error details:', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      setError(err.message || 'Failed to update invoice');
      // Reload from backend on error
      console.log('Refreshing invoices after error...');
      await refreshInvoices();
      throw err;
    } finally {
      setLoading(false);
      console.log('=== updateInvoice: Finally block ===');
      console.log('Loading set to false');
    }
  }, [invoices, refreshInvoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Optimistic delete
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));

      // Delete from backend
      await api.deleteInvoice(id);
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      setError(err.message || 'Failed to delete invoice');
      // Reload from backend on error
      await refreshInvoices();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshInvoices]);

  const duplicateInvoice = useCallback(async (id: string): Promise<Invoice | null> => {
    try {
      setLoading(true);
      setError(null);

      const invoice = invoices.find((inv) => inv.id === id);
      if (!invoice) return null;

      const duplicated = {
        ...invoice,
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: generateInvoiceNumber(invoices),
        status: 'draft' as InvoiceStatus,
        paymentInfo: {
          ...invoice.paymentInfo,
          paidAmount: 0,
          remainingBalance: invoice.grandTotal,
          paymentDate: undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to local state
      setInvoices((prev) => [...prev, duplicated]);

      // Save to backend
      const savedInvoice = await api.createInvoice(duplicated, invoice.businessInfo || DEFAULT_BUSINESS_INFO);
      
      // Replace with saved version
      setInvoices((prev) => 
        prev.map(inv => inv.id === duplicated.id ? savedInvoice : inv)
      );

      return savedInvoice;
    } catch (err: any) {
      console.error('Error duplicating invoice:', err);
      setError(err.message || 'Failed to duplicate invoice');
      // Remove temp invoice on error - find it by checking the last added invoice
      setInvoices((prev) => {
        const lastInvoice = prev[prev.length - 1];
        if (lastInvoice && lastInvoice.id.startsWith('inv_')) {
          return prev.filter(inv => inv.id !== lastInvoice.id);
        }
        return prev;
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoices]);

  const getInvoice = useCallback((id: string) => {
    const found = invoices.find((inv) => inv.id === id);
    if (!found) {
      console.warn('Invoice not found:', id, 'Available IDs:', invoices.map(i => i.id));
    }
    return found;
  }, [invoices]);

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        duplicateInvoice,
        getInvoice,
        loading,
        error,
        refreshInvoices,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  console.log('earmal context:', context);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}
