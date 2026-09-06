import { createSchema } from "graphql-yoga";

import { YogaInitialContext } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';
import { workforceTypeDefs, workforceResolvers } from './workforce';

// Extend the Yoga context to include the prisma client
export interface GraphQLContext extends YogaInitialContext {
  prisma: PrismaClient;
}

const invoicingTypeDefs = /* GraphQL */ `
    type User {
      id: Int!
      name: String!
      email: String!
      company_name: String
      company_address: String
      vat_number: String
      created_at: String!
      clients: [Client!]!
      invoices: [Invoice!]!
    }

    type Client {
      id: Int!
      user_id: Int!
      name: String!
      address: String
      email: String
      phone: String
      created_at: String!
      user: User!
      invoices: [Invoice!]!
    }

    type Invoice {
      id: Int!
      user_id: Int!
      client_id: Int!
      invoice_number: String!
      issue_date: String!
      due_date: String!
      status: String!
      subtotal: Float!
      tax_total: Float!
      total: Float!
      created_at: String!
      user: User!
      client: Client!
      items: [InvoiceItem!]!
    }

    type InvoiceItem {
      id: Int!
      invoice_id: Int!
      description: String!
      quantity: Float!
      unit_price: Float!
      tax_rate: Float!
      line_total: Float!
      invoice: Invoice!
    }

    input CreateUserInput {
      name: String!
      email: String!
      password: String!
      company_name: String
      company_address: String
      vat_number: String
    }

    input UpdateUserInput {
      name: String
      email: String
      password: String
      company_name: String
      company_address: String
      vat_number: String
    }

    input CreateClientInput {
      user_id: Int!
      name: String!
      address: String
      email: String
      phone: String
    }

    input UpdateClientInput {
      name: String
      address: String
      email: String
      phone: String
    }

    input CreateInvoiceItemInput {
      description: String!
      quantity: Float!
      unit_price: Float!
      tax_rate: Float!
    }

    input CreateInvoiceInput {
      user_id: Int!
      client_id: Int!
      invoice_number: String!
      issue_date: String!
      due_date: String!
      status: String
      items: [CreateInvoiceItemInput!]!
    }

    input UpdateInvoiceInput {
      client_id: Int
      invoice_number: String
      issue_date: String
      due_date: String
      status: String
      items: [CreateInvoiceItemInput!]
    }

    input UpdateInvoiceItemInput {
      description: String
      quantity: Float
      unit_price: Float
      tax_rate: Float
    }

    type Mutation {
      # User mutations
      createUser(input: CreateUserInput!): User!
      updateUser(id: Int!, input: UpdateUserInput!): User
      deleteUser(id: Int!): Boolean!

      # Client mutations
      createClient(input: CreateClientInput!): Client!
      updateClient(id: Int!, input: UpdateClientInput!): Client
      deleteClient(id: Int!): Boolean!

      # Invoice mutations
      createInvoice(input: CreateInvoiceInput!): Invoice!
      updateInvoice(id: Int!, input: UpdateInvoiceInput!): Invoice
      deleteInvoice(id: Int!): Boolean!

      # Invoice Item mutations
      createInvoiceItem(invoice_id: Int!, input: CreateInvoiceItemInput!): InvoiceItem!
      updateInvoiceItem(id: Int!, input: UpdateInvoiceItemInput!): InvoiceItem
      deleteInvoiceItem(id: Int!): Boolean!
    }

    type Query {
      users: [User!]!
      user(id: Int!): User
      clients(userId: Int): [Client!]!
      client(id: Int!): Client
      invoices(userId: Int, clientId: Int): [Invoice!]!
      invoice(id: Int!): Invoice
      invoiceItems(invoiceId: Int!): [InvoiceItem!]!
      invoiceItem(id: Int!): InvoiceItem
    }
  `;

