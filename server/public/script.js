class ControllerApp {
    constructor() {
        this.statusEl = document.getElementById('connectionStatus');
        this.cpuVal = document.getElementById('cpuVal');
        this.cpuProgress = document.getElementById('cpuProgress');
        this.ramVal = document.getElementById('ramVal');
        this.ramProgress = document.getElementById('ramProgress');
        
        this.volSlider = document.getElementById('volSlider');
        this.volLabel = document.getElementById('volLabel');
        this.muteBtn = document.getElementById('muteBtn');

        this.ws = null;
        this.setupWebSocket();
        this.setupListeners();
    }

    setupWebSocket() {
        const HOST = window.location.hostname || 'localhost';
        const PORT = window.location.port || 8080;
        this.ws = new WebSocket(`ws://${HOST}:${PORT}`);

        this.ws.onopen = () => {
            this.statusEl.textContent = 'CONNECTED';
            this.statusEl.className = 'status connected';
            this.fetchInitialState();
            
            // Poll stats every 2 seconds
            this.statsInterval = setInterval(() => {
                this.send({ action: 'GET_STATS' });
            }, 2000);
        };

        this.ws.onclose = () => {
            this.statusEl.textContent = 'DISCONNECTED';
            this.statusEl.className = 'status disconnected';
            clearInterval(this.statsInterval);
            // Try to reconnect
            setTimeout(() => this.setupWebSocket(), 3000);
        };

        this.ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            this.handleMessage(msg);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    fetchInitialState() {
        this.send({ action: 'GET_STATS' });
        this.send({ action: 'GET_VOLUME' });
    }

    handleMessage(msg) {
        if (msg.type === 'STATS') {
            const cpu = parseFloat(msg.data.cpu);
            const ram = parseFloat(msg.data.memory);
            
            this.cpuVal.innerText = `${Math.round(cpu)}%`;
            this.cpuProgress.style.width = `${cpu}%`;
            
            this.ramVal.innerText = `${Math.round(ram)}%`;
            this.ramProgress.style.width = `${ram}%`;
        } 
        else if (msg.type === 'VOLUME') {
            this.volSlider.value = msg.data.volume;
            this.volLabel.innerText = `${msg.data.volume}%`;
            this.muteBtn.innerText = msg.data.muted ? 'Unmute' : 'Mute';
            this.muteBtn.style.color = msg.data.muted ? 'var(--bg-color)' : '';
            this.muteBtn.style.backgroundColor = msg.data.muted ? 'var(--text-main)' : '';
        }
    }

    setupListeners() {
        this.volSlider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value);
            this.volLabel.innerText = `${vol}%`;
            this.send({ action: 'SET_VOLUME', payload: { volume: vol } });
        });

        this.muteBtn.addEventListener('click', () => {
            const isMuted = this.muteBtn.innerText === 'Unmute'; 
            this.send({ action: 'SET_MUTE', payload: { muted: !isMuted } });
            
            // Re-fetch to sync
            setTimeout(() => {
                this.send({ action: 'GET_VOLUME' }); 
            }, 100);
        });
    }

    launch(appName) {
        this.send({ action: 'LAUNCH_APP', payload: { appName } });
    }

    power(command) {
        if(confirm(`Are you sure you want to ${command} your PC?`)) {
            this.send({ action: 'POWER_COMMAND', payload: { command } });
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ControllerApp();
});
