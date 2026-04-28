"use client"

import type { SessionUnit } from "@/lib/openings"
import { CheckCircle2, XCircle, RefreshCw, LogOut, Timer } from "lucide-react"

export type UnitResult = {
  unit: SessionUnit
  status: "won" | "failed"
  seconds: number
  pointsAwarded: number
}

type Props = {
  results: UnitResult[]
  totalSeconds: number
  sessionPoints: number
  scoringEnabled: boolean
  onOk: () => void
  onExit: () => void
  hasMoreOpenings: boolean
  isSaving?: boolean
}

function unitTitle(u: SessionUnit): string {
  return u.kind === "single" ? u.opening.name : `${u.short.name} → ${u.long.name}`
}

export function ResultsScreen({
  results,
  totalSeconds,
  sessionPoints,
  scoringEnabled,
  onOk,
  onExit,
  hasMoreOpenings,
  isSaving = false,
}: Props) {
  const won = results.filter((r) => r.status === "won")
  const failed = results.filter((r) => r.status === "failed")

  return (
    <div className="screen-in min-h-dvh bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Итоги сессии
            </span>
            <h1 className="text-xl font-semibold md:text-2xl">Результаты</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              <Timer className="h-3.5 w-3.5" />
              {Math.max(0, totalSeconds).toFixed(1)}с
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                scoringEnabled ? "bg-success/15 text-success" : "bg-muted text-foreground"
              }`}
            >
              {scoringEnabled ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="text-success">+{Math.round(sessionPoints)} очков</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Переигрывание — без очков
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        {!hasMoreOpenings && (
          <div className="flex flex-col items-end gap-2">
            {!hasMoreOpenings && (
              <p className="text-xs font-semibold text-error">
                Больше доступных дебютов нет.
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">Пройдено</div>
            {won.length === 0 ? (
              <div className="text-sm text-muted-foreground">Пока нет.</div>
            ) : (
              <ul className="space-y-2">
                {won.map((r) => {
                  const unitId = r.unit.kind === "single" ? r.unit.opening.id : `${r.unit.short.id}-${r.unit.long.id}`
                  return (
                    <li key={unitId} className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="truncate text-sm">{unitTitle(r.unit)}</span>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {r.seconds.toFixed(1)}с
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 text-sm font-semibold">Не пройдено</div>
            {failed.length === 0 ? (
              <div className="text-sm text-muted-foreground">Отлично! Ошибок нет.</div>
            ) : (
              <ul className="space-y-2">
                {failed.map((r) => {
                  const unitId = r.unit.kind === "single" ? r.unit.opening.id : `${r.unit.short.id}-${r.unit.long.id}`
                  return (
                    <li key={unitId} className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                        <span className="truncate text-sm">{unitTitle(r.unit)}</span>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {r.seconds.toFixed(1)}с
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onExit}
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-error/60 bg-error px-4 text-sm font-semibold text-error-foreground transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
            <button
              type="button"
              onClick={onOk}
              disabled={!hasMoreOpenings || isSaving}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
            >
              <RefreshCw className="h-4 w-4" />
              ОК
            </button>
          </div>
      </main>
    </div>
  )
}

