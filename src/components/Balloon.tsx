'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMsg } from '@/lib/providers/chat/types';
import ExerciseCard from '@/components/ExerciseCard';
import { InkChat } from '@/components/icons/InkIcons';

interface BalloonProps {
  messages: ChatMsg[];
  onSend: (text: string) => Promise<void>;
  isLoading: boolean;
  /** T8.4 — daftar latihan untuk deteksi mention + tombol mulai di kartu. */
  exercises?: import('@/lib/schedule/parser').NormalizedExercise[];
  onOpenExercise?: (exerciseName: string) => void;
}

/**
 * T8.4 — Starter prompts: muncul saat belum ada obrolan. Bukan saran generik,
 * diambil dari konteks nyata (jadwal hari ini) saat dipakai.
 */
const STARTER_PROMPTS = [
  'Apa saja yang harus aku lakukan hari ini?',
  'Bantuin aku dengan gerakan latihan hari ini',
  'Ide menu makan tinggi protein untuk aku?',
  'Aku capek banget hari ini, harus tetap latihan?',
];

export default function Balloon({ messages, onSend, isLoading, exercises, onOpenExercise }: BalloonProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Hitung pesan untuk membedakan "pesan baru" vs "mount pertama".
  // Saat mount/switch tab, jangan scroll — agar reset scroll di nav tidak
  // dikalahkan dan header sticky tidak menutupi konten atas.
  const messageCountRef = useRef(0);
  const messageCount = messages.length;

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    const isFirstRender = messageCountRef.current === 0;
    const hasNewMessages = messageCount > messageCountRef.current;
    messageCountRef.current = messageCount;
    if (isFirstRender || !hasNewMessages) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

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
    <div className="neo-box p-4 bg-paper space-y-3">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-ink/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="neo-box-sm p-1.5 bg-ink text-paper">
            <InkChat className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black uppercase text-ink">Asisten AI</h3>
        </div>
        <span className="text-[11px] font-mono text-ink/60">Zenn AI</span>
      </div>

      {/* Messages container */}
      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-3 border-2 border-dashed border-ink/25 p-4">
            <p className="text-xs font-black uppercase text-ink/70 tracking-wider">
              Belum ada obrolan
            </p>
            <p className="text-[11px] font-medium text-ink/60 leading-relaxed">
              Mulai dengan salah satu pertanyaan di bawah, atau ketik pertanyaanmu sendiri.
            </p>
            <div className="flex flex-col gap-2">
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSend(p)}
                  disabled={isLoading}
                  className="neo-btn-sm bg-paper text-ink px-3 py-2 text-[11px] font-bold text-left hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
                          className={`max-w-[80%] p-2.5 rounded-lg border-2 text-xs font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-ink text-paper border-ink rounded-tr-sm'
                  : 'bg-canvas text-ink border-ink/20 rounded-tl-sm'
              }`}
                        >
              {msg.text}

              {/* T8.4 — kartu latihan jika jawaban membahas gerakan jadwal */}
              {msg.attachment && exercises && onOpenExercise && (() => {
                const ex = exercises.find((e) => e.nama === msg.attachment!.exerciseName);
                if (!ex) return null;
                return (
                  <div className="mt-2 -mx-1 -mb-1.5">
                    <ExerciseCard
                      exercise={ex}
                      compact
                      onStart={() => onOpenExercise(ex.nama)}
                    />
                  </div>
                );
              })()}

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
          className="flex-1 neo-box-sm px-3 py-2 text-xs font-medium bg-paper border-ink/20 focus:border-ink focus:outline-none transition-colors"
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
      <div className="text-[11px] text-ink/60 font-medium leading-relaxed bg-ink/5 p-2 rounded border border-ink/10">
        • Asisten AI Zenn — bantuan untuk latihan, makan, tidur<br/>
        • Bukan pengganti dokter, ahli gizi, atau konselor<br/>
        • Jawaban berdasarkan konteks harian dan data lokal<br/>
        • Hindari info medis darurat: konsultasikan dengan tenaga kesehatan
      </div>
    </div>
  );
}