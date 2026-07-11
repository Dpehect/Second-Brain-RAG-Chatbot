const fs = require('fs');
const content = fs.readFileSync('node_modules/@ai-sdk/react/dist/index.js', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('useChat') || line.includes('handleSubmit') || line.includes('handleInputChange')) {
    console.log(`${i}: ${line.slice(0, 120)}`);
  }
});
