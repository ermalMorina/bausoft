export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface BusinessInfo {
  companyName: string;
  address: string;
  vatNumber?: string;
  businessNumber?: string;
  logo?: string; // URI to logo image
}

export interface ClientInfo {
  name: string;
  address: string;
  email?: string;
  phone?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  total: number; // Calculated: (quantity * unitPrice) * (1 + taxPercent/100)
}

export interface PaymentInfo {
  method?: string;
  paidAmount: number;
  paymentDate?: string; // ISO date string
  remainingBalance: number; // Calculated: grandTotal - paidAmount
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Auto-generated, unique
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  status: InvoiceStatus;
  lineItems: LineItem[];
  subtotal: number; // Sum of all line items before tax
  taxTotal: number; // Sum of all tax amounts
  discount?: number; // Optional discount amount
  grandTotal: number; // subtotal + taxTotal - discount
  paymentInfo: PaymentInfo;
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
