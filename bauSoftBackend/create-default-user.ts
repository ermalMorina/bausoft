import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createDefaultUser() {
  try {
    // Check if user with id 1 exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 1 },
    });

    if (existingUser) {
      console.log('User with id 1 already exists:');
      console.log(`  Name: ${existingUser.name}`);
      console.log(`  Email: ${existingUser.email}`);
      return;
    }

    // Check if any user exists
    const users = await prisma.user.findMany();
    if (users.length > 0) {
      console.log(`Found ${users.length} user(s) in database:`);
      users.forEach((user) => {
        console.log(`  ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
      });
      console.log('\nTo use a different user, update DEFAULT_USER_ID in bauSoftApp/src/services/api.ts');
      return;
    }

    // Create default user
    const newUser = await prisma.user.create({
      data: {
        name: 'Default User',
        email: 'user@example.com',
        password: 'changeme', // In production, hash this!
        company_name: 'Your Company',
        company_address: 'Your Address',
      },
    });

    console.log('✅ Default user created successfully!');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Name: ${newUser.name}`);
    console.log(`  Email: ${newUser.email}`);
    console.log('\n⚠️  Remember to change the password in production!');
  } catch (error) {
    console.error('Error creating default user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createDefaultUser();
