'use server'

/**
 * Document analysis module with serverless-safe architecture.
 * 
 * All AI SDK imports are dynamic to prevent Vercel serverless crashes.
 * Falls back to a comprehensive local text analysis engine if no AI is available.
 */

const TURKISH_STOPWORDS = new Set([
  've', 'veya', 'ama', 'fakat', 'lakin', 'ise', 'ile', 'ki', 'da', 'de', 'bir', 'bu', 'şu', 'o',
  'için', 'gibi', 'kadar', 'olan', 'olarak', 'tarafından', 'hedef', 'proje', 'her', 'hiç', 'şey',
  'mi', 'mu', 'mü', 'mı', 'en', 'daha', 'çok', 'kendi', 'biz', 'siz', 'onlar', 'ben', 'sen', 'içinde'
])

/**
 * Runs a zero-dependency local text analysis using stats and keyphrase extraction.
 * Guarantees a detailed, relevant feedback report even if 100% offline with zero models.
 */
function generateLocalFeedback(text: string, fileName: string): string {
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const wordCount = words.length
  
  // Calculate reading time (~200 words per minute)
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200))
  
  // Calculate vocabulary density (unique words ratio)
  const uniqueWords = new Set(words)
  const vocabDensity = wordCount > 0 ? (uniqueWords.size / wordCount) * 100 : 0
  
  // Extract sentences
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 5)
  const sentenceCount = sentences.length
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0

  // Count keyword frequencies (filtering stopwords)
  const freqMap: Record<string, number> = {}
  words.forEach(word => {
    if (word.length > 3 && !TURKISH_STOPWORDS.has(word) && !/^\d+$/.test(word)) {
      freqMap[word] = (freqMap[word] || 0) + 1
    }
  })

  // Sort keywords
  const topKeywords = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(entry => `${entry[0]} (${entry[1]} kez)`)

  // Extract headings
  const headings = text.split('\n')
    .map(line => line.trim())
    .filter(line => (line.startsWith('#') || (line.length > 5 && line.length < 50 && /^[A-ZĞÜŞİÖÇ\s0-9:.-]+$/.test(line))))
    .slice(0, 6)

  // Sentiment / Action Word Sentence Extraction
  const strengths: string[] = []
  const weaknesses: string[] = []
  const recommendations: string[] = []

  sentences.forEach(sentence => {
    const sLower = sentence.toLowerCase()
    
    // Strengths markers
    if (
      sLower.includes('başarılı') || 
      sLower.includes('avantaj') || 
      sLower.includes('güçlü') || 
      sLower.includes('kazanım') || 
      sLower.includes('iyi') || 
      sLower.includes('fayda')
    ) {
      if (strengths.length < 4 && !strengths.includes(sentence.trim())) {
        strengths.push(sentence.trim())
      }
    }
    
    // Weaknesses / Warning markers
    if (
      sLower.includes('hata') || 
      sLower.includes('sorun') || 
      sLower.includes('problem') || 
      sLower.includes('risk') || 
      sLower.includes('eksik') || 
      sLower.includes('yavaş') || 
      sLower.includes('başarısız')
    ) {
      if (weaknesses.length < 4 && !weaknesses.includes(sentence.trim())) {
        weaknesses.push(sentence.trim())
      }
    }
    
    // Recommendations / Action markers
    if (
      sLower.includes('gerek') || 
      sLower.includes('yapılmalı') || 
      sLower.includes('tavsiye') || 
      sLower.includes('öneri') || 
      sLower.includes('şart') || 
      sLower.includes('planlanmalı')
    ) {
      if (recommendations.length < 4 && !recommendations.includes(sentence.trim())) {
        recommendations.push(sentence.trim())
      }
    }
  })

  // Format Report
  return `# 📊 Doküman Analiz & Geribildirim Raporu (Yerel Motor)

Bu rapor, dokümanınızın içeriği üzerinde gerçekleştirilen statik ve anlamsal veri analizi sonucu oluşturulmuştur.

---

## 📈 Genel Metrikler
*   **Dosya Adı:** \`${fileName}\`
*   **Kelime Sayısı:** ${wordCount}
*   **Cümle Sayısı:** ${sentenceCount}
*   **Ortalama Cümle Uzunluğu:** ${avgSentenceLength.toFixed(1)} kelime
*   **Tahmini Okuma Süresi:** ~${readingTimeMinutes} dakika
*   **Kelime Çeşitliliği Oranı:** %${vocabDensity.toFixed(1)}

---

## 🔑 Öne Çıkan Anahtar Kelimeler & Konular
Dokümanda en çok tekrarlanan ve içeriğin odak noktasını oluşturan terimler:
${topKeywords.map(k => `*   **${k}**`).join('\n')}

${headings.length > 0 ? `---

