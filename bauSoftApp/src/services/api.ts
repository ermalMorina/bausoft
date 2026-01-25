import { Invoice, BusinessInfo, ClientInfo, LineItem } from '../types/invoice';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/graphql';

// GraphQL request helper using fetch (built into React Native)
async function graphqlRequest(query: string, variables?: any) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      const errorMessage = result.errors[0]?.message || 'GraphQL error';
      const errorDetails = result.errors[0]?.extensions || {};
      console.error('GraphQL errors:', result.errors);
      throw new Error(`${errorMessage}${errorDetails.code ? ` (${errorDetails.code})` : ''}`);
    }

    return result.data;
  } catch (error: any) {
    console.error('GraphQL request error:', error);
    if (error.message) {
      throw error;
    }
    throw new Error(`Network error: ${error.message || 'Failed to connect to server'}`);
  }
}

// For now, we'll use a default user_id (you'll need to implement authentication later)
const DEFAULT_USER_ID = 1;

// Helper to convert frontend Invoice to backend format
function convertInvoiceToBackend(invoice: Invoice, userId: number = DEFAULT_USER_ID) {
  // Ensure dates are in ISO format
  let issueDate: string;
  let dueDate: string;
  
  try {
    // Handle both date strings and Date objects
    if (invoice.issueDate instanceof Date) {
      issueDate = invoice.issueDate.toISOString();
    } else {
      const date = new Date(invoice.issueDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid issueDate');
      }
      issueDate = date.toISOString();
    }
  } catch (e) {
    console.warn('Invalid issueDate, using current date:', invoice.issueDate);
    issueDate = new Date().toISOString();
  }
  
  try {
    if (invoice.dueDate instanceof Date) {
      dueDate = invoice.dueDate.toISOString();
    } else {
      const date = new Date(invoice.dueDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid dueDate');
      }
      dueDate = date.toISOString();
    }
  } catch (e) {
    console.warn('Invalid dueDate, using 30 days from now:', invoice.dueDate);
    // Default to 30 days from now
    const date = new Date();
    date.setDate(date.getDate() + 30);
    dueDate = date.toISOString();
  }

  return {
    user_id: userId,
    client_id: 0, // Will be set after creating/finding client
    invoice_number: invoice.invoiceNumber,
    issue_date: issueDate,
    due_date: dueDate,
    status: invoice.status || 'draft',
    items: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      tax_rate: Number(item.taxPercent),
    })),
  };
}

