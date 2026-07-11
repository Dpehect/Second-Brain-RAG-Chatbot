import { env, pipeline } from '@xenova/transformers'
import { openai } from '@ai-sdk/openai'
import { embed, embedMany } from 'ai'

// Configure transformers.js to use the writable /tmp directory on serverless hosts like Vercel
env.cacheDir = '/tmp/transformers-cache'
env.allowLocalModels = false // Prevents checking local paths and speeds up loading

// Optimize thread usage for serverless containers
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1
}

// Singleton class to ensure the ONNX model is loaded only once and cached in memory
class EmbedderPipeline {
  static instance: any = null

  static async getInstance() {
    if (!this.instance) {
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }
    return this.instance
  }
}

/**
 * Generates a 384-dimensional vector embedding for a query string.
 * Prefers OpenAI text-embedding-3-small (dimensions: 384) if key is present,
 * and falls back to local all-MiniLM-L6-v2 ONNX model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''

  if (hasOpenAI) {
    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
        providerOptions: {
          openai: {
            dimensions: 384,
          },
        },
      })
      return embedding
    } catch (error) {
      console.warn('OpenAI embedding failed, falling back to local ONNX model:', error)
    }
  }

  try {
    const extractor = await EmbedderPipeline.getInstance()
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    return Array.from(output.data)
  } catch (error: any) {
    console.error('Error generating local embedding:', error)
    throw new Error(`Failed to generate local embedding: ${error.message}`)
  }
}

/**
 * Generates vector embeddings for multiple text chunks in batch.
 * Prefers OpenAI text-embedding-3-small (dimensions: 384) if key is present,
 * and falls back to local all-MiniLM-L6-v2 ONNX model.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''

  if (hasOpenAI) {
    try {
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: texts,
        providerOptions: {
          openai: {
            dimensions: 384,
          },
        },
      })
      return embeddings
    } catch (error) {
      console.warn('OpenAI batch embedding failed, falling back to local ONNX model:', error)
    }
  }

  try {
    const embeddings: number[][] = []
    for (const text of texts) {
      const emb = await generateEmbedding(text)
      embeddings.push(emb)
    }
    return embeddings
  } catch (error: any) {
    console.error('Error generating batch local embeddings:', error)
    throw new Error(`Failed to generate batch local embeddings: ${error.message}`)
  }
}
