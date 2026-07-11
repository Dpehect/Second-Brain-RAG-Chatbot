import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, conversationId, model } = await req.json()

    if (!conversationId) {
      return new Response('Conversation ID is required', { status: 400 })
    }

    // Get the user's latest query
    const lastUserMessage = messages[messages.length - 1]
    const userQuery = lastUserMessage.content

    // 2. Perform Semantic Search locally (dynamic import)
    let queryEmbedding: number[] = []
    let retrievedChunks: any[] = []

    try {
      const { generateEmbedding } = await import('@/lib/rag/embedder')
      queryEmbedding = await generateEmbedding(userQuery)

      // Query pgvector matches via RPC
      const { data: matches, error: rpcError } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.25, // Lower threshold slightly for local embeddings
        match_count: 4,
        filter_user_id: user.id
      })

      if (rpcError) {
        console.error('RPC match_document_chunks error:', rpcError)
      } else {
        retrievedChunks = matches ?? []
      }
    } catch (embErr) {
      console.error('Local retrieval failed:', embErr)
    }

    // Save the user's message to the database
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (!count || count === 0) {
      const titleSnippet = userQuery.slice(0, 35) + (userQuery.length > 35 ? '...' : '')
      await supabase
        .from('conversations')
        .update({ title: titleSnippet })
        .eq('id', conversationId)
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'user',
      content: userQuery,
      sources: []
    })

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    const sourcesData = retrievedChunks.map((c) => ({
      documentId: c.document_id,
      documentName: c.document_name,
      content: c.content,
      chunkIndex: c.chunk_index,
      similarity: c.similarity
    }))

    // 3. Detect available AI providers (Cloud vs Local Ollama)
    const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ''
    const hasXai = !!process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim() !== ''

    let isOllamaRunning = false
    let ollamaModel = ''

    // If no cloud keys exist, check if Ollama is running locally
    if (!hasOpenAI && !hasAnthropic && !hasXai) {
      try {
        const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
          signal: AbortSignal.timeout(600) // 600ms timeout
        })
        if (ollamaResponse.ok) {
          const ollamaData = await ollamaResponse.json()
          if (ollamaData.models && ollamaData.models.length > 0) {
            isOllamaRunning = true
            ollamaModel = ollamaData.models[0].name // Use first installed local model
          }
        }
      } catch (e) {
        // Ollama not running
      }
    }

    const hasAnyEngine = hasOpenAI || hasAnthropic || hasXai || isOllamaRunning

    // FALLBACK: 100% Local RAG Synthesizer when no LLM engine is active
    if (!hasAnyEngine) {
      const textResponse = `### 🧠 Bilgi Tabanı Analizi (Yerel Arama)

Herhangi bir bulut yapay zeka anahtarı (OpenAI/Anthropic/Grok) veya yerel **Ollama** servisi tespit edilemediği için, arama motorumuz dokümanlarınızdaki en alakalı paragrafları doğrudan listeledi:

${retrievedChunks.length === 0 
  ? '_Bilgi tabanınızda bu soruyla eşleşen alakalı bir doküman bulunamadı. Lütfen önce PDF veya metin dosyası yükleyin._' 
  : retrievedChunks.map((c, i) => {
      return `#### 📁 Kaynak [Source ${i + 1}]: *${c.document_name}* (Bölüm ${c.chunk_index})
> ${c.content.trim()}
`
    }).join('\n')
}

**💡 Öneri:**
Verilerinizle akıcı ve akıllı bir yapay zeka sohbeti gerçekleştirmek isterseniz:
1. Bilgisayarınızda **Ollama** uygulamasını başlatıp bir model indirebilirsiniz (Örn: \`ollama run llama3\`). Sistem Ollama'yı otomatik algılayacaktır.
2. Veya projenin \`.env.local\` dosyasına \`OPENAI_API_KEY\` ya da \`ANTHROPIC_API_KEY\` tanımlayabilirsiniz.`

      // Save assistant response to DB
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: textResponse,
        sources: sourcesData
      })

      // Stream the local response using Vercel AI SDK's data stream protocol format
      const encoder = new TextEncoder()
      const customStream = new ReadableStream({
        async start(controller) {
          // 1. Send sources metadata first as annotation part
          const annotationPart = JSON.stringify({
            type: 'sources',
            sources: sourcesData
          })
          controller.enqueue(encoder.encode(`d:${annotationPart}\n`))
          
          // 2. Stream text in chunks to simulate typing speed
          const chunkSize = 25
          for (let i = 0; i < textResponse.length; i += chunkSize) {
            const chunk = textResponse.slice(i, i + chunkSize)
            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))
            await new Promise((resolve) => setTimeout(resolve, 40))
          }
          controller.close()
        }
      })

      return new Response(customStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'x-vercel-ai-data-stream': 'v1',
        }
      })
    }

    // 4. Format prompt context for active LLMs
    const context = retrievedChunks
      .map((c, i) => `[Source ${i + 1}]: ${c.document_name} (Chunk ${c.chunk_index})\nContent: ${c.content}`)
      .join('\n\n')

    let systemInstruction = 'You are a helpful AI Assistant. Answer in clear markdown format.'
    if (retrievedChunks.length > 0) {
      systemInstruction = `You are a helpful AI Second Brain assistant. 
Answer the user's question using ONLY the provided document context below. 
If the context does not contain the answer, politely state that you do not have that information in your knowledge base. 
Do not make up facts. 
Provide clear citations in your text referencing the Source number (e.g. [Source 1], [Source 2]) where appropriate.

Context:
${context}`
    }

    // 5. Select the LLM Model provider (dynamic imports)
    const { streamText } = await import('ai')
    let selectedModel: any

    if (isOllamaRunning) {
      // Connect to local Ollama via OpenAI compatibility provider
      const { createOpenAI } = await import('@ai-sdk/openai')
      const localOllama = createOpenAI({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama', // Dummy key
      })
      selectedModel = localOllama(ollamaModel)
    } else if (model === 'claude-3-5-sonnet' && hasAnthropic) {
      const { anthropic } = await import('@ai-sdk/anthropic')
      selectedModel = anthropic('claude-3-5-sonnet-20241022')
    } else if (model === 'grok-3' && hasXai) {
      const { createOpenAI } = await import('@ai-sdk/openai')
      const xai = createOpenAI({
        name: 'xai',
        apiKey: process.env.XAI_API_KEY || '',
        baseURL: 'https://api.x.ai/v1',
      })
      selectedModel = xai('grok-beta')
    } else {
      // Fallback to OpenAI GPT-4o
      const { openai } = await import('@ai-sdk/openai')
      selectedModel = openai('gpt-4o')
    }

    // 6. Return standard Vercel AI SDK UI Message stream response
    const result = await streamText({
      model: selectedModel,
      messages,
      system: systemInstruction,
      onFinish: async (event) => {
        // Save the assistant's response to database
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: 'assistant',
          content: event.text,
          sources: sourcesData
        })
      }
    })

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      messageMetadata: () => {
        return {
          sources: sourcesData
        }
      }
    })
  } catch (error: any) {
    console.error('Error in chat API route:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
