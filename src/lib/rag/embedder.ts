'use server'

/**
 * Embedding module with serverless-safe architecture.
 * 
 * CRITICAL: On Vercel/serverless, we NEVER import @xenova/transformers at the top level.
 * The ONNX runtime + WASM binaries exceed serverless memory limits when loaded.
 * Instead, we use dynamic imports ONLY when running locally.
 */

/**
 * Generates a 384-dimensional vector embedding for a query string.
 * 
 * Priority order:
 * 1. OpenAI text-embedding-3-small (if OPENAI_API_KEY is set)
 * 2. Mock vector fallback (on Vercel/serverless without OpenAI key)
 * 3. Local all-MiniLM-L6-v2 ONNX model (localhost only)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

  // 1. Try OpenAI cloud embedding
  if (hasOpenAI) {
    try {
      const { openai } = await import('@ai-sdk/openai')
      const { embed } = await import('ai')
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: text,
        providerOptions: {
          openai: { dimensions: 384 },
        },
      })
      return embedding
    } catch (error) {
      console.warn('OpenAI embedding failed, trying fallback:', error)
    }
  }

  // 2. On serverless without OpenAI, return a placeholder vector
  if (isServerless) {
    console.warn('Serverless: no OpenAI key, using placeholder vector.')
    const v = new Array(384).fill(0)
    v[0] = 1.0
    return v
  }

  // 3. Local-only: dynamically import the heavy ONNX model
  try {
    const { env, pipeline } = await import('@xenova/transformers')
    env.cacheDir = '/tmp/transformers-cache'
    env.allowLocalModels = false
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1
    }
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  } catch (error: any) {
    console.warn('Local ONNX failed, using placeholder vector:', error)
    const v = new Array(384).fill(0)
    v[0] = 1.0
    return v
  }
}

/**
 * Generates vector embeddings for multiple text chunks in batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
  const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

  // 1. Try OpenAI cloud batch embedding
  if (hasOpenAI) {
    try {
      const { openai } = await import('@ai-sdk/openai')
      const { embedMany } = await import('ai')
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: texts,
        providerOptions: {
          openai: { dimensions: 384 },
        },
      })
      return embeddings
    } catch (error) {
      console.warn('OpenAI batch embedding failed, trying fallback:', error)
    }
  }

  // 2. On serverless without OpenAI, return placeholder vectors
  if (isServerless) {
    console.warn('Serverless: no OpenAI key, using placeholder vectors.')
    const v = new Array(384).fill(0)
    v[0] = 1.0
    return texts.map(() => [...v])
  }

  // 3. Local-only: use ONNX model one by one
  try {
    const results: number[][] = []
    for (const t of texts) {
      results.push(await generateEmbedding(t))
    }
    return results
  } catch (error: any) {
    console.warn('Local batch ONNX failed, using placeholder vectors:', error)
    const v = new Array(384).fill(0)
    v[0] = 1.0
    return texts.map(() => [...v])
  }
}
