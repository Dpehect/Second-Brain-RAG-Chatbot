'use server'

import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/rag/parser'
import { chunkText } from '@/lib/rag/chunker'
import { generateEmbeddings } from '@/lib/rag/embedder'
import { analyzeDocumentText } from '@/lib/rag/analyzer'
import { revalidatePath } from 'next/cache'

/**
 * Server action to securely upload a file to Supabase storage,
 * parse its contents (PDF/TXT/DOCX), chunk it, generate embeddings,
 * automatically analyze it, and bulk-insert them into pgvector.
 */
export async function uploadAndProcessDocument(formData: FormData) {
  const supabase = await createClient()

  // 1. Get user session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided.' }
  }

  // Set file size limits (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File size exceeds the 10MB limit.' }
  }

  const name = file.name
  const size = file.size
  const mimeType = file.type

  // 2. Create document record in database with pending status
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      name,
      storage_path: '', // Will update once upload succeeds
      size,
      mime_type: mimeType,
      status: 'pending',
    })
    .select()
    .single()

  if (dbError || !doc) {
    return { error: `Failed to register document in DB: ${dbError?.message}` }
  }

  const docId = doc.id
  const storagePath = `${user.id}/${docId}/${name}`

  try {
    // 3. Ensure the storage bucket exists
    await supabase.storage.createBucket('documents', {
      public: false,
    }).catch(() => {
      // Catch error if it already exists or if client lacks permissions
    })

    // 4. Upload file to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // 5. Update document storage path and transition to processing
    await supabase
      .from('documents')
      .update({ storage_path: storagePath, status: 'processing' })
      .eq('id', docId)

    revalidatePath('/dashboard/documents')

    // 6. Parse document content
    const textContent = await parseDocument(fileBuffer, mimeType)
    if (!textContent || textContent.trim() === '') {
      throw new Error('Document contains no readable text.')
    }

    // 7. Create overlapping text chunks
    const chunks = chunkText(textContent)
    if (chunks.length === 0) {
      throw new Error('Failed to split document into text chunks.')
    }

    // 8. Generate embeddings in batches
    const chunkTexts = chunks.map((c) => c.content)
    const embeddings = await generateEmbeddings(chunkTexts)

    // 9. Formulate chunks schema for DB
    const insertData = chunks.map((chunk, index) => ({
      document_id: docId,
      user_id: user.id,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        fileName: name,
        fileSize: size,
        mimeType,
        charCount: chunk.content.length,
      },
      chunk_index: chunk.chunkIndex,
    }))

    // 10. Insert chunks in batches of 100 to prevent query parameter limits
    const BATCH_SIZE = 100
    for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
      const batch = insertData.slice(i, i + BATCH_SIZE)
      const { error: chunkInsertError } = await supabase
        .from('document_chunks')
        .insert(batch)

      if (chunkInsertError) {
        throw new Error(`Failed to save chunks to vector store: ${chunkInsertError.message}`)
      }
    }

    // 11. Automatically generate local/LLM document analysis & feedback report
    let analysisReport = ''
    try {
      analysisReport = await analyzeDocumentText(textContent, name)
    } catch (analysisErr) {
      console.error('Auto-analysis generation failed, skipping:', analysisErr)
    }

    // 12. Update document status to completed and store analysis report
    await supabase
      .from('documents')
      .update({ 
        status: 'completed',
        analysis: analysisReport || null
      })
      .eq('id', docId)

    revalidatePath('/dashboard/documents')
    return { success: true, documentId: docId }

  } catch (err: any) {
    console.error('Error processing document RAG pipeline:', err)

    // Log failure in DB
    await supabase
      .from('documents')
      .update({
        status: 'failed',
        error_message: err.message || 'Unknown processing error',
      })
      .eq('id', docId)

    revalidatePath('/dashboard/documents')
    return { error: err.message || 'Processing failed' }
  }
}

/**
 * Server action to manually trigger or re-run document feedback analysis.
 */
export async function generateDocumentAnalysis(documentId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized.' }
  }

  // Fetch document details
  const { data: doc, error: fetchDocError } = await supabase
    .from('documents')
    .select('name')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchDocError || !doc) {
    return { error: 'Document not found.' }
  }

  // Fetch all text chunks for this document
  const { data: chunks, error: fetchChunksError } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })

  if (fetchChunksError || !chunks || chunks.length === 0) {
    return { error: 'No content found to analyze for this document.' }
  }

  const textContent = chunks.map(c => c.content).join('\n')

  try {
    // Generate analysis
    const report = await analyzeDocumentText(textContent, doc.name)
    
    // Save report to database
    const { error: updateError } = await supabase
      .from('documents')
      .update({ analysis: report })
      .eq('id', documentId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`)
    }

    revalidatePath('/dashboard/documents')
    return { success: true, analysis: report }
  } catch (err: any) {
    console.error('Failed to trigger manual document analysis:', err)
    return { error: err.message || 'Analysis generation failed.' }
  }
}

/**
 * Server action to delete a document.
 * Automatically deletes corresponding Storage file and cascade deletes DB chunks.
 */
export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized.' }
  }

  // Get path for storage deletion
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) {
    return { error: 'Document not found.' }
  }

  // 1. Delete file from Storage
  if (doc.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }

  // 2. Delete database record (triggers Cascade delete on document_chunks)
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id)

  if (deleteError) {
    return { error: `Failed to delete document from database: ${deleteError.message}` }
  }

  revalidatePath('/dashboard/documents')
  return { success: true }
}