// Helper to convert backend invoice to frontend format
function convertInvoiceFromBackend(backendInvoice: any, businessInfo: BusinessInfo): Invoice {
  return {
    id: backendInvoice.id.toString(),
    invoiceNumber: backendInvoice.invoice_number,
    businessInfo,
    clientInfo: {
      name: backendInvoice.client.name,
      address: backendInvoice.client.address || '',
      email: backendInvoice.client.email || '',
      phone: backendInvoice.client.phone || '',
    },
    issueDate: (() => {
      if (!backendInvoice.issue_date) {
        console.warn('Missing issue_date, using current date');
        return new Date().toISOString();
      }
      
      try {
        // Handle various date formats from Prisma/PostgreSQL
        let dateStr = backendInvoice.issue_date;
        
        // If it's already a Date object (shouldn't happen but be safe)
        if (dateStr instanceof Date) {
          return dateStr.toISOString();
        }
        
        // Convert to string if needed
        if (typeof dateStr !== 'string') {
          dateStr = String(dateStr);
        }
        
        // Prisma returns ISO strings, but sometimes they might have timezone issues
        // Ensure we have a valid date string
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
          console.error('Invalid issue_date from backend:', backendInvoice.issue_date, 'Type:', typeof backendInvoice.issue_date);
          return new Date().toISOString();
        }
        
        return date.toISOString();
      } catch (e) {
        console.error('Error parsing issue_date:', backendInvoice.issue_date, e);
        return new Date().toISOString();
      }
    })(),
    dueDate: (() => {
      if (!backendInvoice.due_date) {
        console.warn('Missing due_date, using 30 days from now');
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString();
      }
      
      try {
        // Handle various date formats from Prisma/PostgreSQL
        let dateStr = backendInvoice.due_date;
        
        // If it's already a Date object (shouldn't happen but be safe)
        if (dateStr instanceof Date) {
          return dateStr.toISOString();
        }
        
        // Convert to string if needed
        if (typeof dateStr !== 'string') {
          dateStr = String(dateStr);
        }
        
        // Prisma returns ISO strings, but sometimes they might have timezone issues
        // Ensure we have a valid date string
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
          console.error('Invalid due_date from backend:', backendInvoice.due_date, 'Type:', typeof backendInvoice.due_date);
          // Default to 30 days from now
          const defaultDate = new Date();
          defaultDate.setDate(defaultDate.getDate() + 30);
          return defaultDate.toISOString();
        }
        
        return date.toISOString();
      } catch (e) {
        console.error('Error parsing due_date:', backendInvoice.due_date, e);
        // Default to 30 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);
        return defaultDate.toISOString();
      }
    })(),
    status: backendInvoice.status as any,
    lineItems: backendInvoice.items.map((item: any) => ({
      id: item.id.toString(),
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      taxPercent: Number(item.tax_rate),
      total: Number(item.line_total),
    })),
    subtotal: Number(backendInvoice.subtotal),
    taxTotal: Number(backendInvoice.tax_total),
    grandTotal: Number(backendInvoice.total),
    paymentInfo: {
      paidAmount: 0, // Backend doesn't track this yet
      remainingBalance: Number(backendInvoice.total),
    },
    createdAt: backendInvoice.created_at,
    updatedAt: backendInvoice.created_at,
  };
}

