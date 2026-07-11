const fs = require('fs');
const content = fs.readFileSync('node_modules/ai/dist/index.d.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('interface ChatInit') || line.includes('type ChatInit') || line.includes('ChatInit =')) {
    console.log(`${i}: ${line.slice(0, 120)}`);
  }
});
