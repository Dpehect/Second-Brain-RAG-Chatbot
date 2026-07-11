const fs = require('fs');
const content = fs.readFileSync('node_modules/@ai-sdk/react/dist/index.d.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('input') || line.includes('handleSubmit') || line.includes('UseChatHelpers')) {
    console.log(`${i}: ${line.slice(0, 120)}`);
  }
});
