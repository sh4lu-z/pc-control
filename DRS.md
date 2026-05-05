# 📄 Sh4lu Z - PC Controller

**Design & Requirement Specification (DRS)**  
**Version:** 1.0.0  
**Platform:** PC (Windows/Linux) & Mobile (Android APK)  

---

## 1. ව්‍යාපෘති හැඳින්වීම (Project Overview)

මේ ව්‍යාපෘතියේ අරමුණ වන්නේ Local Area Network (Wi-Fi) හරහා කිසිදු ප්‍රමාදයකින් තොරව (Zero-latency), පරිගණකය සම්පූර්ණයෙන්ම පාලනය කළ හැකි **Professional Mobile Application** එකක් සහ **PC Background Service** එකක් නිර්මාණය කිරීමයි. IP ලිපින ටයිප් කිරීමකින් තොරව ස්වයංක්‍රීයව පරිගණකය සොයාගැනීම (Auto-discovery) මෙහි සුවිශේෂීත්වයයි.

---

## 2. පද්ධති ගෘහනිර්මාණ ශිල්පය (System Architecture)

මෙම පද්ධතිය ප්‍රධාන කොටස් 3කින් සමන්විත වේ:

*   **The Brain (PC Backend):** Node.js වලින් ලියන ලද, PC එක On වෙද්දිම ස්වයංක්‍රීයව Background එකේ (Daemon එකක් ලෙස) Run වෙන සර්වර් එක.
*   **The Controller (Mobile Frontend):** React Native වලින් හදන ලද, පරිශීලකයාගේ දුරකථනයේ ස්ථාපනය කරන (Install කරන) Android APK එක.
*   **Communication Layer (සම්බන්ධතා මාධ්‍යය):**
    *   `mDNS` - පරිගණකය සොයාගැනීමට
    *   `WebSockets` - Real-time දත්ත හුවමාරුවට
    *   `Magic Packets / Wake-on-LAN` - PC එක On කිරීමට

---

## 3. ප්‍රධාන පහසුකම් (Key Features)

### ⚡ Power Management (බල පාලනය)
*   **Wake-on-LAN (WoL):** PC එක Off වී ඇති විට, App එකේ එක් බොත්තමක් එබීමෙන් PC එක On කිරීම.
*   **Shutdown / Restart / Sleep / Lock:** PC එක සම්පූර්ණයෙන්ම පාලනය කිරීම.

### 🎵 Media & Volume Control (මාධ්‍ය පාලනය)
*   **Master Volume Slider:** දුරකථනයෙන් සෘජුවම PC එකේ ශබ්දය අඩු/වැඩි කිරීම (Real-time).
*   **Mute Button:** එකවර ශබ්දය බින්දුවට දැමීම.
*   **Media Controls:** සින්දු හෝ වීඩියෝ Play/Pause කිරීම සහ Next/Previous කිරීම.

### 📊 Live Dashboard (තත්ත්ව දර්ශකය)
*   **CPU & RAM Usage:** PC එකේ තත්වය දුරකථන තිරය මත සජීවීව බලාගැනීම.
*   **Battery Status (ලැප්ටොප් සඳහා):** බැටරි ප්‍රතිශතය පෙන්වීම.

### 🚀 Custom App Launcher (ක්ෂණික යෙදුම්)
*   නිතර භාවිතා කරන මෘදුකාංග (VS Code, Chrome, Terminal වැනි) දුරකථනයෙන් එක Click එකකින් PC එකේ Open කිරීම.

### 🖱️ Remote Trackpad (Optional Feature)
*   දුරකථනයේ තිරය Mouse Pad එකක් ලෙස භාවිතා කරමින් PC එකේ Cursor එක හැසිරවීම සහ Click කිරීම.

---

## 4. සම්බන්ධතාවය සහ ආරක්ෂාව (Connectivity & Security)

මෙහිදී IP ලිපින Type කිරීමක් හෝ අනවශ්‍ය සැකසුම් නොමැත. ක්‍රියාවලිය සිදුවන්නේ මෙසේය:

#### අදියර 1: Auto Discovery (ස්වයංක්‍රීයව සොයාගැනීම)
1. PC එකේ Run වෙන සර්වර් එකෙන් Wi-Fi Network එකට mDNS (Multicast DNS) සිග්නල් එකක් නිකුත් කරයි.
2. Phone App එක Open කළ විට, එම සිග්නල් එක ග්‍රහණය කරගෙන ස්වයංක්‍රීයව PC එකේ IP එක සහ Port එක සොයාගනී.

#### අදියර 2: Secure Pairing (ආරක්ෂිතව සම්බන්ධ වීම - PIN Authentication)
වෙනත් අයෙකුට Wi-Fi එකට සම්බන්ධ වී PC එක පාලනය කිරීම වැළැක්වීම සඳහා PIN පද්ධතියක් යොදා ගැනේ.
1. පළමු වරට Phone එක PC එකට කනෙක්ට් වෙන්න හදද්දී, PC එකේ තිරය මත අහඹු ඉලක්කම් 4ක PIN එකක් (උදා: `4829`) දර්ශනය වේ (Pop-up එකකින්).
2. එම PIN එක Phone App එකේ ඇතුලත් කළ යුතුයි.
3. PIN එක නිවැරදි නම්, PC එක මගින් Phone එකට **Secure Token** එකක් ලබා දෙයි.
4. ඉන්පසුව සෑම විටම Phone එක PC එකට කනෙක්ට් වන්නේ එම Token එක හරහාය. (නැවත නැවත PIN ගහන්න ඕනේ නෑ).

