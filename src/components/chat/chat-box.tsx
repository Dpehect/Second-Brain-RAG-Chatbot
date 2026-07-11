'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Brain, SendHorizontal, Loader2, Sparkles, AlertCircle, FileText, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import MarkdownRenderer from './markdown-renderer'
import { cn } from '@/lib/utils'

interface DBMessage {
  id: string
  role: string
  content: string
  sources: any
  created_at: string
}

interface ChatBoxProps {
  conversationId: string
  initialMessages: DBMessage[]
}

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', icon: '⚡' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', icon: '🎭' },
  { id: 'grok-3', name: 'Grok-3 (xAI)', icon: '🔮' },
]

export default function ChatBox({ conversationId, initialMessages }: ChatBoxProps) {
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [input, setInput] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Map initial DB messages to SDK message format with metadata embedded
  const sdkInitialMessages: UIMessage[] = initialMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'system' | 'user' | 'assistant',
    parts: [
      {
        type: 'text',
        text: msg.content,
      },
    ],
    metadata: {
      sources: msg.sources || [],
    },
  }))

  // Load persisted model preference
  useEffect(() => {
    const savedModel = localStorage.getItem('secondbrain_model')
    if (savedModel && AVAILABLE_MODELS.some(m => m.id === savedModel)) {
      setSelectedModel(savedModel)
    }
  }, [])

  // Initialize Vercel AI SDK useChat
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        conversationId,
        model: selectedModel,
      },
    }),
    messages: sdkInitialMessages,
  })

  const isLoading = status === 'submitted'

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (input.trim() === '' || isLoading) return
    sendMessage({
      parts: [
        {
          type: 'text',
          text: input,
        },
      ],
    })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('secondbrain_model', modelId)
  }

  const selectedModelDetails = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0]

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-neutral-900">
      {/* Header bar */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-neutral-850 bg-neutral-950/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-neutral-300">Agent Configuration</span>
        </div>

        {/* Model Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-neutral-850 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-805 hover:text-white cursor-pointer h-9 shadow-sm transition-all duration-200">
            <span className="mr-1.5">{selectedModelDetails.icon}</span>
            {selectedModelDetails.name}
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-850 text-neutral-300">
            {AVAILABLE_MODELS.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className="flex items-center justify-between gap-6 cursor-pointer focus:bg-neutral-800 focus:text-white"
              >
                <div className="flex items-center gap-2">
                  <span>{model.icon}</span>
                  <span>{model.name}</span>
                </div>
                {selectedModel === model.id && <Check className="h-4 w-4 text-violet-400" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-4">
            <div className="rounded-full bg-neutral-950 p-6 border border-neutral-800 text-violet-400 shadow-xl">
              <Brain className="h-10 w-10 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ask your SecondBrain</h2>
              <p className="text-sm text-neutral-500 mt-1.5 leading-relaxed">
                Type a question below to perform semantic retrieval against all your indexed PDF, TXT, and Markdown files.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message: UIMessage) => {
            const isUser = message.role === 'user'
            const sources = (message.metadata as any)?.sources || []
            const messageText = getMessageText(message)

            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 max-w-3xl mx-auto rounded-2xl p-4 transition-all duration-200 border",
                  isUser
                    ? "bg-neutral-950/20 border-transparent justify-end"
                    : "bg-neutral-950/40 border-neutral-850/50"
                )}
              >
                {!isUser && (
                  <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900 text-violet-400 shrink-0">
                    <AvatarFallback className="bg-neutral-900 text-violet-400">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1 space-y-3 overflow-hidden">
                  <div className="text-xs font-semibold text-neutral-500">
                    {isUser ? 'You' : 'SecondBrain AI'}
                  </div>
                  
                  {isUser ? (
                    <p className="text-sm leading-7 text-neutral-200 whitespace-pre-wrap">
                      {messageText}
                    </p>
                  ) : (
                    <MarkdownRenderer content={messageText} />
                  )}

                  {/* Document Sources Cards */}
                  {!isUser && sources.length > 0 && (
                    <div className="pt-3 border-t border-neutral-850 space-y-2">
                      <div className="text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        Retrieved Context Sources:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sources.map((src: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg bg-neutral-900 border border-neutral-800 p-2.5 flex items-start gap-2.5"
                            title={src.content}
                          >
                            <FileText className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium text-neutral-300 truncate">
                                {src.documentName}
                              </span>
                              <span className="text-[10px] text-neutral-500 mt-0.5">
                                Chunk {src.chunkIndex} • Similarity {(src.similarity * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900 text-cyan-400 shrink-0">
                    <AvatarFallback className="bg-neutral-900 text-cyan-400 font-medium">
                      ME
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          })
        )}

        {/* Loading Spinner */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-4 max-w-3xl mx-auto rounded-2xl p-4 bg-neutral-950/40 border border-neutral-850/50">
            <Avatar className="h-9 w-9 border border-neutral-800 bg-neutral-900 text-violet-400 shrink-0">
              <AvatarFallback className="bg-neutral-900 text-violet-400">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              Retrieving context and thinking...
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex gap-3 max-w-3xl mx-auto rounded-xl p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p className="text-xs text-red-500 mt-0.5">{error.message || 'Check your internet connection and API keys configuration.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Input container bar */}
      <div className="p-4 md:p-6 border-t border-neutral-850 bg-neutral-950/20 shrink-0">
        <div className="max-w-3xl mx-auto relative flex items-center bg-neutral-950 border border-neutral-800 rounded-2xl focus-within:border-violet-500/50 shadow-lg pr-3">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type a message or question about your knowledge base..."
            rows={1}
            className="flex-1 bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder-neutral-500 min-h-[52px] py-4 px-4 resize-none scrollbar-none"
          />
          <Button
            type="button"
            size="icon"
            disabled={isLoading || input.trim() === ''}
            onClick={() => {
              const fakeFormEvent = {
                preventDefault: () => {},
              } as React.FormEvent<HTMLFormElement>
              handleSubmit(fakeFormEvent)
            }}
            className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-900 disabled:text-neutral-600 text-white shrink-0 shadow transition-colors duration-200"
          >
            <SendHorizontal className="h-4.5 w-4.5" />
          </Button>
        </div>
        <div className="text-center text-[10px] text-neutral-600 mt-2">
          SecondBrain AI searches for vectors using cosine similarity matching. Results depends on uploaded doc quality.
        </div>
      </div>
    </div>
  )
}
