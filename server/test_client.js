const Bonjour = require('bonjour-service').default;
const WebSocket = require('ws');

console.log('🔍 Searching for mDNS service (type: sh4lu)...');
const bonjour = new Bonjour();
let found = false;

bonjour.find({ type: 'sh4lu' }, (service) => {
    found = true;
    console.log(`✅ Found service via mDNS: ${service.name} at IP: ${service.addresses?.[0]}`);
    testWebSocket(service.addresses?.[0] || 'localhost', service.port);
});

setTimeout(() => {
    if (!found) {
        console.log('⚠️ mDNS discovery took too long by loopback. Testing WebSocket directly on localhost:8080...');
        testWebSocket('localhost', 8080);
    }
}, 3000);

function testWebSocket(host, port) {
    const wsUrl = `ws://${host}:${port}`;
    console.log(`🔗 Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('🚀 Connected to WebSocket server!');
        
        console.log('Sending PING...');
        ws.send(JSON.stringify({ action: 'PING' }));

        setTimeout(() => {
            console.log('Sending GET_STATS...');
            ws.send(JSON.stringify({ action: 'GET_STATS' }));
        }, 1000);

        setTimeout(() => {
            console.log('Sending GET_VOLUME...');
            ws.send(JSON.stringify({ action: 'GET_VOLUME' }));
        }, 2000);
        
        setTimeout(() => {
             console.log('✅ Testing complete. Exiting.');
             process.exit(0);
        }, 4000);
    });

    ws.on('message', (msg) => {
        console.log('📨 Received from server:', msg.toString());
    });

    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
        process.exit(1);
    });
}
