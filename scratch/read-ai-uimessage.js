const fs = require('fs');
const content = fs.readFileSync('node_modules/ai/dist/index.d.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('interface UIMessage') || line.includes('type UIMessage') || line.includes('UIMessage =') || line.includes('UIMessage<')) {
    console.log(`${i}: ${line.slice(0, 120)}`);
  }
});
