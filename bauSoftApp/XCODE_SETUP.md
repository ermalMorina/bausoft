# Running in Xcode - Setup Instructions

To run your Expo React Native app in Xcode, you need to generate the native iOS project first.

## Step 1: Generate iOS Project

When you have network connectivity, run:

```bash
cd bauSoftApp
npx expo prebuild --platform ios
```

This will create the `ios/` folder with all necessary Xcode project files.

## Step 2: Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

## Step 3: Open in Xcode

Open the workspace (not the .xcodeproj):

```bash
open ios/bauSoftApp.xcworkspace
```

Or manually:
- Open Xcode
- File → Open
- Navigate to `bauSoftApp/ios/bauSoftApp.xcworkspace`
- Click Open

## Step 4: Run in Xcode

1. Select a simulator or connected device from the device dropdown
2. Click the Play button (▶️) or press `Cmd + R`

## Alternative: Quick Run from Terminal

You can also run directly from terminal (after prebuild):

```bash
npx expo run:ios
```

This will automatically build and launch in the iOS simulator.

## Troubleshooting

If you encounter issues:
- Make sure CocoaPods is installed: `sudo gem install cocoapods`
- Clean build folder in Xcode: Product → Clean Build Folder (Shift + Cmd + K)
- Delete `ios/` folder and run `npx expo prebuild --platform ios` again
