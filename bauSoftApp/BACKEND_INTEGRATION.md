# Backend Integration Setup

The app is now configured to save invoices to the GraphQL backend. Follow these steps to complete the setup:

## 1. Install Required Packages (Optional)

The API service now uses `fetch` (built into React Native) instead of `graphql-request`, so no additional packages are needed! 

If you prefer to use `graphql-request` later, you can install it:
```bash
cd /Users/ermal/Desktop/bauSoft
npm install --workspace=bausoft-app graphql-request graphql
```

## 2. Configure API URL

Create or update `bauSoftApp/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
```

For iOS Simulator, use:
```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
```

For Android Emulator, use:
```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/graphql
```

For physical devices, use your computer's local IP:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000/graphql
```

## 3. Create a Default User

**IMPORTANT:** Before creating invoices, you need at least one user in the database.

### Option 1: Use the Script (Easiest)

Run this command from the root:

```bash
npm run create-user
```

This will create a default user with ID 1, or show you existing users if any exist.

### Option 2: Via GraphQL Playground

1. Start the backend: `npm run dev:backend`
2. Open http://localhost:4000/graphql
3. Run this mutation:

```graphql
mutation {
  createUser(input: {
    name: "Your Name"
    email: "your@email.com"
    password: "password123"
    company_name: "Your Company"
  }) {
    id
    name
    email
  }
}
```

**Note:** If the user ID is not `1`, update `DEFAULT_USER_ID` in `bauSoftApp/src/services/api.ts`.

## 4. How It Works

- **Creating Invoices**: When you create an invoice in the app, it:
  1. Creates/finds the client in the backend
  2. Creates the invoice with all items
  3. Saves everything to the database

- **Loading Invoices**: On app start, invoices are loaded from the backend

- **Updates/Deletes**: All operations sync with the backend

## 5. Troubleshooting

**Error: "Cannot find module 'graphql-request'"**
- Run: `npm install --workspace=bausoft-app graphql-request graphql`

**Error: "Network request failed"**
- Make sure backend is running: `npm run dev:backend`
- Check API URL in `.env` matches your setup
- For physical devices, ensure phone and computer are on same network

**Invoices not appearing**
- Check backend logs for errors
- Verify user exists in database (see step 3)
- Check GraphQL Playground: http://localhost:4000/graphql

**"Cannot update invoice with temporary ID"**
- This happens if you try to update an invoice before it's saved to backend
- Refresh the app to reload invoices from backend

## 6. Next Steps

- Implement user authentication (replace `DEFAULT_USER_ID`)
- Add error handling UI
- Implement offline support with sync
- Add loading indicators
