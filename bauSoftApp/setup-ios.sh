#!/bin/bash

# Script to set up iOS project for Expo
echo "Setting up iOS project for Expo..."

# Remove existing iOS folder if it exists
rm -rf ios

# Generate iOS project
npx expo prebuild --platform ios

# Install CocoaPods dependencies
cd ios
pod install
cd ..

echo "iOS project setup complete!"
echo "You can now open the project in Xcode:"
echo "  open ios/bauSoftApp.xcworkspace"
