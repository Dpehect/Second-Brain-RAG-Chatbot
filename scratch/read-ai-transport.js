const fs = require('fs');
const content = fs.readFileSync('node_modules/ai/dist/index.d.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('class HttpChatTransport') || line.includes('interface HttpChatTransport') || line.includes('HttpChatTransportOptions') || line.includes('httpChatTransport') || line.includes('HttpChatTransport =')) {
    console.log(`${i}: ${line.slice(0, 120)}`);
  }
});
