import { Invoice, LineItem } from '../types/invoice';

/**
 * Calculate total for a single line item
 */
export function calculateLineItemTotal(item: LineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxPercent / 100);
  return subtotal + taxAmount;
}

/**
 * Calculate all totals for an invoice
 */
export function calculateInvoiceTotals(
  lineItems: LineItem[],
  discount: number = 0
): {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let taxTotal = 0;

  lineItems.forEach((item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemTax = itemSubtotal * (item.taxPercent / 100);
    subtotal += itemSubtotal;
    taxTotal += itemTax;
  });

  const grandTotal = subtotal + taxTotal - discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXX (e.g., INV-20260123-0001)
 */
export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `INV-${dateStr}-`;

  // Find the highest number for today
  const todayInvoices = existingInvoices.filter((inv) =>
    inv.invoiceNumber.startsWith(prefix)
  );

  if (todayInvoices.length === 0) {
    return `${prefix}0001`;
  }

  const numbers = todayInvoices.map((inv) => {
    const numStr = inv.invoiceNumber.split('-')[2];
    return parseInt(numStr, 10);
  });

  const maxNum = Math.max(...numbers);
  const nextNum = (maxNum + 1).toString().padStart(4, '0');

  return `${prefix}${nextNum}`;
}

/**
 * Calculate remaining balance
 */
export function calculateRemainingBalance(
  grandTotal: number,
  paidAmount: number
): number {
  return Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);
}

/**
 * Determine invoice status based on dates and payment
 */
export function determineInvoiceStatus(
  dueDate: string,
  paidAmount: number,
  grandTotal: number,
  currentStatus: Invoice['status']
): Invoice['status'] {
  // If fully paid, status is paid
  if (paidAmount >= grandTotal) {
    return 'paid';
  }

  // If status was already set to sent or paid, keep it (unless fully paid)
  if (currentStatus === 'sent' || currentStatus === 'paid') {
    if (paidAmount >= grandTotal) return 'paid';
    return currentStatus;
  }

  // Check if overdue
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (due < today && paidAmount < grandTotal) {
    return 'overdue';
  }

  return currentStatus || 'draft';
}
