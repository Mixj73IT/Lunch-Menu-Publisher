# Packaging Instructions

This guide explains how to package the Lunch Menu Publisher as a native Windows application (.exe) for easy distribution to the cafeteria manager.

## Prerequisites (Install Once)

### 1. Install Rust
```powershell
# In PowerShell (as Administrator):
winget install Rustlang.Rustup
# Or download from: https://rustup.rs/
```

Then restart your terminal and run:
```bash
rustup default stable
```

### 2. Install Node.js (if not installed)
```powershell
winget install OpenJS.NodeJS
```

### 3. Install Tauri CLI
```bash
cd "c:\Users\Jr\Projects\Lunch Program"
npm install
```

## Build the Application

### Development Mode (test quickly)
```bash
npm run tauri dev
```

### Production Build (creates installer)
```bash
npm run tauri build
```

## Output Location

After building, the Windows installer will be at:
```
src-tauri\target\release\bundle\msi\
Lunch Menu Publisher_1.0.0_x64_en-US.msi
```

This is a standard Windows installer. Double-click to install.

## What the Cafeteria Manager Gets

After installation, they will have:
- A desktop shortcut: "Lunch Menu Publisher"
- A Start Menu entry
- The app opens in its own window (no browser needed)
- All data saves automatically to their computer
- Print to PDF works exactly like in the browser

## Distribution

Just send them the `.msi` file. They:
1. Double-click the `.msi`
2. Click "Next" through the installer
3. Find "Lunch Menu Publisher" on their desktop

## Updating

If you make changes:
1. Update the version in `package.json` and `src-tauri/Cargo.toml`
2. Run `npm run tauri build` again
3. Send the new `.msi` file

The installer will upgrade their existing installation.