export const api = {
  // Create or find a client
  async createOrFindClient(clientInfo: ClientInfo, userId: number = DEFAULT_USER_ID): Promise<number> {
    // First, try to find existing client by email or name
    const findClientQuery = `
      query FindClient($userId: Int!) {
        clients(userId: $userId) {
          id
          name
          email
        }
      }
    `;

    try {
      const data: any = await graphqlRequest(findClientQuery, {
        userId,
      });

      // Check if client exists by email or name
      const existingClient = data.clients.find(
        (c: any) => 
          (clientInfo.email && c.email === clientInfo.email) || 
          c.name === clientInfo.name
      );

      if (existingClient) {
        return existingClient.id;
      }
    } catch (error) {
      console.log('Error finding client, will create new one:', error);
    }

    // Create new client
    const createClientMutation = `
      mutation CreateClient($input: CreateClientInput!) {
        createClient(input: $input) {
          id
        }
      }
    `;

    const data: any = await graphqlRequest(createClientMutation, {
      input: {
        user_id: userId,
        name: clientInfo.name,
        address: clientInfo.address || null,
        email: clientInfo.email || null,
        phone: clientInfo.phone || null,
      },
    });

    return data.createClient.id;
  },

  // Create an invoice
  async createInvoice(invoice: Invoice, businessInfo: BusinessInfo): Promise<Invoice> {
    const clientId = await this.createOrFindClient(invoice.clientInfo);

    const mutation = `
      mutation CreateInvoice($input: CreateInvoiceInput!) {
        createInvoice(input: $input) {
          id
          invoice_number
          issue_date
          due_date
          status
          subtotal
          tax_total
          total
          created_at
          client {
            id
            name
            address
            email
            phone
          }
          items {
            id
            description
            quantity
            unit_price
            tax_rate
            line_total
          }
        }
      }
    `;

    const backendData = convertInvoiceToBackend(invoice);
    backendData.client_id = clientId;

    const data: any = await graphqlRequest(mutation, {
      input: backendData,
    });

    return convertInvoiceFromBackend(data.createInvoice, businessInfo);
  },

  // Update an invoice
  async updateInvoice(id: string, updates: Partial<Invoice>, businessInfo: BusinessInfo): Promise<Invoice> {
    // Try to parse backend ID from frontend ID
    // Frontend IDs are like "inv_1234567890_abc" or just the backend ID as string
    let invoiceId: number;
    if (id.startsWith('inv_')) {
      // This is a temporary ID - try to find the invoice by invoice_number
      // First, we need to get the invoice number from the updates or find it
      console.warn('Temporary ID detected, attempting to find invoice by number...');
      
      // If we have the invoice number in updates, use it
      // Otherwise, we'd need to search - for now, throw an error
      throw new Error('Cannot update invoice with temporary ID. Please refresh the app to load invoices from backend, then try again.');
    } else {
      invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        console.error('Invalid invoice ID format:', id);
        throw new Error(`Invalid invoice ID: ${id}. Expected a number or backend ID.`);
      }
    }
    
    console.log('Updating invoice with backend ID:', invoiceId);

    const mutation = `
      mutation UpdateInvoice($id: Int!, $input: UpdateInvoiceInput!) {
        updateInvoice(id: $id, input: $input) {
          id
          invoice_number
          issue_date
          due_date
          status
          subtotal
          tax_total
          total
          created_at
          client {
            id
            name
            address
            email
            phone
          }
          items {
            id
            description
            quantity
            unit_price
            tax_rate
            line_total
          }
        }
      }
    `;

    const input: any = {};
    
    // Include all updateable fields
    if (updates.status) input.status = updates.status;
    if (updates.invoiceNumber) input.invoice_number = updates.invoiceNumber;
    
    // Handle clientInfo update - find or create client and get client_id
    if (updates.clientInfo) {
      console.log('=== api.updateInvoice: Updating clientInfo ===');
      console.log('ClientInfo:', updates.clientInfo);
      const clientId = await this.createOrFindClient(updates.clientInfo);
      input.client_id = clientId;
      console.log('Client ID:', clientId);
    }
    
    // Include items if they were updated
    if (updates.lineItems && Array.isArray(updates.lineItems) && updates.lineItems.length > 0) {
      console.log('=== api.updateInvoice: Including lineItems ===');
      console.log('LineItems count:', updates.lineItems.length);
      input.items = updates.lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unitPrice),
        tax_rate: Number(item.taxPercent),
      }));
      console.log('Converted items for backend:', input.items);
    }
    
    // Safely convert dates - only update if provided and valid
    if (updates.dueDate !== undefined) {
      try {
        let date: Date;
        if (updates.dueDate instanceof Date) {
          date = updates.dueDate;
        } else if (typeof updates.dueDate === 'string') {
          // If it's already an ISO string, validate it
          if (updates.dueDate.includes('T') || updates.dueDate.includes('Z')) {
            date = new Date(updates.dueDate);
          } else {
            // Might be a date-only string like "2024-01-24"
            date = new Date(updates.dueDate + 'T00:00:00Z');
          }
        } else {
          throw new Error('Invalid date type');
        }
        
        if (!isNaN(date.getTime()) && date.getTime() > 0) {
          input.due_date = date.toISOString();
        } else {
          console.warn('Invalid dueDate value, skipping:', updates.dueDate);
        }
      } catch (e) {
        console.error('Error processing dueDate:', updates.dueDate, e);
        // Don't include invalid dates
      }
    }
    
    if (updates.issueDate !== undefined) {
      try {
        let date: Date;
        if (updates.issueDate instanceof Date) {
          date = updates.issueDate;
        } else if (typeof updates.issueDate === 'string') {
          // If it's already an ISO string, validate it
          if (updates.issueDate.includes('T') || updates.issueDate.includes('Z')) {
            date = new Date(updates.issueDate);
          } else {
            // Might be a date-only string like "2024-01-24"
            date = new Date(updates.issueDate + 'T00:00:00Z');
          }
        } else {
          throw new Error('Invalid date type');
        }
        
        if (!isNaN(date.getTime()) && date.getTime() > 0) {
          input.issue_date = date.toISOString();
        } else {
          console.warn('Invalid issueDate value, skipping:', updates.issueDate);
        }
      } catch (e) {
        console.error('Error processing issueDate:', updates.issueDate, e);
        // Don't include invalid dates
      }
    }

    // Only send update if there's something to update
    // Note: items array might be empty, so check if we have any actual updates
    const hasUpdates = Object.keys(input).length > 0 && (
      input.status !== undefined ||
      input.invoice_number !== undefined ||
      input.client_id !== undefined ||
      input.issue_date !== undefined ||
      input.due_date !== undefined ||
      (input.items !== undefined && input.items.length > 0)
    );
    
    if (!hasUpdates) {
      console.log('No updates to send, returning current invoice');
      // No updates to send, just return the current invoice
      const currentInvoice = await this.getInvoice(id, businessInfo);
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }
      return currentInvoice;
    }

    console.log('=== api.updateInvoice: GraphQL Request ===');
    console.log('Invoice ID:', invoiceId);
    console.log('Input object:', input);
    console.log('Input keys:', Object.keys(input));
    console.log('Input values:', Object.values(input));
    
    const data: any = await graphqlRequest(mutation, {
      id: invoiceId,
      input,
    });

    console.log('=== api.updateInvoice: GraphQL Response ===');
    console.log('Raw backend response:', data);
    console.log('Backend updateInvoice object:', data.updateInvoice);
    console.log('Backend invoice ID:', data.updateInvoice?.id);
    console.log('Backend invoice status:', data.updateInvoice?.status);
    console.log('Backend invoice issue_date:', data.updateInvoice?.issue_date);
    console.log('Backend invoice due_date:', data.updateInvoice?.due_date);
    
    const converted = convertInvoiceFromBackend(data.updateInvoice, businessInfo);
    
    console.log('=== api.updateInvoice: Converted Invoice ===');
    console.log('Converted invoice:', converted);
    console.log('Converted invoice ID:', converted.id);
    console.log('Converted invoice status:', converted.status);
    console.log('Converted invoice issueDate:', converted.issueDate);
    console.log('Converted invoice dueDate:', converted.dueDate);
    console.log('Converted invoice:', converted);
    
    return converted;
  },

  // Delete an invoice
  async deleteInvoice(id: string): Promise<boolean> {
    let invoiceId: number;
    if (id.startsWith('inv_')) {
      throw new Error('Cannot delete invoice with temporary ID. Please refresh and try again.');
    } else {
      invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        throw new Error('Invalid invoice ID');
      }
    }

    const mutation = `
      mutation DeleteInvoice($id: Int!) {
        deleteInvoice(id: $id)
      }
    `;

    await graphqlRequest(mutation, { id: invoiceId });
    return true;
  },

  // Get all invoices for a user
  async getInvoices(userId: number = DEFAULT_USER_ID, businessInfo: BusinessInfo): Promise<Invoice[]> {
    const query = `
      query GetInvoices($userId: Int!) {
        invoices(userId: $userId) {
          id
          invoice_number
          issue_date
          due_date
          status
          subtotal
          tax_total
          total
          created_at
          client {
            id
            name
            address
            email
            phone
          }
          items {
            id
            description
            quantity
            unit_price
            tax_rate
            line_total
          }
        }
      }
    `;

    const data: any = await graphqlRequest(query, { userId });
    return data.invoices.map((inv: any) => convertInvoiceFromBackend(inv, businessInfo));
  },

  // Get a single invoice
  async getInvoice(id: string, businessInfo: BusinessInfo): Promise<Invoice | null> {
    let invoiceId: number;
    if (id.startsWith('inv_')) {
      // Temporary ID - can't fetch from backend
      return null;
    } else {
      invoiceId = parseInt(id);
      if (isNaN(invoiceId)) {
        return null;
      }
    }

    const query = `
      query GetInvoice($id: Int!) {
        invoice(id: $id) {
          id
          invoice_number
          issue_date
          due_date
          status
          subtotal
          tax_total
          total
          created_at
          client {
            id
            name
            address
            email
            phone
          }
          items {
            id
            description
            quantity
            unit_price
            tax_rate
            line_total
          }
        }
      }
    `;

    try {
      const data: any = await graphqlRequest(query, { id: invoiceId });
      return convertInvoiceFromBackend(data.invoice, businessInfo);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },
};
