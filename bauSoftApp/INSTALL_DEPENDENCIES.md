# Installing Missing Dependencies

The invoice feature requires additional packages for PDF generation and email functionality. Due to network connectivity issues, these haven't been installed yet.

## Required Packages

When you have network access, install these packages:

```bash
cd bauSoftApp
npx expo install expo-print expo-file-system expo-sharing expo-mail-composer
```

Or using npm directly:

```bash
npm install expo-print expo-file-system expo-sharing expo-mail-composer
```

## Current Status

✅ **Core Invoice Features** - Working without dependencies
- Create/Edit invoices
- View invoice list
- Auto-calculations
- Status management
- Duplicate invoices

⚠️ **PDF & Email Features** - Require installation
- PDF generation (requires expo-print, expo-sharing)
- Email sending (requires expo-mail-composer)

The app will run fine without these packages - the PDF and Email buttons will show a helpful message if the packages aren't installed.

## After Installation

Once you install the packages:
1. Restart Metro bundler (`npm start`)
2. Rebuild the app if needed
3. PDF and Email features will be fully functional
