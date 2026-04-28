"use client"

import { useState } from "react"
import { Spinner } from "./ui/spinner"

type Props = {
  onAuth: (email: string, password: string, mode: "login" | "register") => Promise<string | null>
  onGoogleLogin: () => Promise<string | null>
}

export function AuthScreen({ onAuth, onGoogleLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    const result = await onAuth(email.trim(), password, mode)
    setLoading(false)
    if (result) {
      setError(result)
      return
    }
    if (mode === "register") {
      setNotice("Регистрация успешна. Проверьте почту для подтверждения, если это требуется в проекте Supabase.")
    }
  }

  async function handleGoogleLoginClick() {
    setError(null)
    setNotice(null)
    setLoading(true)
    const result = await onGoogleLogin()
    if (result) {
      setError(result)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
              RANDOM CHESS DEBUT
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? "Войдите, чтобы продолжить тренировку."
                : "Создайте аккаунт, чтобы сохранять свои дебюты."}
            </p>
          </div>

          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login")
                  setError(null)
                  setNotice(null)
                }}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground hover:text-foreground"
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register")
                  setError(null)
                  setNotice(null)
                }}
                className={`rounded-full px-6 py-1.5 text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground hover:text-foreground"
                }`}
              >
                Регистрация
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="space-y-2">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль (минимум 6 символов)"
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Spinner className="h-4 w-4" />}
              {loading ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">Или через</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLoginClick}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background text-sm font-semibold transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner className="h-4 w-4" /> : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Google
          </button>

          {error && (
            <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-center">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary text-center">
              {notice}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
