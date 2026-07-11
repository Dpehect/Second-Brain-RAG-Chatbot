import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Hello',
});

console.log("toUIMessageStreamResponse code:", result.toUIMessageStreamResponse.toString());
