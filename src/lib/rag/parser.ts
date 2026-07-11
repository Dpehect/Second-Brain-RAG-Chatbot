import * as pdf from 'pdf-parse'
import mammoth from 'mammoth'

/**
 * Parses a PDF buffer and returns its raw text content.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await ((pdf as any).default || pdf)(buffer)
    return data.text || ''
  } catch (error: any) {
    console.error('Error parsing PDF:', error)
    throw new Error(`Failed to parse PDF: ${error.message}`)
  }
}

/**
 * Parses a DOCX (Word) buffer and returns its raw text content.
 * Runs completely locally on the server.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  } catch (error: any) {
    console.error('Error parsing DOCX:', error)
    throw new Error(`Failed to parse Word document: ${error.message}`)
  }
}

/**
 * Route handler / Server Action helper to parse uploaded documents.
 * Supports PDF, DOCX (Word), and plain text / Markdown formats.
 */
export async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return parsePdf(buffer)
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return parseDocx(buffer)
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
