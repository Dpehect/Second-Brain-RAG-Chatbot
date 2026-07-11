import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Initialize a dummy call
const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
});

console.log("StreamTextResult prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