## 🗂️ Algılanan Doküman Yapısı (Başlıklar)
Dokümandan çıkarılan ana başlıklar ve bölümler:
${headings.map(h => `*   ${h.replace(/#/g, '').trim()}`).join('\n')}` : ''}

---

## 🌟 Belirlenen Güçlü Yönler (Avantajlar)
İçerikten çıkarılan olumlu ve başarılı noktalar:
${strengths.length === 0 
  ? '*   Dokümanda doğrudan olumlu / güçlü yön belirten spesifik cümleler saptanamadı.' 
  : strengths.map(s => `*   "${s}."`).join('\n')}

---

## ⚠️ Potansiyel Riskler & Geliştirilmesi Gereken Alanlar
İçerikte saptanan hata, sorun, eksiklik veya risk barındıran noktalar:
${weaknesses.length === 0 
  ? '*   Dokümanda doğrudan risk, sorun veya hata bildiren belirgin cümleler saptanamadı.' 
  : weaknesses.map(w => `*   "${w}."`).join('\n')}

---

## 💡 Kritik Tavsiyeler & Aksiyon Önerileri
Gelişim ve iyileştirme için atılması gereken adımlar:
${recommendations.length === 0 
  ? '*   Dokümanda tavsiye veya öneri belirten doğrudan cümleler saptanamadı.' 
  : recommendations.map(r => `*   "${r}."`).join('\n')}

---

*Not: Akıllı dil modelleriyle daha akıcı ve özel analizler almak isterseniz bilgisayarınızda **Ollama** servisini başlatabilir veya projenin \`.env.local\` dosyasına bulut yapay zeka anahtarlarınızı ekleyebilirsiniz.*`
}

/**
 * Analyzes document text and generates a detailed feedback report.
 * Uses dynamic imports for all AI SDKs to prevent serverless crashes.
 * Falls back to local text analysis if no AI model is available.
 */
export async function analyzeDocumentText(text: string, fileName: string): Promise<string> {
  const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== ''
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ''
  const hasXai = !!process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim() !== ''

  let isOllamaRunning = false
  let ollamaModel = ''

  // If no cloud keys exist, check local Ollama
  if (!hasOpenAI && !hasAnthropic && !hasXai) {
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(500)
      })
      if (ollamaResponse.ok) {
        const ollamaData = await ollamaResponse.json()
        if (ollamaData.models && ollamaData.models.length > 0) {
          isOllamaRunning = true
          ollamaModel = ollamaData.models[0].name
        }
      }
    } catch (e) {
      // Ollama offline
    }
  }

  // 1. If any LLM engine is active, use it for a rich semantic analysis
  if (hasOpenAI || hasAnthropic || hasXai || isOllamaRunning) {
    try {
      // Dynamic imports — only loaded when actually needed
      const { generateText } = await import('ai')
      let model: any

      if (isOllamaRunning) {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const localOllama = createOpenAI({
          baseURL: 'http://localhost:11434/v1',
          apiKey: 'ollama',
        })
        model = localOllama(ollamaModel)
      } else if (hasAnthropic) {
        const { anthropic } = await import('@ai-sdk/anthropic')
        model = anthropic('claude-3-5-sonnet-20241022')
      } else if (hasXai) {
        const { createOpenAI } = await import('@ai-sdk/openai')
        const xai = createOpenAI({
          name: 'xai',
          apiKey: process.env.XAI_API_KEY || '',
          baseURL: 'https://api.x.ai/v1',
        })
        model = xai('grok-beta')
      } else {
        const { openai } = await import('@ai-sdk/openai')
        model = openai('gpt-4o')
      }

      const truncatedText = text.slice(0, 10000) // Keep within safe model context limit
      const prompt = `Aşağıda metni verilen "${fileName}" adlı dokümanı detaylı bir şekilde analiz et ve bir geribildirim (feedback) raporu oluştur. 

Analiz sonucunda şu başlıklar mutlaka bulunmalıdır:
1. Genel Özet ve Amaç (Metnin ana konusu ve ne amaçla yazıldığı)
2. Öne Çıkan Temalar & Konu Başlıkları (Kilit noktalar nelerdir)
3. Güçlü Yönler (Metnin başarılı yazılmış, doğru tespitler barındıran kısımları)
4. Geliştirilmesi Gereken Alanlar (Hata, eksik bilgi, riskli varsayımlar veya zayıf argümanlar)
5. Kritik Aksiyon Önerileri (Yazarın alması gereken aksiyonlar ve iyileştirme adımları)

Yanıtı sadece Türkçe olarak, markdown formatında, profesyonel ve kurumsal bir dille yaz.

Doküman İçeriği:
---
${truncatedText}
---`

      const { text: responseText } = await generateText({
        model,
        prompt,
      })
      return responseText
    } catch (err) {
      console.error('LLM Analysis failed, falling back to static parser:', err)
      // Fallback on LLM API failure
      return generateLocalFeedback(text, fileName)
    }
  }

  // 2. Otherwise, run 100% offline static analyzer
  return generateLocalFeedback(text, fileName)
}
