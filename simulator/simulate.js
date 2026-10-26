const API = process.env.API_URL || 'http://localhost:5000/api/readings';
const bays = ['DOCK-01', 'DOCK-02', 'DOCK-03'];

async function send() {
  for (const bayId of bays) {
    // Mostly normal values, with occasional warning/critical test cases.
    const phase = Math.random();
    let temperatureC = 30 + Math.random() * 8;
    let currentA = 0.6 + Math.random() * 1.1;
    if (phase > 0.91) { temperatureC = 42 + Math.random() * 5; currentA = 2.2 + Math.random() * 0.5; }
    if (phase > 0.975) { temperatureC = 51 + Math.random() * 3; currentA = 3.1 + Math.random() * 0.6; }

    const payload = { bayId, temperatureC: Number(temperatureC.toFixed(1)), currentA: Number(currentA.toFixed(2)), deviceOnline: true, source: 'simulator' };
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) console.error('API rejected reading:', await response.text());
      else console.log(new Date().toLocaleTimeString(), bayId, payload.temperatureC + '°C', payload.currentA + 'A');
    } catch (err) { console.error('Could not reach API. Is backend running?', err.message); }
  }
}
console.log('Sending simulated readings to', API);
await send();
setInterval(send, 3000);
