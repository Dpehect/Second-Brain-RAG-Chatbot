import * as ai from 'ai';
console.log("Exports matching 'Stream', 'Response', or 'Data':", Object.keys(ai).filter(k => k.includes('Stream') || k.includes('Response') || k.includes('Data')));
