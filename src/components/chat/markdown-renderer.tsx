'use client'

import React from 'react'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null

  // Simple line-by-line markdown rendering parser
  const lines = content.split('\n')
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeLang = ''

  const renderedElements: React.ReactNode[] = []

  // Unique key generator
  const makeKey = (prefix: string, index: number) => `${prefix}-${index}`

  const parseInlineMarkdown = (text: string) => {
    // Parse bold (**text**) and inline code (`code`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400 border border-neutral-750">
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block check
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        inCodeBlock = false
        const codeText = codeLines.join('\n')
        renderedElements.push(
          <div key={makeKey('code', i)} className="my-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 font-mono text-sm shadow-md">
            {codeLang && (
              <div className="flex items-center justify-between bg-neutral-900 px-4 py-1.5 text-xs text-neutral-400 border-b border-neutral-800">
                <span>{codeLang}</span>
              </div>
            )}
            <pre className="overflow-x-auto p-4 text-emerald-400">
              <code>{codeText}</code>
            </pre>
          </div>
        )
        codeLines = []
        codeLang = ''
      } else {
        // Open code block
        inCodeBlock = true
        codeLang = line.slice(3).trim() || 'code'
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // Header 1, 2, 3
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={makeKey('h1', i)} className="mt-4 mb-2 text-2xl font-bold text-white tracking-tight">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={makeKey('h2', i)} className="mt-4 mb-2 text-xl font-bold text-white tracking-tight">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={makeKey('h3', i)} className="mt-4 mb-2 text-lg font-bold text-white">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      )
    }
    // Lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      renderedElements.push(
        <ul key={makeKey('ul', i)} className="list-disc pl-5 my-1.5 space-y-1">
          <li className="text-neutral-300">
            {parseInlineMarkdown(line.slice(2))}
          </li>
        </ul>
      )
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      const num = match ? match[1] : ''
      const text = match ? match[2] : line
      renderedElements.push(
        <ol key={makeKey('ol', i)} className="list-decimal pl-5 my-1.5 space-y-1">
          <li className="text-neutral-300">
            {parseInlineMarkdown(text)}
          </li>
        </ol>
      )
    }
    // Paragraph
    else {
      if (line.trim() === '') {
        renderedElements.push(<div key={makeKey('br', i)} className="h-2" />)
      } else {
        renderedElements.push(
          <p key={makeKey('p', i)} className="leading-7 text-neutral-300 my-1.5">
            {parseInlineMarkdown(line)}
          </p>
        )
      }
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    renderedElements.push(
      <div key="unclosed-code" className="my-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 font-mono text-sm">
        <pre className="overflow-x-auto p-4 text-emerald-400">
          <code>{codeLines.join('\n')}</code>
        </pre>
      </div>
    )
  }

  return <div className="space-y-1 text-sm">{renderedElements}</div>
}
