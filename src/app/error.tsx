'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <p className="text-4xl">🚂💤</p>
        <h1 className="mt-3 text-lg font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          This is usually temporary. Try again in a moment.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
