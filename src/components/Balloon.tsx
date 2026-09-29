'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMsg } from '@/lib/providers/chat/types';

interface BalloonProps {
  messages: ChatMsg[];
  onSend: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function Balloon({ messages, onSend, isLoading }: BalloonProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (text && !isLoading) {
      setInput('');
      await onSend(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim() && !isLoading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="neo-box p-4 bg-[#ffffff] space-y-3">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-[#09090b]/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="neo-box-sm p-1.5 bg-[#09090b] text-[#ffffff]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-sm font-black uppercase text-[#09090b]">Asisten AI</h3>
        </div>
        <span className="text-[11px] font-mono text-[#09090b]/60">Zenn AI</span>
      </div>

      {/* Messages container */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
                          className={`max-w-[80%] p-2.5 rounded-lg border-2 text-xs font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#09090b] text-[#ffffff] border-[#09090b] rounded-tr-sm'
                  : 'bg-[#f4f4f5] text-[#09090b] border-[#09090b]/20 rounded-tl-sm'
              }`}
                        >
              {msg.text}
              {msg.timestamp && (
                <div className="text-[11px] opacity-70 mt-1 font-mono text-right">
                  {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ketik pertanyaan Anda..."
          className="flex-1 neo-box-sm px-3 py-2 text-xs font-medium bg-[#ffffff] border-[#09090b]/20 focus:border-[#09090b] focus:outline-none transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="neo-btn-black px-4 py-2 text-xs font-black uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Mengirim...' : 'Kirim'}
        </button>
      </form>

      {/* Disclaimer */}
      <div className="text-[11px] text-[#09090b]/60 font-medium leading-relaxed bg-[#09090b]/5 p-2 rounded border border-[#09090b]/10">
        • Asisten AI Zenn — bantuan untuk latihan, makan, tidur<br/>
        • Bukan pengganti dokter, ahli gizi, atau konselor<br/>
        • Jawaban berdasarkan konteks harian dan data lokal<br/>
        • Hindari info medis darurat: konsultasikan dengan tenaga kesehatan
      </div>
    </div>
  );
}