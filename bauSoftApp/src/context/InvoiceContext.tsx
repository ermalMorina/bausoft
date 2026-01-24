import React, { createContext, useContext, useState, useCallback } from 'react';
import { Invoice, InvoiceStatus } from '../types/invoice';
import {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  calculateRemainingBalance,
  determineInvoiceStatus,
} from '../utils/invoiceCalculations';

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  duplicateInvoice: (id: string) => Invoice | null;
  getInvoice: (id: string) => Invoice | undefined;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const addInvoice = useCallback((
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>
  ): Invoice => {
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

    const newInvoice: Invoice = {
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

    setInvoices((prev) => [...prev, newInvoice]);
    return newInvoice;
  }, [invoices]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) => {
        if (invoice.id !== id) return invoice;

        // Recalculate totals if line items changed
        const lineItems = updates.lineItems || invoice.lineItems;
        const discount = updates.discount !== undefined ? updates.discount : invoice.discount || 0;
        
        const totals = calculateInvoiceTotals(lineItems, discount);
        
        const paidAmount = updates.paymentInfo?.paidAmount ?? invoice.paymentInfo.paidAmount;
        const remainingBalance = calculateRemainingBalance(totals.grandTotal, paidAmount);
        
        const status = determineInvoiceStatus(
          updates.dueDate || invoice.dueDate,
          paidAmount,
          totals.grandTotal,
          updates.status || invoice.status
        );

        // Update line items with calculated totals
        const updatedLineItems = lineItems.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice * (1 + item.taxPercent / 100),
        }));

        return {
          ...invoice,
          ...updates,
          lineItems: updatedLineItems,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          paymentInfo: {
            ...invoice.paymentInfo,
            ...updates.paymentInfo,
            remainingBalance,
          },
          status,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  }, []);

  const duplicateInvoice = useCallback((id: string): Invoice | null => {
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

    setInvoices((prev) => [...prev, duplicated]);
    return duplicated;
  }, [invoices]);

  const getInvoice = useCallback((id: string) => {
    return invoices.find((inv) => inv.id === id);
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
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}
