import { pipeline } from '@xenova/transformers'

// Singleton class to ensure the ONNX model is loaded only once and cached in memory
class EmbedderPipeline {
  static instance: any = null

  static async getInstance() {
    if (!this.instance) {
      // Disable remote downloading configurations if needed, but defaults are fine
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }
    return this.instance
  }
}

/**
 * Generates a 384-dimensional vector embedding for a query string locally.
 * Uses the Xenova/all-MiniLM-L6-v2 ONNX model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await EmbedderPipeline.getInstance()
    // Run inference locally
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    // Convert Float32Array to standard JavaScript array
    return Array.from(output.data)
  } catch (error: any) {
    console.error('Error generating local embedding:', error)
    throw new Error(`Failed to generate local embedding: ${error.message}`)
  }
}

/**
 * Generates vector embeddings for multiple text chunks in batch locally.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings: number[][] = []
    // Process sequentially (very fast for local small models)
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
