import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { schema } from './schema';
import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';

// Prisma client setup with SSL configuration for Supabase
// Import pg from the adapter's dependency
const pg = require('pg');
const { Pool } = pg;

// Create a pg Pool with SSL configuration for Supabase's self-signed certificates
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// GraphQL Yoga server setup
const yoga = createYoga({
  schema,
  // Enable CORS so frontend can access it
  cors: {
    origin: 'http://localhost:5173', // frontend dev server
    credentials: true,
  },
  context: () => ({ prisma }),
});

const server = createServer(yoga);

server.listen(4000, async () => {
  console.log('Connected to the database successfully.');
  // const users = await prisma.user.findMany();
  console.log('Prisma Client is ready to use. - test');

  console.info('Server is running on http://localhost:4000/graphql');
});
