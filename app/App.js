import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Device from 'expo-device';

const THEME = {
  bg: '#0d0d12', cardBg: '#15151e', accent: '#00ffcc', danger: '#ff3366', text: '#e0e0e0', muted: '#888',
  play: '#E1AFD1', link: '#3b82f6', success: '#22c55e'
};

export default function App() {
  const [ip, setIp] = useState('');
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState(null);
  const [mac, setMac] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pairingWait, setPairingWait] = useState(false);
  const ws = useRef(null);
  const statsInterval = useRef(null);

  const [stats, setStats] = useState({ cpu: 0, memory: 0 });
  const [audio, setAudio] = useState({ volume: 50, muted: false });

  useEffect(() => {
    AsyncStorage.getItem('pc_config').then(res => {
      if (res) {
        const config = JSON.parse(res);
        if (config.token) setToken(config.token);
        if (config.mac) setMac(config.mac);
        if (config.ip) {
            setIp(config.ip);
            connectWS(config.ip, config.token);
        }
      }
    });
    return () => clearInterval(statsInterval.current);
  }, []);

  const scanNetwork = async () => {
    setIsScanning(true);
    try {
      const deviceIp = await Network.getIpAddressAsync();
      const prefix = deviceIp.substring(0, deviceIp.lastIndexOf('.'));
      
      let foundIp = null;
      let completedCount = 0;

      const fetchWithTimeout = (url, ms) => {
         return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('timeout')), ms);
            fetch(url)
              .then(res => { clearTimeout(timer); resolve(res); })
              .catch(err => { clearTimeout(timer); reject(err); });
         });
      };

      const promises = [];
      for (let i = 1; i <= 254; i++) {
        const targetIp = `${prefix}.${i}`;
        const p = fetchWithTimeout(`http://${targetIp}:8080/ping`, 2500)
          .then(res => res.json())
          .then(data => { if (data.status === 'ok') foundIp = targetIp; })
          .catch(() => {})
          .finally(() => { completedCount++; });
        promises.push(p);
      }

      await Promise.all(promises);

      if (foundIp) {
        setIp(foundIp);
        connectWS(foundIp, token);
      } else {
        Alert.alert('Scan Failed', 'Could not discover the Sh4lu_Z server. Make sure the PC Controller is running and you are on the same Wi-Fi or Hotspot.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Ensure you are connected to Wi-Fi/Hotspot. ' + err.message);
    }
    setIsScanning(false);
  };

  const connectWS = (serverIp, savedToken = token) => {
    if (ws.current) ws.current.close();
    setPairingWait(false);
    
    try { ws.current = new WebSocket(`ws://${serverIp}:8080`); } catch(e) { return; }
    
    ws.current.onopen = () => {
      if (savedToken) {
        ws.current.send(JSON.stringify({ action: 'PING', token: savedToken }));
      } else {
        setPairingWait(true);
        ws.current.send(JSON.stringify({ action: 'REQUEST_PAIR', name: Device.deviceName || 'Mobile Phone' }));
      }
    };
    
    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'WAITING_FOR_PC_APPROVAL') setPairingWait(true);
      if (msg.type === 'DENIED') {
         setPairingWait(false);
         Alert.alert('Pairing Denied', 'The PC user declined the connection request.');
         ws.current.close();
      }
      if (msg.type === 'PAIRED') {
        setToken(msg.token);
        setMac(msg.mac);
        setPairingWait(false);
        setConnected(true);
        setIp(serverIp);
        AsyncStorage.setItem('pc_config', JSON.stringify({ ip: serverIp, token: msg.token, mac: msg.mac }));
        startPolling();
      }
      if (msg.type === 'UNAUTHORIZED') {
        setPairingWait(true);
        ws.current.send(JSON.stringify({ action: 'REQUEST_PAIR', name: Device.deviceName || 'Mobile Phone' }));
      }
      if (msg.type === 'PONG') { setConnected(true); setPairingWait(false); startPolling(); }
      if (msg.type === 'STATS') setStats({ cpu: msg.data.cpu, memory: msg.data.memory });
      if (msg.type === 'VOLUME') setAudio({ volume: msg.data.volume, muted: msg.data.muted });
    };

    ws.current.onclose = () => { setConnected(false); setPairingWait(false); };
    ws.current.onerror = () => { setConnected(false); setPairingWait(false); };
  };

  const startPolling = () => {
    sendWS({ action: 'GET_STATS' });
    sendWS({ action: 'GET_VOLUME' });
    if (statsInterval.current) clearInterval(statsInterval.current);
    statsInterval.current = setInterval(() => sendWS({ action: 'GET_STATS' }), 2000);
  };

  const sendWS = (data) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ ...data, token }));
    }
  };

  const wakePC = () => {
    Alert.alert('Wake-on-LAN Mode', 'Wake-on-LAN requires native UDP sockets. This feature will work correctly once we build the final Android .apk!');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Sh4lu_Z <Text style={styles.accent}>Hub</Text></Text>
      <View style={[styles.statusBadge, connected ? styles.connected : styles.disconnected]}>
        <Text style={[styles.statusText, connected ? styles.connectedTxt : styles.disconnectedTxt]}>
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </Text>
      </View>
    </View>
  );

  if (!connected) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        
        {pairingWait ? (
           <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
             <ActivityIndicator size="large" color={THEME.accent} style={{ marginBottom: 20 }} />
             <Text style={[styles.cardTitle, { color: THEME.accent, fontSize: 16 }]}>WAITING FOR PC APPROVAL</Text>
             <Text style={[styles.descText, { textAlign: 'center' }]}>Look at your PC Screen. A dialog should appear asking for permission. Click "Yes".</Text>
           </View>
        ) : (
           <View style={styles.card}>
             <Text style={styles.cardTitle}>AUTO CONNECT</Text>
             <Text style={styles.descText}>Make sure your PC and Phone are on the same Wi-Fi or Mobile Hotspot.</Text>
             <TouchableOpacity style={styles.primaryBtn} onPress={scanNetwork} disabled={isScanning}>
               <Text style={styles.btnText}>{isScanning ? 'SCANNING NETWORK...' : 'AUTO SCAN & CONNECT'}</Text>
             </TouchableOpacity>
           </View>
        )}
        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>REMOTE WAKE-ON-LAN</Text>
          <Text style={styles.descText}>Send a magic packet to turn ON the PC if it is completely asleep.</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={wakePC}>
            <Text style={styles.outlineBtnText}>SEND WAKE COMMAND</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {renderHeader()}
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>LIVE SYSTEM STATS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>CPU LOAD</Text>
            <Text style={styles.statValue}>{Math.round(stats.cpu)}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>RAM USAGE</Text>
            <Text style={styles.statValue}>{Math.round(stats.memory)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MEDIA & AUDIO CONTROLS</Text>
        
        <View style={[styles.statsGrid, { marginBottom: 15 }]}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => sendWS({ action: 'MEDIA_COMMAND', payload: { command: 'prev' }})}>
             <Text style={styles.mediaBtnText}>⏮ Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mediaBtn, { backgroundColor: THEME.play }]} onPress={() => sendWS({ action: 'MEDIA_COMMAND', payload: { command: 'play_pause' }})}>
             <Text style={[styles.mediaBtnText, { color: '#000' }]}>⏯ Play/Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => sendWS({ action: 'MEDIA_COMMAND', payload: { command: 'next' }})}>
             <Text style={styles.mediaBtnText}>Next ⏭</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.outlineBtn, { flex: 1 }, audio.muted && styles.dangerBg]} 
            onPress={() => sendWS({ action: 'SET_MUTE', payload: { muted: !audio.muted }})}
          >
            <Text style={[styles.outlineBtnText, audio.muted && { color: THEME.bg }]}>
              {audio.muted ? 'UNMUTE MASTER' : 'MUTE MASTER'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.volText}>{audio.volume}%</Text>
        </View>
        <View style={styles.volControls}>
          <TouchableOpacity style={styles.volBtn} onPress={() => sendWS({ action: 'SET_VOLUME', payload: { volume: Math.max(0, audio.volume - 10) }})}><Text style={styles.volBtnText}>- 10</Text></TouchableOpacity>
          <TouchableOpacity style={styles.volBtn} onPress={() => sendWS({ action: 'SET_VOLUME', payload: { volume: Math.min(100, audio.volume + 10) }})}><Text style={styles.volBtnText}>+ 10</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>QUICK APP LAUNCHERS</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'chrome' }})}>
            <Text style={styles.gridBtnText}>Chrome</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'vscode' }})}>
            <Text style={styles.gridBtnText}>VS Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'terminal' }})}>
            <Text style={styles.gridBtnText}>Terminal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'notepad' }})}>
            <Text style={styles.gridBtnText}>Notepad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'calc' }})}>
            <Text style={styles.gridBtnText}>Calculator</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'whatsapp' }})}>
            <Text style={[styles.gridBtnText, { color: THEME.success }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>WEB SHORTCUTS (OPENS IN BROWSER)</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.linkBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'youtube' }})}>
            <Text style={styles.linkBtnText}>YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'netflix' }})}>
            <Text style={styles.linkBtnText}>Netflix</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => sendWS({ action: 'LAUNCH_APP', payload: { appName: 'facebook' }})}>
            <Text style={styles.linkBtnText}>Facebook</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.card, { marginBottom: 50, borderColor: THEME.danger }]}>
        <Text style={styles.cardTitle}>CORE SYSTEM POWER</Text>
        <TouchableOpacity style={[styles.dangerBtn, { marginBottom: 15, borderColor: THEME.accent, backgroundColor: 'rgba(0,255,204,0.1)' }]} onPress={() => sendWS({ action: 'POWER_COMMAND', payload: { command: 'lock' }})}>
           <Text style={[styles.dangerBtnText, { color: THEME.accent, fontSize: 16 }]}>🔐 LOCK PC NOW</Text>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.dangerBtn, { marginBottom: 10 }]} onPress={() => sendWS({ action: 'POWER_COMMAND', payload: { command: 'sleep' }})}>
            <Text style={styles.dangerBtnText}>Sleep PC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, { marginBottom: 10 }]} onPress={() => sendWS({ action: 'POWER_COMMAND', payload: { command: 'restart' }})}>
            <Text style={styles.dangerBtnText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, { width: '100%', padding: 20 }]} onPress={() => sendWS({ action: 'POWER_COMMAND', payload: { command: 'shutdown' }})}>
            <Text style={styles.dangerBtnText}>FORCE SHUTDOWN ALGEBRA</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, padding: 20, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { fontSize: 24, fontWeight: '900', color: THEME.text, letterSpacing: -1 },
  accent: { color: THEME.accent },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  connected: { backgroundColor: 'rgba(0,255,204,0.1)', borderColor: THEME.accent },
  disconnected: { backgroundColor: 'rgba(255,51,102,0.1)', borderColor: THEME.danger },
  connectedTxt: { color: THEME.accent, fontSize: 10, fontWeight: 'bold' },
  disconnectedTxt: { color: THEME.danger, fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: THEME.cardBg, borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  cardTitle: { fontSize: 12, color: THEME.muted, letterSpacing: 1.5, marginBottom: 15, fontWeight: 'bold' },
  descText: { color: THEME.muted, fontSize: 13, marginBottom: 15, lineHeight: 20 },
  primaryBtn: { backgroundColor: THEME.accent, borderRadius: 8, padding: 15, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  outlineBtn: { backgroundColor: 'transparent', borderRadius: 8, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: THEME.muted },
  outlineBtnText: { color: THEME.text, fontWeight: 'bold', fontSize: 13 },
  dangerBg: { backgroundColor: THEME.text, borderColor: THEME.text },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#0d0d12', padding: 20, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statLabel: { fontSize: 10, color: THEME.muted, letterSpacing: 1, marginBottom: 5 },
  statValue: { fontSize: 28, color: THEME.text, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  volText: { fontSize: 24, fontWeight: 'bold', color: THEME.text, marginLeft: 20, width: 60, textAlign: 'right' },
  volControls: { flexDirection: 'row', gap: 15 },
  volBtn: { flex: 1, backgroundColor: '#222', padding: 15, borderRadius: 8, alignItems: 'center' },
  volBtnText: { color: THEME.text, fontSize: 20, fontWeight: 'bold' },
  mediaBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#222', alignItems: 'center' },
  mediaBtnText: { color: THEME.text, fontWeight: 'bold', fontSize: 12 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridBtn: { width: '31%', paddingVertical: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  gridBtnText: { color: '#ddd', fontWeight: 'bold', fontSize: 12 },
  linkBtn: { width: '31%', paddingVertical: 15, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(59, 130, 246, 0.05)', alignItems: 'center' },
  linkBtnText: { color: THEME.link, fontWeight: 'bold', fontSize: 12 },
  dangerBtn: { flex: 1, minWidth: '45%', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,51,102,0.3)', backgroundColor: 'rgba(255,51,102,0.05)', alignItems: 'center' },
  dangerBtnText: { color: THEME.danger, fontWeight: 'bold' },
});
