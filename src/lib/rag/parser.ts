'use server'

/**
 * Document parser module with serverless-safe architecture.
 * 
 * All heavy library imports (pdf-parse, mammoth, word-extractor) are dynamic
 * to prevent Vercel serverless crashes from module-level side effects.
 */

/**
 * Parses a PDF buffer and returns its raw text content.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const pdf = await import('pdf-parse')
    const parseFn = (pdf as any).default || pdf
    const data = await parseFn(buffer)
    return data.text || ''
  } catch (error: any) {
    console.error('Error parsing PDF:', error)
    throw new Error(`Failed to parse PDF: ${error.message}`)
  }
}

/**
 * Parses a DOCX (Word) buffer and returns its raw text content.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const mammothModule = (mammoth as any).default || mammoth
    const result = await mammothModule.extractRawText({ buffer })
    return result.value || ''
  } catch (error: any) {
    console.error('Error parsing DOCX:', error)
    throw new Error(`Failed to parse Word document: ${error.message}`)
  }
}

/**
 * Parses a legacy DOC (Word 97-2003) buffer and returns its raw text content.
 */
export async function parseDoc(buffer: Buffer): Promise<string> {
  try {
    const WordExtractor = await import('word-extractor')
    const ExtractorClass = (WordExtractor as any).default || WordExtractor
    const extractor = new ExtractorClass()
    const doc = await extractor.extract(buffer)
    return doc.getBody() || ''
  } catch (error: any) {
    console.error('Error parsing legacy DOC:', error)
    throw new Error(`Failed to parse legacy Word document: ${error.message}`)
  }
}

/**
 * Route handler / Server Action helper to parse uploaded documents.
 * Supports PDF, DOCX (Word), DOC (Legacy Word), and plain text / Markdown formats.
 */
export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  const isDoc = mimeType === 'application/msword'
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  if (mimeType === 'application/pdf') {
    return parsePdf(buffer)
  } else if (isDocx) {
    return parseDocx(buffer)
  } else if (isDoc) {
    return parseDoc(buffer)
  } else if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/octet-stream' || // Fallback for some markdown files
    mimeType.startsWith('text/')
  ) {
    return buffer.toString('utf-8')
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`)
  }
}
