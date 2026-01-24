import { createSchema } from "graphql-yoga";

import { YogaInitialContext } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';

// Extend the Yoga context to include the prisma client
export interface GraphQLContext extends YogaInitialContext {
  prisma: PrismaClient;
}

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
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

    type Query {
      users: [User!]!
      user(id: Int!): User
      clients(userId: Int): [Client!]!
      client(id: Int!): Client
      invoices(userId: Int, clientId: Int): [Invoice!]!
      invoice(id: Int!): Invoice
    }
  `,
  resolvers: {
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
    },
  },
});
