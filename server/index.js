const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec, execSync } = require('child_process');
const Bonjour = require('bonjour-service').default;
const loudness = require('loudness');
const si = require('systeminformation');

const PORT = 8080;
const TOKENS_FILE = path.join(__dirname, 'tokens.json');

let validTokens = [];
if (fs.existsSync(TOKENS_FILE)) {
    try { validTokens = JSON.parse(fs.readFileSync(TOKENS_FILE)); } catch(e){}
}

function askUserPrompt(deviceName) {
    if (os.platform() !== 'win32') return true; 
    const vbsPath = path.join(__dirname, 'temp_prompt.vbs');
    const safeName = deviceName ? deviceName.replace(/"/g, ' ') : 'Phone';
    const vbsCode = `
Dim objArgs, device, result
Set objArgs = WScript.Arguments
device = objArgs(0)
result = MsgBox("A mobile device named '" & device & "' is attempting to connect and control this PC. Allow?", 4 + 32 + 256, "Sh4lu Z Security Notification")
WScript.Echo result
`;
    fs.writeFileSync(vbsPath, vbsCode);
    try {
        const out = execSync(`cscript //nologo "${vbsPath}" "${safeName}"`, { encoding: 'utf-8' });
        fs.unlinkSync(vbsPath);
        return out.trim() === '6'; // 1st option = Yes
    } catch(e) {
        if(fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
        return false;
    }
}

// Initialize Bonjour
const bonjour = new Bonjour();
bonjour.publish({ name: 'Sh4lu_Z_PC', type: 'sh4lu', port: PORT, protocol: 'tcp' });

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
// Lightweight API specifically for Fast Network Scanning
app.get('/ping', (req, res) => res.json({ status: 'ok', device: 'Sh4lu_Z_PC' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 Sh4lu Z Backend listening on port ${PORT}`);
});

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    ws.isAuthorized = (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            const { action, payload, token, name } = data;

            // 1. MsgBox Popup Pairing
            if (action === 'REQUEST_PAIR') {
                ws.send(JSON.stringify({ type: 'WAITING_FOR_PC_APPROVAL' }));
                
                const allowed = askUserPrompt(name || 'Mobile Phone');
                if (allowed) {
                    const newToken = crypto.randomBytes(16).toString('hex');
                    if (!validTokens.includes(newToken)) {
                        validTokens.push(newToken);
                        fs.writeFileSync(TOKENS_FILE, JSON.stringify(validTokens));
                    }
                    
                    const interfaces = await si.networkInterfaces();
                    const primaryInterface = interfaces.find(i => !i.internal && i.mac && i.ip4 !== '127.0.0.1');
                    const mac = primaryInterface ? primaryInterface.mac : '00:00:00:00:00:00';

                    ws.isAuthorized = true;
                    ws.send(JSON.stringify({ type: 'PAIRED', token: newToken, mac }));
                    return;
                } else {
                    ws.send(JSON.stringify({ type: 'DENIED', message: 'Connection refused by PC user' }));
                    return;
                }
            }

            // 2. Token Check
            if (!ws.isAuthorized) {
                if (token && validTokens.includes(token)) {
                    ws.isAuthorized = true;
                } else {
                    ws.send(JSON.stringify({ type: 'UNAUTHORIZED', message: 'Not paired.' }));
                    return;
                }
            }

            // --- Authorized Actions ---
            switch (action) {
                case 'GET_STATS':
                    const cpu = await si.currentLoad();
                    const mem = await si.mem();
                    ws.send(JSON.stringify({
                        type: 'STATS',
                        data: {
                            cpu: cpu.currentLoad.toFixed(2),
                            memory: ((mem.active / mem.total) * 100).toFixed(2),
                        }
                    }));
                    break;
                case 'GET_VOLUME':
                    const vol = await loudness.getVolume();
                    const muted = await loudness.getMuted();
                    ws.send(JSON.stringify({ type: 'VOLUME', data: { volume: vol, muted } }));
                    break;
                case 'SET_VOLUME':
                    if (payload && typeof payload.volume === 'number') await loudness.setVolume(payload.volume);
                    break;
                case 'SET_MUTE':
                    if (payload && typeof payload.muted === 'boolean') await loudness.setMuted(payload.muted);
                    break;
                case 'POWER_COMMAND':
                    if (payload && payload.command) handlePowerCommand(payload.command, ws);
                    break;
                case 'LAUNCH_APP':
                    if (payload && payload.appName) launchApp(payload.appName, ws);
                    break;
                case 'MEDIA_COMMAND':
                    if (payload && payload.command) handleMediaCommand(payload.command, ws);
                    break;
                case 'PING':
                    ws.send(JSON.stringify({ type: 'PONG' }));
                    break;
            }
        } catch (err) {
            console.error(err);
        }
    });
});

function handlePowerCommand(command, ws) {
    let osCommand = '';
    const platform = os.platform();
    if (platform === 'win32') {
        switch (command) {
            case 'shutdown': osCommand = 'shutdown /s /t 0'; break;
            case 'restart': osCommand = 'shutdown /r /t 0'; break;
            case 'sleep': osCommand = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0'; break; 
            case 'lock': osCommand = 'rundll32.exe user32.dll,LockWorkStation'; break;
        }
    } 
    if (osCommand) {
        ws.send(JSON.stringify({ type: 'POWER_ACK', command }));
        exec(osCommand);
    }
}

function launchApp(appName, ws) {
    let command = '';
    const platform = os.platform();
    if (platform === 'win32') {
        switch (appName) {
            case 'vscode': command = 'code'; break;
            case 'chrome': command = 'start chrome'; break;
            case 'terminal': command = 'start cmd'; break;
            case 'notepad': command = 'start notepad'; break;
            case 'calc': command = 'start calc'; break;
            case 'youtube': command = 'start https://youtube.com'; break;
            case 'netflix': command = 'start https://netflix.com'; break;
            case 'facebook': command = 'start https://facebook.com'; break;
            case 'whatsapp': command = 'start whatsapp:'; break;
        }
    }
    if (command) {
        ws.send(JSON.stringify({ type: 'LAUNCH_ACK', appName }));
        exec(command);
    }
}

function handleMediaCommand(command, ws) {
    if (os.platform() !== 'win32') return;
    let vkCode = 0;
    if (command === 'play_pause') vkCode = 179;
    else if (command === 'next') vkCode = 176;
    else if (command === 'prev') vkCode = 177;

    if (vkCode) {
        ws.send(JSON.stringify({ type: 'MEDIA_ACK', command }));
        const psScript = `Add-Type -TypeDefinition "using System.Runtime.InteropServices; public class KB { [DllImport(\\"user32.dll\\")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo); }"; [KB]::keybd_event(${vkCode}, 0, 0, 0);`;
        exec(`powershell -windowstyle hidden -command "${psScript}"`);
    }
}
