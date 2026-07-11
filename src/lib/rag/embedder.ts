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
 * Prefers OpenAI text-embedding-3-small (dimensions: 384) if key is present.
 * If running on Vercel/Production without a key, bypasses the local ONNX model to prevent RAM limits crash.
 * Otherwise, falls back to local all-MiniLM-L6-v2 ONNX model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

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
      console.warn('OpenAI embedding failed, trying fallback:', error)
    }
  }

  // On Vercel/Production, bypass local model to prevent Out Of Memory (OOM) crashes
  if (isServerless) {
    console.warn('Serverless environment detected without OpenAI key. Bypassing local model to prevent OOM crash.')
    const mockVector = new Array(384).fill(0)
    mockVector[0] = 1.0
    return mockVector
  }

  try {
    const extractor = await EmbedderPipeline.getInstance()
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    return Array.from(output.data)
  } catch (error: any) {
    console.warn('Local ONNX embedding generation failed, using fallback mock vector:', error)
    const mockVector = new Array(384).fill(0)
    mockVector[0] = 1.0
    return mockVector
  }
}

/**
 * Generates vector embeddings for multiple text chunks in batch.
 * Prefers OpenAI text-embedding-3-small (dimensions: 384) if key is present.
 * If running on Vercel/Production without a key, bypasses the local ONNX model to prevent RAM limits crash.
 * Otherwise, falls back to local all-MiniLM-L6-v2 ONNX model.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

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
      console.warn('OpenAI batch embedding failed, trying fallback:', error)
    }
  }

  // On Vercel/Production, bypass local model to prevent Out Of Memory (OOM) crashes
  if (isServerless) {
    console.warn('Serverless environment detected without OpenAI key. Bypassing batch local model to prevent OOM crash.')
    const mockVector = new Array(384).fill(0)
    mockVector[0] = 1.0
    return new Array(texts.length).fill(mockVector)
  }

  try {
    const embeddings: number[][] = []
    for (const text of texts) {
      const emb = await generateEmbedding(text)
      embeddings.push(emb)
    }
    return embeddings
  } catch (error: any) {
    console.warn('Local batch ONNX embedding generation failed, using fallback mock vectors:', error)
    const mockVector = new Array(384).fill(0)
    mockVector[0] = 1.0
    return new Array(texts.length).fill(mockVector)
  }
}