#### අදියර 3: WebSockets Communication
සම්බන්ධතාවය තහවුරු වූ පසු, දෙපාර්ශවය අතර **WebSocket** කනෙක්ෂන් එකක් හැදේ. මේ නිසා Volume Slider එක අදින විට කිසිදු ප්‍රමාදයක් (0ms delay) නොමැතිව PC එකේ ශබ්දය වෙනස් වේ.

---

## 5. තාක්ෂණික තේරීම (Tech Stack)

*   **Backend (PC Server):** `Node.js`
    *   **Packages:** `ws` (WebSockets), `bonjour` (mDNS), `loudness` (Volume), `systeminformation` (Live Stats).
*   **Frontend (Mobile App):** `React Native (Expo)`
    *   **UI/UX:** Minimalist Dark Theme (Black, Dark Gray, Neon Accents).
*   **Scripting / Build:** 
    *   Batch (`.bat`) scripts for Windows Auto-start.
    *   Expo EAS for APK build.

---

## 6. සංවර්ධන සැලැස්ම (Development Roadmap)

### 🟢 Phase 1: PC Core Server (දින 1-2)
- [ ] `Node.js` සර්වර් එක සෑදීම.
- [ ] System Commands (Volume/Power) සහ mDNS Discovery කේත කිරීම.

### 🟢 Phase 2: Mobile UI & Connectivity (දින 2-3)
- [ ] React Native හරහා Dark Theme UI එක ඩිසයින් කිරීම.
- [ ] Phone එකෙන් ස්වයංක්‍රීයව PC එක සොයාගන්නා (Network Scanner) කොටස හැදීම.

### 🟢 Phase 3: Security & Real-time Sync (දින 1-2)
- [ ] PIN පද්ධතිය (Pairing Mechanism) එකතු කිරීම.
- [ ] WebSocket හරහා Volume සහ Live CPU stats සම්බන්ධ කිරීම.

### 🟢 Phase 4: Wake-on-LAN & Auto-Start (දින 1)
- [ ] PC එක Off වෙලා තියෙද්දි On කිරීමේ කේත සහ BIOS සැකසුම් පරීක්ෂා කිරීම.
- [ ] PC එක On වෙද්දිම Server එක Auto රන් වීමට Windows Service/Startup සැකසීම.

### 🟢 Phase 5: Build, Test & Release (දින 1-2)
*   **පද්ධතිය පරීක්ෂා කිරීම (Comprehensive Testing):**
    - [ ] විවිධ Wi-Fi රවුටර (Routers/Hotspots) හරහා mDNS Auto-discovery නිවැරදිව ක්‍රියාත්මක වේදැයි බැලීම.
    - [ ] App එක Background එකට ගොස් නැවත පැමිණෙන විට Connection එක Drop නොවී තිබේදැයි පරීක්ෂා කිරීම.
    - [ ] Volume Control සහ සෙසු පහසුකම් වල ප්‍රමාදයක් (Latency) ඇත්දැයි බැලීම (Stress test).
    - [ ] වැරදි PIN ඇතුළත් කළ විට පද්ධතිය ප්‍රතික්ෂේප කරන බව සහ නිවැරදි Token එක සුරැකිව ඇති බව තහවුරු කිරීම.

*   **Android `.apk` ගොනුව නිර්මාණය කිරීම (EAS Build):**
    - [ ] Expo ව්‍යාපෘතියේ `app.json` ගොනුව තුළ App එකේ නම (`"Sh4lu Z Controller"`), අයිකනය (App Icon), Splash Screen එක සහ වර්ෂන් එක සැකසීම.
    - [ ] `eas-cli` ස්ථාපනය කර EAS (Expo Application Services) හරහා Cloud Build එකක් හෝ Local Build එකක් සිදු කිරීම.
    - [ ] Build කමාන්ඩ් එක: `eas build -p android --profile preview` යොදාගෙන අවසාන `.apk` ගොනුව ලබා ගැනීම.

*   **PC සර්වර් එක නිකුත් කිරීම (PC Release):**
    - [ ] පරිශීලකයාට `Node.js` ස්ථාපනය නොකර කෙලින්ම Run කළ හැකි වන පරිදි, Backend කේතය `pkg` හෝ `nexe` පැකේජ මගින් තනි `.exe` (Windows) ගොනුවක් බවට පරිවර්තනය කිරීම.

*   **අවසන් පියවර:** පද්ධතියේ කිසිදු ගැටලුවක් නොමැතිව Mobile App එක සහ PC App එක සාර්ථකව සම්බන්ධ කර භාවිතයට මුදා හැරීම.