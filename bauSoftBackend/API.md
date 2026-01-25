# GraphQL API Documentation

The backend provides a GraphQL API at `http://localhost:4000/graphql`

## Available Operations

### Queries (Read Operations)

#### Users
```graphql
# Get all users
query {
  users {
    id
    name
    email
    company_name
    clients {
      id
      name
    }
  }
}

# Get a single user
query {
  user(id: 1) {
    id
    name
    email
    company_name
    company_address
    vat_number
    clients {
      id
      name
      email
    }
    invoices {
      id
      invoice_number
      total
    }
  }
}
```

#### Clients
```graphql
# Get all clients for a user
query {
  clients(userId: 1) {
    id
    name
    address
    email
    phone
    user {
      name
      email
    }
    invoices {
      id
      invoice_number
      total
    }
  }
}

# Get a single client
query {
  client(id: 1) {
    id
    name
    address
    email
    phone
    user {
      id
      name
    }
  }
}
```

#### Invoices
```graphql
# Get all invoices for a user
query {
  invoices(userId: 1) {
    id
    invoice_number
    issue_date
    due_date
    status
    subtotal
    tax_total
    total
    client {
      id
      name
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

# Get invoices for a specific client
query {
  invoices(clientId: 1) {
    id
    invoice_number
    total
    status
  }
}

# Get a single invoice with all details
query {
  invoice(id: 1) {
    id
    invoice_number
    issue_date
    due_date
    status
    subtotal
    tax_total
    total
    user {
      id
      name
      company_name
    }
    client {
      id
      name
      address
      email
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
```

#### Invoice Items
```graphql
# Get all items for an invoice
query {
  invoiceItems(invoiceId: 1) {
    id
    description
    quantity
    unit_price
    tax_rate
    line_total
  }
}
```

### Mutations (Write Operations)

#### User Mutations
```graphql
# Create a new user
mutation {
  createUser(input: {
    name: "John Doe"
    email: "john@example.com"
    password: "securepassword"
    company_name: "John's Company"
    company_address: "123 Main St"
    vat_number: "VAT123456"
  }) {
    id
    name
    email
  }
}

# Update a user
mutation {
  updateUser(id: 1, input: {
    name: "John Smith"
    company_name: "Smith & Co"
  }) {
    id
    name
    company_name
  }
}

# Delete a user
mutation {
  deleteUser(id: 1)
}
```

#### Client Mutations
```graphql
# Create a new client
mutation {
  createClient(input: {
    user_id: 1
    name: "Acme Corp"
    address: "456 Business Ave"
    email: "contact@acme.com"
    phone: "+1234567890"
  }) {
    id
    name
    email
  }
}

# Update a client
mutation {
  updateClient(id: 1, input: {
    name: "Acme Corporation"
    phone: "+1234567891"
  }) {
    id
    name
    phone
  }
}

# Delete a client
mutation {
  deleteClient(id: 1)
}
```

#### Invoice Mutations
```graphql
# Create a new invoice with items
mutation {
  createInvoice(input: {
    user_id: 1
    client_id: 1
    invoice_number: "INV-2024-001"
    issue_date: "2024-01-15T00:00:00Z"
    due_date: "2024-02-15T00:00:00Z"
    status: "draft"
    items: [
      {
        description: "Web Development Services"
        quantity: 10
        unit_price: 150.00
        tax_rate: 20
      }
      {
        description: "Consulting Hours"
        quantity: 5
        unit_price: 100.00
        tax_rate: 20
      }
    ]
  }) {
    id
    invoice_number
    subtotal
    tax_total
    total
    items {
      id
      description
      line_total
    }
  }
}

# Update an invoice
mutation {
  updateInvoice(id: 1, input: {
    status: "sent"
    due_date: "2024-03-15T00:00:00Z"
  }) {
    id
    status
    due_date
  }
}

# Delete an invoice
mutation {
  deleteInvoice(id: 1)
}
```

#### Invoice Item Mutations
```graphql
# Add an item to an existing invoice
mutation {
  createInvoiceItem(invoice_id: 1, input: {
    description: "Additional Services"
    quantity: 2
    unit_price: 75.00
    tax_rate: 20
  }) {
    id
    description
    line_total
  }
}

# Update an invoice item
mutation {
  updateInvoiceItem(id: 1, input: {
    quantity: 3
    unit_price: 80.00
  }) {
    id
    quantity
    unit_price
    line_total
  }
}

# Delete an invoice item
mutation {
  deleteInvoiceItem(id: 1)
}
```

## Testing with GraphQL Playground

1. Start the backend server:
   ```bash
   npm run dev:backend
   ```

2. Open your browser and navigate to: `http://localhost:4000/graphql`

3. You'll see the GraphQL Playground where you can:
   - Explore the schema
   - Test queries and mutations
   - See auto-completion

## Example: Complete Invoice Creation Flow

```graphql
# 1. Create a user
mutation {
  createUser(input: {
    name: "Jane Doe"
    email: "jane@example.com"
    password: "password123"
    company_name: "Jane's Business"
  }) {
    id
  }
}

# 2. Create a client for that user
mutation {
  createClient(input: {
    user_id: 1
    name: "Client Company"
    email: "client@example.com"
  }) {
    id
  }
}

# 3. Create an invoice with items
mutation {
  createInvoice(input: {
    user_id: 1
    client_id: 1
    invoice_number: "INV-001"
    issue_date: "2024-01-24T00:00:00Z"
    due_date: "2024-02-24T00:00:00Z"
    status: "draft"
    items: [
      {
        description: "Service 1"
        quantity: 1
        unit_price: 100
        tax_rate: 20
      }
    ]
  }) {
    id
    invoice_number
    total
  }
}
```

## Notes

- All dates should be in ISO 8601 format (e.g., `"2024-01-24T00:00:00Z"`)
- Invoice totals (subtotal, tax_total, total) are automatically calculated when creating/updating invoices or items
- Deleting a user will cascade delete their clients and invoices
- Deleting a client will cascade delete their invoices
- Deleting an invoice will cascade delete its items
- Tax rates are percentages (e.g., 20 = 20%)