const invoicingResolvers = {
    // Custom scalar resolvers to ensure dates are serialized as ISO strings
    User: {
      created_at: (parent: any) => {
        if (parent.created_at instanceof Date) {
          return parent.created_at.toISOString();
        }
        return parent.created_at;
      },
    },
    Client: {
      created_at: (parent: any) => {
        if (parent.created_at instanceof Date) {
          return parent.created_at.toISOString();
        }
        return parent.created_at;
      },
    },
    Invoice: {
      issue_date: (parent: any) => {
        if (parent.issue_date instanceof Date) {
          return parent.issue_date.toISOString();
        }
        return parent.issue_date;
      },
      due_date: (parent: any) => {
        if (parent.due_date instanceof Date) {
          return parent.due_date.toISOString();
        }
        return parent.due_date;
      },
      created_at: (parent: any) => {
        if (parent.created_at instanceof Date) {
          return parent.created_at.toISOString();
        }
        return parent.created_at;
      },
    },
    Query: {
      users: async (_, __, { prisma }: GraphQLContext) => {
        return prisma.user.findMany({
          include: {
            clients: true,
            invoices: true,
          },
        });
      },
      user: async (_, { id }, { prisma }: GraphQLContext) => {
        return prisma.user.findUnique({
          where: { id },
          include: {
            clients: true,
            invoices: true,
          },
        });
      },
      clients: async (_, { userId }, { prisma }: GraphQLContext) => {
        if (userId) {
          return prisma.client.findMany({
            where: { user_id: userId },
            include: {
              user: true,
              invoices: true,
            },
          });
        }
        return prisma.client.findMany({
          include: {
            user: true,
            invoices: true,
          },
        });
      },
      client: async (_, { id }, { prisma }: GraphQLContext) => {
        return prisma.client.findUnique({
          where: { id },
          include: {
            user: true,
            invoices: true,
          },
        });
      },
      invoices: async (_, { userId, clientId }, { prisma }: GraphQLContext) => {
        const where: any = {};
        if (userId) where.user_id = userId;
        if (clientId) where.client_id = clientId;
        
        return prisma.invoice.findMany({
          where,
          include: {
            user: true,
            client: true,
            items: true,
          },
        });
      },
      invoice: async (_, { id }, { prisma }: GraphQLContext) => {
        return prisma.invoice.findUnique({
          where: { id },
          include: {
            user: true,
            client: true,
            items: true,
          },
        });
      },
      invoiceItems: async (_, { invoiceId }, { prisma }: GraphQLContext) => {
        return prisma.invoiceItem.findMany({
          where: { invoice_id: invoiceId },
          include: { invoice: true },
        });
      },
      invoiceItem: async (_, { id }, { prisma }: GraphQLContext) => {
        return prisma.invoiceItem.findUnique({
          where: { id },
          include: { invoice: true },
        });
      },
    },
    Mutation: {
      // User mutations
      createUser: async (_, { input }, { prisma }: GraphQLContext) => {
        return prisma.user.create({
          data: input,
          include: {
            clients: true,
            invoices: true,
          },
        });
      },
      updateUser: async (_, { id, input }, { prisma }: GraphQLContext) => {
        return prisma.user.update({
          where: { id },
          data: input,
          include: {
            clients: true,
            invoices: true,
          },
        });
      },
      deleteUser: async (_, { id }, { prisma }: GraphQLContext) => {
        await prisma.user.delete({
          where: { id },
        });
        return true;
      },

      // Client mutations
      createClient: async (_, { input }, { prisma }: GraphQLContext) => {
        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: input.user_id },
        });

        if (!user) {
          throw new Error(`User with id ${input.user_id} does not exist. Please create a user first.`);
        }

        return prisma.client.create({
          data: input,
          include: {
            user: true,
            invoices: true,
          },
        });
      },
      updateClient: async (_, { id, input }, { prisma }: GraphQLContext) => {
        return prisma.client.update({
          where: { id },
          data: input,
          include: {
            user: true,
            invoices: true,
          },
        });
      },
      deleteClient: async (_, { id }, { prisma }: GraphQLContext) => {
        await prisma.client.delete({
          where: { id },
        });
        return true;
      },

      // Invoice mutations
      createInvoice: async (_, { input }, { prisma }: GraphQLContext) => {
        // Verify user exists
        const user = await prisma.user.findUnique({
          where: { id: input.user_id },
        });

        if (!user) {
          throw new Error(`User with id ${input.user_id} does not exist. Please create a user first.`);
        }

        // Verify client exists
        const client = await prisma.client.findUnique({
          where: { id: input.client_id },
        });

        if (!client) {
          throw new Error(`Client with id ${input.client_id} does not exist.`);
        }
        const { items, ...invoiceData } = input;
        
        // Calculate totals from items
        let subtotal = 0;
        let taxTotal = 0;
        
        items.forEach((item: any) => {
          const lineTotal = Number(item.quantity) * Number(item.unit_price);
          const tax = lineTotal * (Number(item.tax_rate) / 100);
          subtotal += lineTotal;
          taxTotal += tax;
        });

        const total = subtotal + taxTotal;

        // Create invoice with items
        const invoice = await prisma.invoice.create({
          data: {
            ...invoiceData,
            issue_date: new Date(invoiceData.issue_date),
            due_date: new Date(invoiceData.due_date),
            status: invoiceData.status || 'draft',
            subtotal: subtotal,
            tax_total: taxTotal,
            total: total,
            items: {
              create: items.map((item: any) => {
                const lineTotal = Number(item.quantity) * Number(item.unit_price);
                const tax = lineTotal * (Number(item.tax_rate) / 100);
                return {
                  ...item,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  tax_rate: item.tax_rate,
                  line_total: lineTotal + tax,
                };
              }),
            },
          },
          include: {
            user: true,
            client: true,
            items: true,
          },
        });

        return invoice;
      },
      updateInvoice: async (_, { id, input }, { prisma }: GraphQLContext) => {
        console.log('=== Backend updateInvoice: START ===');
        console.log('Invoice ID:', id);
        console.log('Input received:', JSON.stringify(input, null, 2));
        console.log('Input keys:', Object.keys(input));
        console.log('Input status:', input.status);
        console.log('Input invoice_number:', input.invoice_number);
        console.log('Input client_id:', input.client_id);
        console.log('Input issue_date:', input.issue_date);
        console.log('Input due_date:', input.due_date);
        console.log('Input items:', input.items ? JSON.stringify(input.items, null, 2) : 'none');
        console.log('Input items count:', input.items ? input.items.length : 0);
        
        // Separate items from other update data
        const { items, ...invoiceUpdateData } = input;
        const updateData: any = { ...invoiceUpdateData };
        console.log('Initial updateData (without items):', JSON.stringify(updateData, null, 2));
        
        if (input.issue_date) {
          updateData.issue_date = new Date(input.issue_date);
          console.log('Converted issue_date to Date:', updateData.issue_date);
        }
        if (input.due_date) {
          updateData.due_date = new Date(input.due_date);
          console.log('Converted due_date to Date:', updateData.due_date);
        }

        // Validate client_id if provided
        if (input.client_id !== undefined) {
          console.log('Validating client_id:', input.client_id);
          const client = await prisma.client.findUnique({
            where: { id: input.client_id },
          });
          if (!client) {
            console.error('Client not found with ID:', input.client_id);
            throw new Error(`Client with id ${input.client_id} does not exist.`);
          }
          console.log('Client validated:', client.name);
        }

        // Fetch current invoice
        console.log('Fetching current invoice from database...');
        const invoice = await prisma.invoice.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!invoice) {
          console.error('=== Backend updateInvoice: ERROR ===');
          console.error('Invoice not found with ID:', id);
          throw new Error(`Invoice with ID ${id} not found`);
        }

        console.log('Current invoice found:', {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          total: invoice.total,
          items_count: invoice.items.length
        });

        // Handle item updates if provided
        if (items && Array.isArray(items)) {
          console.log('=== Updating invoice items ===');
          console.log('Current items count:', invoice.items.length);
          console.log('New items count:', items.length);
          
          // Delete all existing items
          console.log('Deleting existing items...');
          await prisma.invoiceItem.deleteMany({
            where: { invoice_id: id },
          });
          console.log('Existing items deleted');
          
          // Create new items
          console.log('Creating new items...');
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            const tax = lineTotal * (Number(item.tax_rate) / 100);
            
            console.log(`Creating item ${i + 1}:`, {
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              tax_rate: item.tax_rate,
              line_total: lineTotal + tax
            });
            
            await prisma.invoiceItem.create({
              data: {
                invoice_id: id,
                description: item.description,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                tax_rate: Number(item.tax_rate),
                line_total: lineTotal + tax,
              },
            });
          }
          console.log('All new items created');
        }

        // Recalculate totals from current items (after update if items were updated)
        const invoiceWithItems = await prisma.invoice.findUnique({
          where: { id },
          include: { items: true },
        });

        if (invoiceWithItems) {
          let subtotal = 0;
          let taxTotal = 0;
          
          console.log('Recalculating totals from items...');
          invoiceWithItems.items.forEach((item, index) => {
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            const tax = lineTotal * (Number(item.tax_rate) / 100);
            subtotal += lineTotal;
            taxTotal += tax;
            console.log(`Item ${index + 1}: qty=${item.quantity}, price=${item.unit_price}, tax=${item.tax_rate}%, lineTotal=${lineTotal}, tax=${tax}`);
          });

          updateData.subtotal = subtotal;
          updateData.tax_total = taxTotal;
          updateData.total = subtotal + taxTotal;
          
          console.log('Recalculated totals:', {
            subtotal,
            taxTotal,
            total: updateData.total
          });
        }

        // Remove items from updateData (they're handled separately above)
        delete updateData.items;
        
        console.log('Final updateData before database update (items removed):', JSON.stringify(updateData, null, 2));
        console.log('Updating invoice in database...');

        const updatedInvoice = await prisma.invoice.update({
          where: { id },
          data: updateData,
          include: {
            user: true,
            client: true,
            items: true,
          },
        });

        console.log('=== Backend updateInvoice: SUCCESS ===');
        console.log('Updated invoice:', {
          id: updatedInvoice.id,
          invoice_number: updatedInvoice.invoice_number,
          status: updatedInvoice.status,
          issue_date: updatedInvoice.issue_date,
          due_date: updatedInvoice.due_date,
          total: updatedInvoice.total,
          subtotal: updatedInvoice.subtotal,
          tax_total: updatedInvoice.tax_total,
          created_at: updatedInvoice.created_at
        });
        console.log('Updated invoice (full object):', JSON.stringify(updatedInvoice, null, 2));
        console.log('=== Backend updateInvoice: END ===');

        return updatedInvoice;
      },
      deleteInvoice: async (_, { id }, { prisma }: GraphQLContext) => {
        await prisma.invoice.delete({
          where: { id },
        });
        return true;
      },

      // Invoice Item mutations
      createInvoiceItem: async (_, { invoice_id, input }, { prisma }: GraphQLContext) => {
        const lineTotal = Number(input.quantity) * Number(input.unit_price);
        const tax = lineTotal * (Number(input.tax_rate) / 100);
        
        const item = await prisma.invoiceItem.create({
          data: {
            invoice_id,
            ...input,
            line_total: lineTotal + tax,
          },
          include: { invoice: true },
        });

        // Update invoice totals
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoice_id },
          include: { items: true },
        });

        if (invoice) {
          let subtotal = 0;
          let taxTotal = 0;
          
          invoice.items.forEach((invItem) => {
            const itemLineTotal = Number(invItem.quantity) * Number(invItem.unit_price);
            const itemTax = itemLineTotal * (Number(invItem.tax_rate) / 100);
            subtotal += itemLineTotal;
            taxTotal += itemTax;
          });

          await prisma.invoice.update({
            where: { id: invoice_id },
            data: {
              subtotal: subtotal,
              tax_total: taxTotal,
              total: subtotal + taxTotal,
            },
          });
        }

        return item;
      },
      updateInvoiceItem: async (_, { id, input }, { prisma }: GraphQLContext) => {
        const item = await prisma.invoiceItem.findUnique({
          where: { id },
        });

        if (!item) {
          throw new Error('Invoice item not found');
        }

        const updateData: any = { ...input };
        
        // Recalculate line_total if price/quantity/tax changed
        const quantity = input.quantity !== undefined ? input.quantity : Number(item.quantity);
        const unitPrice = input.unit_price !== undefined ? input.unit_price : Number(item.unit_price);
        const taxRate = input.tax_rate !== undefined ? input.tax_rate : Number(item.tax_rate);
        
        const lineTotal = Number(quantity) * Number(unitPrice);
        const tax = lineTotal * (Number(taxRate) / 100);
        updateData.line_total = lineTotal + tax;

        const updatedItem = await prisma.invoiceItem.update({
          where: { id },
          data: updateData,
          include: { invoice: true },
        });

        // Update invoice totals
        const invoice = await prisma.invoice.findUnique({
          where: { id: item.invoice_id },
          include: { items: true },
        });

        if (invoice) {
          let subtotal = 0;
          let taxTotal = 0;
          
          invoice.items.forEach((invItem) => {
            const itemLineTotal = Number(invItem.quantity) * Number(invItem.unit_price);
            const itemTax = itemLineTotal * (Number(invItem.tax_rate) / 100);
            subtotal += itemLineTotal;
            taxTotal += itemTax;
          });

          await prisma.invoice.update({
            where: { id: item.invoice_id },
            data: {
              subtotal: subtotal,
              tax_total: taxTotal,
              total: subtotal + taxTotal,
            },
          });
        }

        return updatedItem;
      },
      deleteInvoiceItem: async (_, { id }, { prisma }: GraphQLContext) => {
        const item = await prisma.invoiceItem.findUnique({
          where: { id },
        });

        if (!item) {
          throw new Error('Invoice item not found');
        }

        const invoiceId = item.invoice_id;

        await prisma.invoiceItem.delete({
          where: { id },
        });

        // Update invoice totals
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { items: true },
        });

        if (invoice) {
          let subtotal = 0;
          let taxTotal = 0;
          
          invoice.items.forEach((invItem) => {
            const itemLineTotal = Number(invItem.quantity) * Number(invItem.unit_price);
            const itemTax = itemLineTotal * (Number(invItem.tax_rate) / 100);
            subtotal += itemLineTotal;
            taxTotal += itemTax;
          });

          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              subtotal: subtotal,
              tax_total: taxTotal,
              total: subtotal + taxTotal,
            },
          });
        }

        return true;
      },
    },
};

export const schema = createSchema({
  typeDefs: [invoicingTypeDefs, workforceTypeDefs],
  resolvers: [invoicingResolvers, workforceResolvers],
});
