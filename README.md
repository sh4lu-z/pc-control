# Sh4lu Z Hub - PC Remote Controller 🚀

A powerful and minimalist Remote PC Controller system that allows you to monitor and control your Windows PC from a mobile device (Android/iOS) over a local network.

## ✨ Features

- **Live System Monitoring:** Real-time CPU Load and RAM Usage tracking.
- **Media Controls:** Play, Pause, Next, and Previous track controls.
- **Master Audio Control:** Adjust system volume and toggle mute.
- **Quick App Launchers:** Open common apps like Chrome, VS Code, Terminal, Notepad, and more with one tap.
- **System Power Commands:** Remote Shutdown, Restart, Sleep, and Lock PC.
- **Security:** Requires physical PC approval before pairing new devices.
- **Auto Discovery:** Uses mDNS (Bonjour) for easy connection without typing IP addresses.

## 🛠️ Project Structure

- `/server`: Node.js WebSocket backend (runs on PC).
- `/app`: React Native (Expo) mobile application (runs on Phone).

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your PC.
- [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) app installed on your phone.

### 2. Setup PC Server
1. Navigate to the `server` folder.
2. Run `npm install`.
3. Run `node index.js` (or use the provided `Start_PC_Server.bat`).

### 3. Setup Mobile App
1. Navigate to the `app` folder.
2. Run `npm install`.
3. Run `npx expo start` (or use `Start_Mobile_App.bat`).
4. Scan the QR code using the Expo Go app.

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Developer
Developed by **Shaluka Gimhan (sh4lu-z)**.

Total Lines of Code: **10922** <!-- LOC -->
