'use client';

import { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage, PortfolioInput } from '@/lib/types';

const SUGGESTED = [
  'Why is this the #1 recommendation for me?',
  'How does my savings rate compare to the 20% target?',
  'What would happen if I increased my monthly contributions by $500?',
  'What is my biggest portfolio risk right now?',
  'How does my emergency fund affect my goal probability?',
  'Why was tax-loss harvesting scored where it was?',
];

interface Props {
  analysis: AnalysisResult;
  portfolio: PortfolioInput;
}

export default function ChatPanel({ analysis, portfolio }: Props) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ analysis, portfolio, messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Chat failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="card reveal">
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius) var(--radius) 0 0',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          NE
        </div>
        <div>
          <p
            className="font-semibold text-sm"
            style={{ color: 'var(--text)' }}
          >
            Ask about your portfolio
          </p>
          <p
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Powered by your analysis — no invented numbers
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="px-6 py-4 space-y-4 min-h-[120px] max-h-[420px] overflow-y-auto">

        {messages.length === 0 && (
          <div className="space-y-3">
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-xs rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-2xl rounded-br-sm'
                  : 'rounded-2xl rounded-bl-sm'
              }`}
              style={
                msg.role === 'user'
                  ? { backgroundColor: 'var(--accent)', color: '#ffffff' }
                  : {
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }
              }
            >
              {msg.content.split('\n').map((line, j) => (
                <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor: 'var(--text-muted)' }} />
              <span className="w-1.5 h-1.5 rounded-full pulse-dot-2" style={{ backgroundColor: 'var(--text-muted)' }} />
              <span className="w-1.5 h-1.5 rounded-full pulse-dot-3" style={{ backgroundColor: 'var(--text-muted)' }} />
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-6 py-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex gap-2 items-end">
          <textarea
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your portfolio..."
            disabled={loading}
            className="input flex-1 resize-none disabled:opacity-50"
            style={{ minHeight: '38px', maxHeight: '120px' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)' }}
            aria-label="Send"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p
          className="text-xs mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Press Enter to send · Shift+Enter for new line · Not financial advice
        </p>
      </div>
    </div>
  );
}
