# bauSoft Monorepo Guide

This project is managed as a monorepo using **npm workspaces**. This allows us to manage both the React Native app and the backend in a single repository with shared dependencies and streamlined workflows.

## 📁 Project Structure

```
bauSoft/
├── bauSoftApp/          # React Native/Expo mobile app
├── bauSoftBackend/      # Backend API (Prisma + GraphQL)
└── package.json         # Root package.json with workspace configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)

No additional package managers needed! npm workspaces are built-in.

### Initial Setup

1. **Install all dependencies** (from root):
   ```bash
   npm install
   ```
   This will install dependencies for all workspaces.

2. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

3. **Run database migrations**:
   ```bash
   npm run prisma:migrate
   ```

## 📜 Available Scripts

### Root Level (Run from `/bauSoft`)

- `npm run dev:app` - Run only the React Native app (run in separate terminal)
- `npm run dev:backend` - Run only the backend server (run in separate terminal)
  
**Note:** Run `dev:app` and `dev:backend` in separate terminals to avoid file watcher limits.
- `npm run build` - Build the backend
- `npm run build:app` - Build the app
- `npm run clean` - Remove all node_modules, dist, and .expo folders
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

### App Workspace (`bauSoftApp/`)

- `npm run dev` or `npm start` - Start Expo dev server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser

### Backend Workspace (`bauSoftBackend/`)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production build

## 🔧 Working with Workspaces

### Installing Dependencies

**Add to a specific workspace:**
```bash
# Add to app
npm install <package-name> --workspace=bausoft-app

# Add to backend
npm install <package-name> --workspace=bausoft-backend

# Add as dev dependency
npm install -D <package-name> --workspace=bausoft-backend
```

**Add to root (shared dev dependencies):**
```bash
npm install -D -w <package-name>
```

### Running Commands in Workspaces


```bash
# Run script in specific workspace
npm run <script-name> --workspace=bausoft-app
npm run <script-name> --workspace=bausoft-backend

# Run script in all workspaces
npm run <script-name> --workspaces
```

## 🎯 Benefits of This Monorepo Setup

1. **Shared Dependencies**: Common packages (like TypeScript) are hoisted to the root, reducing duplication
2. **Atomic Commits**: Changes to app and backend can be committed together
3. **Type Safety**: Easy to share TypeScript types between frontend and backend
4. **Simplified CI/CD**: Single repository to build and deploy
5. **Better Developer Experience**: One command to run everything
6. **No Extra Tooling**: Uses built-in npm workspaces - no need to install pnpm, yarn, etc.

## 📦 Dependency Management

- Dependencies are installed in a shared `node_modules` at the root
- Each workspace can have its own dependencies
- npm uses symlinks to manage workspace dependencies
- Use `package-lock.json` (auto-generated) for consistent installs

## 🔐 Environment Variables

This monorepo uses **separate `.env` files** for each workspace:

- `bauSoftBackend/.env` - Backend environment variables (DATABASE_URL, etc.)
- `bauSoftApp/.env` - App environment variables (API_URL, feature flags, etc.)

### Why Separate Files?

1. **Security**: Each workspace only has access to the secrets it needs
2. **Separation**: Backend and app have different configuration needs
3. **Flexibility**: Easy to manage different environments per workspace
4. **Independence**: Each workspace can run independently

### Setup

1. **Backend** - Copy `.env.example` (if exists) or create `bauSoftBackend/.env`:
   ```bash
   DATABASE_URL="postgresql://..."
   ```

2. **App** - Create `bauSoftApp/.env`:
   ```bash
   API_URL=http://localhost:4000/graphql
   NODE_ENV=development
   ```

**Note**: All `.env` files are gitignored. Never commit secrets to version control.

## 🔄 Migration Notes

If you were previously using separate repositories or different package managers:

1. Remove old lock files (if switching from yarn):
   ```bash
   rm -rf yarn.lock
   ```

2. Clean install:
   ```bash
   npm run clean
   npm install
   ```

## 🚨 Troubleshooting

**Issue: "Cannot find module" errors**
- Run `npm install` from the root
- Make sure you're running commands from the root directory

**Issue: Prisma client not found**
- Run `npm run prisma:generate` from root

**Issue: Workspace not found**
- Check `package.json` has the correct workspace paths
- Verify package.json names match the workspace names

**Issue: Scripts not working**
- Make sure you're using `npm run <script>` not just `npm <script>`
- Check that the script exists in the workspace's package.json

**Issue: "EMFILE: too many open files" error**
This is common in monorepos on macOS due to file watcher limits. Solutions:

1. **Run app and backend in separate terminals** (recommended):
   ```bash
   # Terminal 1
   npm run dev:backend
   
   # Terminal 2
   npm run dev:app
   ```

2. **Increase file watcher limit** (macOS):
   ```bash
   # Check current limit
   ulimit -n
   
   # Temporarily increase (for current session)
   ulimit -n 10240
   
   # Or add to ~/.zshrc for permanent fix:
   echo "ulimit -n 10240" >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Configure Metro to watch fewer directories** by creating `metro.config.js` in `bauSoftApp/`:
   ```js
   const { getDefaultConfig } = require('expo/metro-config');
   const config = getDefaultConfig(__dirname);
   
   config.watchFolders = [__dirname]; // Only watch app directory
   config.resolver.blockList = [/.*\/node_modules\/.*\/node_modules\/react-native\/.*/];
   
   module.exports = config;
   ```

## 📚 Additional Resources

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [npm CLI Reference](https://docs.npmjs.com/cli/v9)
