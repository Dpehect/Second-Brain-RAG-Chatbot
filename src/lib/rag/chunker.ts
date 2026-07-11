interface Chunk {
  content: string
  chunkIndex: number
}

/**
 * Splits text into chunks with specified size and overlap.
 * Uses a look-back search for natural delimiters (newlines, spaces)
 * to avoid splitting words or paragraphs mid-sentence.
 * 
 * @param text The full document text content
 * @param chunkSize The maximum character length of each chunk (approx. 200-250 words)
 * @param chunkOverlap The number of characters to overlap between chunks
 */
export function chunkText(text: string, chunkSize = 1000, chunkOverlap = 200): Chunk[] {
  if (!text || text.trim() === '') return []

  const chunks: Chunk[] = []
  let startIndex = 0
  let chunkIndex = 0

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize

    // Try to find a natural break (newline or space) near the target end index
    if (endIndex < text.length) {
      // Look back up to 150 characters to find a good breaking point
      const lookbackLimit = Math.max(startIndex, endIndex - 150)
      let foundBoundary = false

      // Try newline first
      for (let i = endIndex; i > lookbackLimit; i--) {
        if (text[i] === '\n') {
          endIndex = i + 1 // Include the newline in the current chunk
          foundBoundary = true
          break
        }
      }

      // Try space next
      if (!foundBoundary) {
        for (let i = endIndex; i > lookbackLimit; i--) {
          if (text[i] === ' ') {
            endIndex = i + 1 // Include the space in the current chunk
            foundBoundary = true
            break
          }
        }
      }
    } else {
      endIndex = text.length
    }

    const content = text.slice(startIndex, endIndex).trim()
    if (content.length > 0) {
      chunks.push({
        content,
        chunkIndex,
      })
      chunkIndex++
    }

    // Advance the window, taking the overlap into account
    const nextStartIndex = endIndex - chunkOverlap

    // Prevent infinite loop if we aren't advancing
    if (nextStartIndex <= startIndex) {
      startIndex = endIndex
    } else {
      startIndex = nextStartIndex
    }
  }

  return chunks
}
