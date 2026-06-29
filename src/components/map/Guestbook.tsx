'use client'

import { useEffect, useState, useRef } from 'react'
import type { GuestbookEntry } from '@/lib/db'

const QUICK_EMOJIS = ['❤️', '🎉', '😍', '🔥', '👏', '🚂']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Guestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  async function fetchEntries() {
    try {
      const res = await fetch('/api/guestbook')
      if (res.ok) {
        const data = (await res.json()) as GuestbookEntry[]
        setEntries(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEntries()
  }, [])

  async function handleQuickReact(emoji: string) {
    if (reactingEmoji) return
    setReactingEmoji(emoji)
    try {
      await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      await fetchEntries()
    } finally {
      setReactingEmoji(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameRef.current?.value ?? '',
          message,
        }),
      })
      if (nameRef.current) nameRef.current.value = ''
      setMessage('')
      await fetchEntries()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Section header */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          ✉️ Guestbook
        </div>

        {/* Quick reactions */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => void handleQuickReact(emoji)}
              disabled={!!reactingEmoji}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-base leading-none shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Sign form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
          <input
            ref={nameRef}
            type="text"
            placeholder="Your name (optional)"
            maxLength={60}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message…"
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-sm placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!message.trim() || submitting}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Signing…' : 'Sign the guestbook'}
          </button>
        </form>
      </div>

      <div className="border-t border-gray-100" />

      {/* Entry list */}
      <div className="px-4 py-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-400">No messages yet — be the first!</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  {entry.emoji && (
                    <span className="mt-0.5 text-lg leading-none">{entry.emoji}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-medium text-gray-700">
                        {entry.name ?? 'Anonymous'}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                    {entry.message && (
                      <p className="mt-0.5 break-words text-sm text-gray-600">
                        {entry.message}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
