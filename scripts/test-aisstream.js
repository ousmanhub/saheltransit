import WebSocket from 'ws';

const key = process.argv[2] || process.env.AISSTREAM_API_KEY;
if (!key) {
  console.error('Usage: node test-aisstream.js <API_KEY>');
  process.exit(1);
}

const bboxes = [
  ['Douala tight', [[3.5, 8.5], [4.8, 10.0]]],
  ['Cameroon coast', [[2.0, 8.0], [6.0, 12.0]]],
  ['Gulf of Guinea', [[0.0, -5.0], [8.0, 10.0]]],
  ['Rotterdam', [[51.5, 3.5], [52.5, 5.0]]],
];

async function testBox(name, bbox) {
  return new Promise((resolve) => {
    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    let count = 0;
    const timer = setTimeout(() => {
      console.log(`${name}: timeout, ${count} messages`);
      try { ws.close(); } catch {}
      resolve(undefined);
    }, 4000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [bbox] }));
    });

    ws.on('message', (data) => {
      count++;
      try {
        const msg = JSON.parse(data);
        const mmsi = msg.MetaData?.MMSI;
        const types = Object.keys(msg.Message || {}).join(',');
        if (count <= 3) console.log(`${name}: msg ${count}`, types, mmsi);
      } catch {
        // ignore
      }
    });

    ws.on('error', (err) => {
      console.log(`${name}: error`, err.message);
      clearTimeout(timer);
      resolve(undefined);
    });

    ws.on('close', () => {
      clearTimeout(timer);
      resolve(undefined);
    });
  });
}

(async () => {
  for (const [name, bbox] of bboxes) {
    await testBox(name, bbox);
  }
  process.exit(0);
})();
