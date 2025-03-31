"use client"

import { useState, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Input } from "@/components/ui/input"

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchInitialAnalysis() {
      try {
        const response = await fetch('/api/chat')
        const data = await response.json()
        if (data.success && data.summary) {
          setMessages([{
            role: 'assistant',
            content: `📊 Summary of Question Analysis:\n\n${data.summary.fileAnalysis}`
          }])
        }
      } catch (error) {
        console.error('Failed to fetch initial analysis:', error)
      }
    }
    fetchInitialAnalysis()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })
      
      const data = await response.json()
      if (data.success && data.summary) {
        setMessages([{
          role: 'assistant',
          content: `Summary of Questions Analysis: \n\n${data.summary.fileAnalysis}`
        }])
      }
      
    } catch (error) {
      console.error('Chat error:', error)
      alert('Failed to get response')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">AI Study Assistant</h1>
          
          <Card className="h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className={`p-2 rounded-full ${
                    message.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {message.role === 'assistant' ? (
                      <Bot className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div className={`rounded-lg p-4 max-w-[80%] ${
                    message.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="rounded-lg p-4 max-w-[80%] bg-primary/10">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your study materials..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}