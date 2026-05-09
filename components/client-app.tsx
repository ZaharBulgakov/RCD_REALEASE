"use client"

import { CHESS_THEMES, type ChessTheme } from "@/lib/themes"
import { useEffect, useState, useCallback, useRef, startTransition } from "react"
import { HomeScreen } from "./home-screen"
import { AddOpeningDialog } from "./add-opening-dialog"
import { DeletionHistoryDialog } from "./deletion-history-dialog"
import { StartSessionDialog, type SessionConfig } from "./start-session-dialog"
import { CustomSessionDialog, type CustomSessionConfig } from "./custom-session-dialog"
import { GameScreen } from "./game-screen"
import { NameGameScreen } from "./name-game-screen"
import { StudyScreen } from "./study-screen"
import { AuthScreen } from "./auth-screen"
import { ResultsScreen, type UnitResult } from "./results-screen"
import { OpeningDetailScreen } from "./opening-detail-screen"
import { PartyDetailScreen } from "./party-detail-screen"
import {
  buildSession,
  parsePgn,
  type Opening,
  type Collection,
  type Party,
  type SessionUnit,
  OPENINGS_LIMIT,
  COLLECTIONS_LIMIT,
} from "@/lib/openings"
import {
  openingIdsOfUnit,
  maybeUpdateRecordLogic,
  calcPointsAwarded,
} from "@/lib/app-logic"
import { supabase } from "@/src/supabaseClient"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Spinner } from "./ui/spinner"

type Screen =
  | { name: "home" }
  | {
    name: "game"
    session: SessionUnit[]
    color: "white" | "black" | "random"
    mode: "moves" | "names"
    isCustom?: boolean
    advanced?: boolean
    isRandomColor?: boolean
    collectionOpeningIds?: string[] | null  // добавь эту строку
    }
  | {
      name: "results"
      results: UnitResult[]
      totalSeconds: number
      sessionPoints: number
      scoringEnabled: boolean
      color: "white" | "black" | "random"
      targetCount: number
      mode: "moves" | "names"
      advanced?: boolean
      isCustom?: boolean
      isRandomColor?: boolean
      collectionOpeningIds?: string[] | null
    }
  | { name: "study"; opening: Opening; fromHistory?: boolean; initialOrientation?: "white" | "black" }
  | { name: "detail"; opening: Opening }
  | { name: "party"; party: Party; opening: Opening }

type DeletionLog = {
  id: string
  opening_id: string
  opening_name: string
  opening_pgn: string
  opening_description: string
  deleted_at: string
}
function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch (e) {
    console.warn("crypto.randomUUID failed, using fallback", e)
  }
  // UUID v4 fallback for non-HTTPS environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === "x" ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function ClientApp() {
  const [globalFinishedIds, setGlobalFinishedIds] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [openings, setOpenings] = useState<Opening[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [record, setRecord] = useState<number | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: "home" })
  const screenRef = useRef<Screen>({ name: "home" })
  const [addOpen, setAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingOpening, setEditingOpening] = useState<Opening | null>(null)
  const [addingPartyToId, setAddingPartyToId] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customInitialSelection, setCustomInitialSelection] = useState<string[]>([])
  const [scoreEnabled, setScoreEnabled] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deletionLogs, setDeletionLogs] = useState<DeletionLog[]>([])
  async function handleClearAllData() {
    if (!user) return
    if (!confirm("Вы уверены, что хотите удалить ВСЕ свои данные? Это действие необратимо.")) return
    
    setIsSaving(true)
    try {
      // Delete from Supabase
      await Promise.all([
        supabase.from("openings").delete().eq("user_id", user.id),
        supabase.from("collections").delete().eq("user_id", user.id),
        supabase.from("records").delete().eq("user_id", user.id),
        supabase.from("deletion_logs").delete().eq("user_id", user.id)
      ])

      // Clear local storage fallbacks
      localStorage.removeItem(`rcd:openings:${user.id}`)
      localStorage.removeItem(`rcd:collections:${user.id}`)
      localStorage.removeItem(`rcd:record:${user.id}`)
      localStorage.removeItem(`rcd:deletion_logs:${user.id}`)

      // Reset state
      setOpenings([])
      setCollections([])
      setRecord(0)
      setDeletionLogs([])
      
      toast.success("Все данные удалены")
    } catch (err) {
      console.error("Error clearing data:", err)
      toast.error("Ошибка при удалении данных")
    } finally {
      setIsSaving(false)
    }
  }

  const setScreenSafe = useCallback((s: Screen) => {
    screenRef.current = s
    // startTransition помечает смену экрана как некритичное обновление —
    // React не блокирует браузер во время рендера нового экрана
    startTransition(() => {
      setScreen(s)
    })
  }, [])
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [collectionOpeningIds, setCollectionOpeningIds] = useState<string[] | null>(null)

  const [language, setLanguage] = useState<"ru" | "en">(() => {
    if (typeof window === "undefined") return "ru"
    return (localStorage.getItem("rcd_language") as "ru" | "en") || "ru"
  })

  const [pgnFormat, setPgnFormat] = useState<"standard" | "short">(() => {
    if (typeof window === "undefined") return "standard"
    return (localStorage.getItem("rcd_pgn_format") as "standard" | "short") || "standard"
  })

  // Загрузка сохранённой темы
  const [currentTheme, setCurrentTheme] = useState<ChessTheme>(() => {
    if (typeof window === "undefined") return CHESS_THEMES[0]
    const saved = localStorage.getItem("rcd_board_theme")
    if (saved) {
      const found = CHESS_THEMES.find(t => t.id === saved)
      if (found) return found
    }
    return CHESS_THEMES[0]
  })

  useEffect(() => {
    if (currentTheme.systemDesign) {
      const sd = currentTheme.systemDesign
      const root = document.documentElement.style

      // Core scale
      root.setProperty("--color-accent", sd.accent)
      root.setProperty("--color-accent-hover", sd.accentHover)
      root.setProperty("--color-accent-muted", sd.accentMuted)
      root.setProperty("--color-gold", sd.gold)
      root.setProperty("--color-gold-muted", sd.goldMuted)

      root.setProperty("--gray-950", sd.gray950)
      root.setProperty("--gray-900", sd.gray900)
      root.setProperty("--gray-850", sd.gray850)
      root.setProperty("--gray-800", sd.gray800)
      root.setProperty("--gray-700", sd.gray700)
      root.setProperty("--gray-600", sd.gray600)
      root.setProperty("--gray-400", sd.gray400)
      root.setProperty("--gray-200", sd.gray200)
      root.setProperty("--gray-50", sd.gray50)

      root.setProperty("--color-success", sd.success)
      root.setProperty("--color-success-muted", sd.successMuted)
      root.setProperty("--color-error", sd.error)
      root.setProperty("--color-error-muted", sd.errorMuted)
      root.setProperty("--color-warning", sd.warning)
      root.setProperty("--color-info", sd.info)

      root.setProperty("--board-light", sd.boardLight)
      root.setProperty("--board-dark", sd.boardDark)
      root.setProperty("--board-highlight", sd.boardHighlight)
      root.setProperty("--board-hint", sd.boardHint)
      root.setProperty("--board-error", sd.boardError)

      // Map to semantic variables to ensure they are overridden even if .light/.dark classes are present
      root.setProperty("--background", sd.gray900)
      root.setProperty("--foreground", sd.gray50)
      root.setProperty("--card", sd.gray850)
      root.setProperty("--card-foreground", sd.gray50)
      root.setProperty("--popover", sd.gray850)
      root.setProperty("--popover-foreground", sd.gray50)
      root.setProperty("--primary", sd.accent)
      root.setProperty("--secondary", sd.gray800)
      root.setProperty("--muted", sd.gray800)
      root.setProperty("--muted-foreground", sd.gray400)
      root.setProperty("--accent", sd.gray800)
      root.setProperty("--accent-foreground", sd.gray50)
      root.setProperty("--primary", sd.accent)
      root.setProperty("--primary-foreground", sd.gray950)
      root.setProperty("--success", sd.success)
      root.setProperty("--success-foreground", "#ffffff")
      root.setProperty("--error", sd.error)
      root.setProperty("--error-foreground", "#ffffff")
      root.setProperty("--destructive", sd.error)
      root.setProperty("--destructive-foreground", "#ffffff")

      root.setProperty("--border", sd.gray700)
      root.setProperty("--input", sd.gray700)
      root.setProperty("--ring", sd.accent)
      root.setProperty("--card-glow", sd.cardGlow ?? "transparent")

      root.setProperty("--board-light", sd.boardLight)
      root.setProperty("--board-dark", sd.boardDark)
    }
  }, [currentTheme])

  // Load session and subscribe to auth changes.
  useEffect(() => {
    let alive = true
    let previousUser: User | null = null

    const applyAuthState = async (currentUser: User | null) => {
      if (!alive) return
      setUser(currentUser)
      if (currentUser) {
        const ok = await loadOpeningsFromDb(currentUser.id)
        if (ok) clearLegacyLocalStorageOnce(currentUser.id)
        await loadRecordFromDb(currentUser.id)
        await loadCollectionsFromDb(currentUser.id)
        await loadPartiesFromDb(currentUser.id)
        await loadDeletionLogsFromDb(currentUser.id)
        // Only reset to home if user was previously logged out (not just auth refresh)
        // or if this is the initial load. Preserve all active states during tab switches.
        if (!previousUser || screenRef.current.name === "home") {
          setScreenSafe({ name: "home" })
        }
        // Additional protection: if we're in any active state (game, study, or edit), don't reset
        else if (screenRef.current.name === "game" || screenRef.current.name === "study" || (editingOpening && addOpen)) {
          // Preserve current state - don't reset
        }
      } else {
        setOpenings([])
        setCollections([])
        setParties([])
        setRecord(null)
        setScreenSafe({ name: "home" })
      }
      previousUser = currentUser
      setLoading(false)
      setMounted(true)
      clearTimeout(fallbackTimer)
    }

    const fallbackTimer = setTimeout(() => {
      if (!alive) return
      setLoading(false)
      setMounted(true)
    }, 3000)

supabase.auth
  .getSession()
  .then(async ({ data, error }) => {
    // Обработка невалидного refresh token
    if (error?.message?.includes('Refresh Token Not Found') || 
        error?.message?.includes('Invalid Refresh Token')) {
      await supabase.auth.signOut()
      if (!alive) return
      setUser(null)
      setOpenings([])
      setLoading(false)
      setMounted(true)
      clearTimeout(fallbackTimer)
      return
    }   // ← закрывает if (error...)
  })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyAuthState(session?.user ?? null).catch(() => {
        if (!alive) return
        setLoading(false)
        setMounted(true)
        clearTimeout(fallbackTimer)
      })
    })

    return () => {
      alive = false
      clearTimeout(fallbackTimer)
      subscription.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadOpeningsFromDb(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("openings")
      .select("id, name, description, pgn, created_at, leading_side, parent_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) {
      toast.error(`Ошибка при загрузке дебютов: ${error.message}`)
      return false
    }

    if (!data || data.length === 0) {
      setOpenings([])
      return true
    }

    const mapped: Opening[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      pgn: row.pgn,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      leadingSide: (row.leading_side ?? "random") as import("@/lib/openings").LeadingSide,
      parentId: row.parent_id,
    }))
    // CRITICAL: fully replace local state with Supabase snapshot.
    setOpenings(mapped)
    return true
  }

  async function loadPartiesFromDb(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("parties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("Error loading parties:", error)
      return false
    }

    const mapped: Party[] = data.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description || "",
      pgn: row.pgn,
      openingId: row.opening_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    }))
    setParties(mapped)
    return true
  }

  async function handleAddParty(p: Partial<Party>): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    if (!addingPartyToId) return "Не указан дебют для партии"

    setIsSaving(true)
    try {
      const id = generateId()
      const { error } = await supabase.from("parties").insert({
        id,
        user_id: user.id,
        opening_id: addingPartyToId,
        name: p.name,
        description: p.description,
        pgn: p.pgn,
        created_at: new Date().toISOString()
      })

      if (error) {
        toast.error(`Ошибка при сохранении партии: ${error.message}`)
        return error.message
      }

      const newParty: Party = {
        id,
        userId: user.id,
        openingId: addingPartyToId,
        name: p.name || "",
        description: p.description || "",
        pgn: p.pgn || "",
        createdAt: Date.now()
      }

      setParties(prev => [newParty, ...prev])
      toast.success("Партия добавлена")
      return null
    } finally {
      setIsSaving(false)
      setAddingPartyToId(null)
    }
  }

  async function handleEditParty(p: Partial<Party>): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    if (!p.id) return "ID партии не указан"

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("parties")
        .update({
          name: p.name,
          description: p.description,
          pgn: p.pgn
        })
        .eq("id", p.id)
        .eq("user_id", user.id)

      if (error) {
        toast.error(`Ошибка при обновлении партии: ${error.message}`)
        return error.message
      }

      setParties(prev => prev.map(item => item.id === p.id ? { ...item, ...p } : item))
      toast.success("Партия обновлена")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  function clearLegacyLocalStorageOnce(userId: string) {
    if (typeof window === "undefined") return
    const marker = `rcd:localStorageCleared:v1:${userId}`
    try {
      if (window.localStorage.getItem(marker) === "1") return
      // IMPORTANT: Supabase stores auth session in localStorage by default.
      // So we must NOT clear everything. Remove only legacy app keys.
      const legacyKeys = [
        "openings",
        "rcd_openings",
        "RCD_OPENINGS",
        "debuts",
        "RCD_DEBUTS",
        "randomChessDebut.openings",
      ]
      for (const k of legacyKeys) window.localStorage.removeItem(k)
      // Also remove our own namespaced keys (but keep supabase-* keys intact).
      const toDelete: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (!k) continue
        if (k.startsWith("rcd:") || k.startsWith("randomChessDebut:")) {
          toDelete.push(k)
        }
      }
      for (const k of toDelete) window.localStorage.removeItem(k)
      window.localStorage.setItem(marker, "1")
    } catch {
      // ignore
    }
  }

  async function loadRecordFromDb(userId: string) {
    try {
      const { data, error } = await supabase
        .from("records")
        .select("best_score")
        .eq("user_id", userId)
        .maybeSingle()
      if (error) {
        const isNotFound = 
          error.code === 'PGRST116' || 
          error.code === '42P01' || 
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('could not find');

        if (isNotFound) {
          console.info("💡 Таблица 'records' не найдена в Supabase. Личный рекорд будет сохранен только в текущей сессии.")
        } else {
          console.warn("Records table not found in Supabase. Please create 'records' table. Error:", error.message)
        }
        setRecord(0)
        return
      }
      setRecord(typeof data?.best_score === "number" ? data.best_score : data?.best_score ? Number(data.best_score) : 0)
    } catch (err) {
      console.error("Exception loading record:", err)
      setRecord(0)
    }
  }

  async function loadCollectionsFromDb(userId: string) {
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      
      if (error) {
        const isNotFound = 
          error.code === 'PGRST116' || 
          error.code === '42P01' || 
          error.message?.toLowerCase().includes('not found') ||
          error.message?.toLowerCase().includes('could not find');

        if (isNotFound) {
          console.info("💡 Таблица 'collections' не найдена в Supabase. Используется локальное хранилище.")
        } else {
          console.warn("Ошибка при загрузке коллекций:", error.message)
        }
        // Try local storage fallback for collections if table missing
        const local = localStorage.getItem(`rcd:collections:${userId}`)
        if (local) {
          try {
            setCollections(JSON.parse(local))
          } catch (e) {
            console.error("Failed to parse local collections", e)
          }
        }
        return
      }

      const mapped: Collection[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        openingIds: Array.isArray(row.opening_ids) ? row.opening_ids : [],
        createdAt: new Date(row.created_at).getTime(),
      }))
      setCollections(mapped)
    } catch (err) {
      console.error("Error loading collections:", err)
    }
  }

  async function handleCreateCollection(name: string, openingIds: string[]): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    if (collections.length >= COLLECTIONS_LIMIT) {
      toast.error(`Достигнут лимит коллекций (${COLLECTIONS_LIMIT})`)
      return "Лимит коллекций исчерпан"
    }
    setIsSaving(true)
    try {
      const newCollection = {
        id: generateId(),
        user_id: user.id,
        name,
        description: "",
        opening_ids: openingIds,
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("collections").insert(newCollection)

      if (error) {
        // Fallback to local storage if table missing
        const localCollections: Collection[] = [
          {
            id: newCollection.id,
            name: newCollection.name,
            description: "",
            openingIds: newCollection.opening_ids,
            createdAt: new Date(newCollection.created_at).getTime(),
          },
          ...collections
        ]
        setCollections(localCollections)
        localStorage.setItem(`rcd:collections:${user.id}`, JSON.stringify(localCollections))
        toast.success("Коллекция создана (сохранено локально)")
        return null
      }

      setCollections(prev => [{
        id: newCollection.id,
        name: newCollection.name,
        description: "",
        openingIds: newCollection.opening_ids,
        createdAt: new Date(newCollection.created_at).getTime(),
      }, ...prev])
      toast.success("Коллекция создана")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCollection(id: string) {
    if (!user) return
    setIsSaving(true)
    try {
      // Find collection for history log
      const collection = collections.find(c => c.id === id)
      
      const { error } = await supabase.from("collections").delete().eq("id", id).eq("user_id", user.id)
      
      if (!error && collection) {
        try {
          await supabase.from("deletion_logs").insert({
            user_id: user.id,
            opening_id: collection.id, // using collection id as reference
            opening_name: `[Коллекция] ${collection.name}`,
            opening_pgn: JSON.stringify(collection.openingIds), // Store IDs here for restoration
            opening_description: `Удалена коллекция, содержавшая ${collection.openingIds.length} дебютов`,
            deleted_at: new Date().toISOString(),
          })
          // Refresh logs locally
          await loadDeletionLogsFromDb(user.id)
        } catch (e) {
          console.error("Failed to log collection deletion", e)
        }
      }

      setCollections(prev => prev.filter(c => c.id !== id))
      if (activeCollectionId === id) setActiveCollectionId(null)
      
      // Also update local storage fallback
      const local = localStorage.getItem(`rcd:collections:${user.id}`)
      if (local) {
        const parsed = JSON.parse(local).filter((c: any) => c.id !== id)
        localStorage.setItem(`rcd:collections:${user.id}`, JSON.stringify(parsed))
      }

      if (!error) toast.success("Коллекция удалена")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateCollection(id: string, updates: Partial<Collection>) {
    if (!user) return
    
    if (updates.openingIds && updates.openingIds.length > OPENINGS_LIMIT) {
      toast.error(`Лимит дебютов в коллекции — ${OPENINGS_LIMIT}`)
      return
    }

    setIsSaving(true)
    try {
      const collection = collections.find(c => c.id === id)
      const dbUpdates: any = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.openingIds !== undefined) dbUpdates.opening_ids = updates.openingIds

      const { error } = await supabase
        .from("collections")
        .update(dbUpdates)
        .eq("id", id)
        .eq("user_id", user.id)

      if (!error && collection && updates.openingIds) {
        // Check if this was a removal (independent delete from collection)
        const removedIds = collection.openingIds.filter(oid => !updates.openingIds?.includes(oid))
        if (removedIds.length > 0) {
          for (const rid of removedIds) {
            const opening = openings.find(o => o.id === rid)
            if (opening) {
              await supabase.from("deletion_logs").insert({
                user_id: user.id,
                opening_id: opening.id,
                opening_name: `[Из коллекции ${collection.name}] ${opening.name}`,
                opening_pgn: opening.pgn,
                opening_description: opening.description,
                deleted_at: new Date().toISOString(),
              })
            }
          }
          await loadDeletionLogsFromDb(user.id)
        }
      }

      setCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
      
      // Update local storage fallback
      const local = localStorage.getItem(`rcd:collections:${user.id}`)
      if (local) {
        const parsed = JSON.parse(local).map((c: any) => c.id === id ? { ...c, ...updates } : c)
        localStorage.setItem(`rcd:collections:${user.id}`, JSON.stringify(parsed))
      }

      if (!error) toast.success("Коллекция обновлена")
    } finally {
      setIsSaving(false)
    }
  }

  async function loadDeletionLogsFromDb(userId: string) {
    try {
      const { data, error } = await supabase
        .from("deletion_logs")
        .select("id, opening_id, opening_name, opening_pgn, opening_description, deleted_at")
        .eq("user_id", userId)
        .order("deleted_at", { ascending: false })

      if (error) {
        // Таблица не создана — молча игнорируем
        setDeletionLogs([])
        return
      }

      const mapped: DeletionLog[] = (data || []).map(row => ({
        id: row.id,
        opening_id: row.opening_id,
        deleted_at: row.deleted_at,
        opening_name: row.opening_name ?? "",
        opening_pgn: row.opening_pgn ?? "",
        opening_description: row.opening_description ?? "",
      }))
      setDeletionLogs(mapped)
    } catch (err) {
      console.error("Исключение при загрузке истории удалений:", err)
      setDeletionLogs([])
    }
  }

  async function handleAdd(o: Opening): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    if (openings.length >= OPENINGS_LIMIT) return `Превышен лимит дебютов (максимум ${OPENINGS_LIMIT})`
    
    // Check if this ID is already in our local state to prevent accidental double-clicks/race conditions
    if (openings.some(item => item.id === o.id)) {
      console.warn("Attempted to add an opening that already exists in local state:", o.id)
      return null // Already added, ignore
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from("openings").insert({
        id: o.id,
        user_id: user.id,
        name: o.name,
        description: o.description,
        pgn: o.pgn,
        leading_side: o.leadingSide ?? "random",
        created_at: new Date(o.createdAt).toISOString(),
        parent_id: o.parentId,
      })
      
      if (error) {
        // If the error is a duplicate key, it means it's already in the DB.
        // This can happen if the network dropped during a previous successful attempt.
        if (error.code === "23505") {
          console.log("Record already exists in DB (duplicate key), sync local state.")
          setOpenings((prev) => {
            if (prev.some((item) => item.id === o.id)) return prev
            return [o, ...prev]
          })
          return null
        }
        
        toast.error(`Ошибка при сохранении: ${error.message}`)
        return error.message
      }

      // Always update from the latest state (avoid stale closure / duplication).
      setOpenings((prev) => {
        if (prev.some((item) => item.id === o.id)) return prev
        return [o, ...prev]
      })
      toast.success("Дебют успешно добавлен")
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkAdd(items: Opening[]): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    if (items.length === 0) return null
    
    // Check limit
    if (openings.length + items.length > OPENINGS_LIMIT) {
      return `Превышен лимит дебютов (максимум ${OPENINGS_LIMIT})`
    }

    setIsSaving(true)
    try {
      const toInsert = items.map(o => ({
        id: o.id,
        user_id: user.id,
        name: o.name,
        description: o.description,
        pgn: o.pgn,
        leading_side: o.leadingSide ?? "random",
        created_at: new Date(o.createdAt).toISOString(),
      }))

      const { error } = await supabase.from("openings").insert(toInsert)

      if (error) {
        toast.error(`Ошибка при массовом сохранении: ${error.message}`)
        return error.message
      }

      // Update local state, avoiding duplicates
      setOpenings((prev) => {
        const existingIds = new Set(prev.map(o => o.id))
        const newItems = items.filter(o => !existingIds.has(o.id))
        return [...newItems, ...prev]
      })
      
      toast.success(`Восстановлено дебютов: ${items.length}`)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!user) return
    setIsSaving(true)

    try {
      // First, fetch the opening and its mittelspiels
      const { data: openingToDelete, error: fetchError } = await supabase
        .from("openings")
        .select("id, name, description, pgn")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (fetchError || !openingToDelete) {
        toast.error(`Ошибка при получении дебюта для удаления: ${fetchError?.message || "Дебют не найден"}`)
        return
      }

      // Find mittelspiels (children)
      const children = openings.filter(o => o.parentId === id)
      const idsToDelete = [id, ...children.map(c => c.id)]

      // Then, delete from openings
      const { error: deleteError } = await supabase
        .from("openings")
        .delete()
        .in("id", idsToDelete)
        .eq("user_id", user.id)

      if (!deleteError) {
        try {
          const logsToInsert = [openingToDelete, ...children].map(o => ({
            user_id: user.id,
            opening_id: o.id,
            opening_name: o.name,
            opening_pgn: o.pgn,
            opening_description: o.description || "",
            deleted_at: new Date().toISOString(),
          }))

          const { data: logsData } = await supabase.from("deletion_logs").insert(logsToInsert).select()

          if (logsData) {
            const mappedLogs: DeletionLog[] = logsData.map(log => ({
              id: log.id,
              opening_id: log.opening_id,
              opening_name: log.opening_name,
              opening_pgn: log.opening_pgn,
              opening_description: log.opening_description,
              deleted_at: log.deleted_at
            }))
            setDeletionLogs(prev => [...mappedLogs, ...prev])
          }
        } catch { /* таблица не создана */ }
      }

      if (deleteError) {
        toast.error(`Ошибка при удалении: ${deleteError.message}`)
        return
      }
      
      const idSet = new Set(idsToDelete)
      setOpenings((prev) => prev.filter((o) => !idSet.has(o.id)))
      
      // Also remove from all collections locally and in DB
      setCollections(prev => prev.map(c => ({
        ...c,
        openingIds: c.openingIds.filter(oid => !idSet.has(oid))
      })))
      
      // Update collections in DB
      for (const collection of collections) {
        const hasAny = collection.openingIds.some(oid => idSet.has(oid))
        if (hasAny) {
          const newIds = collection.openingIds.filter(oid => !idSet.has(oid))
          await supabase
            .from("collections")
            .update({ opening_ids: newIds })
            .eq("id", collection.id)
            .eq("user_id", user.id)
        }
      }

      toast.success(children.length > 0 ? `Дебют и ${children.length} миттельшпилей удалены` : "Дебют удален")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBulkDelete(ids: string[]) {
    if (!user || ids.length === 0) return
    setIsSaving(true)

    try {
      // Fetch the openings to be deleted
      const { data: openingsToDelete, error: fetchError } = await supabase
        .from("openings")
        .select("id, name, description, pgn")
        .in("id", ids)
        .eq("user_id", user.id)

      if (fetchError || !openingsToDelete || openingsToDelete.length === 0) {
        toast.error(`Ошибка при получении дебютов для массового удаления: ${fetchError?.message || "Дебюты не найдены"}`)
        return
      }

      // We do one database call for all IDs - this is much faster and safer
      const { error: deleteError } = await supabase
        .from("openings")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id)

      if (!deleteError) {
        try {
          const deletionLogsToInsert = openingsToDelete.map(o => ({
            user_id: user.id,
            opening_id: o.id,
            opening_name: o.name,
            opening_pgn: o.pgn,
            opening_description: o.description || "",
            deleted_at: new Date().toISOString(),
          }))
          const { data: logsData } = await supabase.from("deletion_logs").insert(deletionLogsToInsert).select()
          if (logsData) {
            const mappedLogs: DeletionLog[] = logsData.map(log => ({
              id: log.id,
              opening_id: log.opening_id,
              opening_name: log.opening_name,
              opening_pgn: log.opening_pgn,
              opening_description: log.opening_description,
              deleted_at: log.deleted_at
            }))
            setDeletionLogs(prev => [...mappedLogs, ...prev])
          }
        } catch { /* таблица не создана */ }
      }

      if (deleteError) {
        toast.error(`Ошибка при массовом удалении: ${deleteError.message}`)
        return
      }

      const idSet = new Set(ids)
      setOpenings((prev) => prev.filter((o) => !idSet.has(o.id)))

      // Also remove from all collections locally and in DB
      setCollections(prev => prev.map(c => ({
        ...c,
        openingIds: c.openingIds.filter(oid => !idSet.has(oid))
      })))

      // Update collections in DB
      for (const collection of collections) {
        const hasAny = collection.openingIds.some(oid => idSet.has(oid))
        if (hasAny) {
          const newIds = collection.openingIds.filter(oid => !idSet.has(oid))
          await supabase
            .from("collections")
            .update({ opening_ids: newIds })
            .eq("id", collection.id)
            .eq("user_id", user.id)
        }
      }

      toast.success(`Удалено дебютов: ${ids.length}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRestoreAll() {
    if (!user || deletionLogs.length === 0) return
    setIsSaving(true)

    try {
      // Filter out collections from bulk opening restore
      const openingLogs = deletionLogs.filter(l => !l.opening_name.startsWith("[Коллекция] "))
      const collectionLogs = deletionLogs.filter(l => l.opening_name.startsWith("[Коллекция] "))

      // 1. Process openings - ENSURE UNIQUE IDs
      const openingsMap = new Map<string, Opening>()
      openingLogs.forEach(log => {
        let name = log.opening_name
        if (name.startsWith("[Из коллекции ")) {
          const match = name.match(/^\[Из коллекции (.*?)\] (.*)$/)
          if (match) name = match[2]
        }
        // If we have multiple logs for same ID (e.g. user clicked multiple times),
        // Map will keep the latest one.
        openingsMap.set(log.opening_id, {
          id: log.opening_id,
          name: name,
          description: log.opening_description,
          pgn: log.opening_pgn,
          createdAt: new Date(log.deleted_at).getTime(),
          leadingSide: "random",
        })
      })

      const openingsToRestore = Array.from(openingsMap.values())

      if (openingsToRestore.length > 0) {
        // Use upsert to avoid duplicate key errors in bulk restore
        const { error: insertError } = await supabase.from("openings").upsert(openingsToRestore.map(o => ({
          id: o.id,
          user_id: user.id,
          name: o.name,
          description: o.description,
          pgn: o.pgn,
          created_at: new Date(o.createdAt).toISOString(),
        })))

        if (insertError) {
          toast.error(`Ошибка при восстановлении дебютов: ${insertError.message}`)
          return
        }

        // Update local openings state
        setOpenings((prev) => {
          const existingIds = new Set(prev.map(o => o.id))
          const newOpenings = openingsToRestore.filter(o => !existingIds.has(o.id))
          return [...newOpenings, ...prev].sort((a, b) => b.createdAt - a.createdAt)
        })
      }

      // 2. Process collections restoration (Deduplicated)
      const uniqueCollectionLogsMap = new Map<string, any>()
      collectionLogs.forEach(clog => {
        if (!uniqueCollectionLogsMap.has(clog.opening_id)) {
          uniqueCollectionLogsMap.set(clog.opening_id, clog)
        }
      })
      const uniqueCollectionLogs = Array.from(uniqueCollectionLogsMap.values())

      if (uniqueCollectionLogs.length > 0) {
        const collectionsToRestore = uniqueCollectionLogs.map(clog => {
          const realName = clog.opening_name.replace("[Коллекция] ", "")
          let restoredOpeningIds: string[] = []
          try {
            if (clog.opening_pgn) restoredOpeningIds = JSON.parse(clog.opening_pgn)
          } catch(e) {}
          
          return {
            id: clog.opening_id,
            user_id: user.id,
            name: realName,
            description: "",
            opening_ids: restoredOpeningIds,
            created_at: new Date().toISOString()
          }
        })

        const { data: restoredCollections, error: colError } = await supabase
          .from("collections")
          .upsert(collectionsToRestore)
          .select()

        if (!colError && restoredCollections) {
          const mappedRestored = restoredCollections.map(data => ({
            id: data.id,
            name: data.name,
            description: data.description || "",
            openingIds: data.opening_ids,
            createdAt: new Date(data.created_at).getTime()
          }))
          
          setCollections(prev => {
            const existingIds = new Set(prev.map(c => c.id))
            const filteredNew = mappedRestored.filter(c => !existingIds.has(c.id))
            return [...prev, ...filteredNew]
          })
        }
      }

      // 3. Handle putting openings back into collections if they were "removed from collection"
      // Batch updates to avoid the "one debut replaces another" bug and improve performance
      const collectionUpdates = new Map<string, Set<string>>()
      
      openingLogs.forEach(log => {
        if (log.opening_name.startsWith("[Из коллекции ")) {
          const match = log.opening_name.match(/^\[Из коллекции (.*?)\] (.*)$/)
          if (match) {
            const colName = match[1]
            const collection = collections.find(c => c.name === colName)
            if (collection) {
              if (!collectionUpdates.has(collection.id)) {
                collectionUpdates.set(collection.id, new Set(collection.openingIds))
              }
              collectionUpdates.get(collection.id)!.add(log.opening_id)
            }
          }
        }
      })

      if (collectionUpdates.size > 0) {
        const updatePromises = Array.from(collectionUpdates.entries()).map(async ([colId, newIdsSet]) => {
          const newIds = Array.from(newIdsSet)
          const { error } = await supabase
            .from("collections")
            .update({ opening_ids: newIds })
            .eq("id", colId)
            .eq("user_id", user.id)
          
          if (!error) {
            setCollections(prev => prev.map(c => c.id === colId ? { ...c, openingIds: newIds } : c))
          }
        })
        
        await Promise.all(updatePromises)
      }

      // 4. Cleanup logs
      const deletionLogIds = deletionLogs.map(log => log.id)
      const { error: deleteLogsError } = await supabase.from("deletion_logs").delete().in("id", deletionLogIds)

      if (deleteLogsError) {
        toast.error(`Данные восстановлены, но произошла ошибка при очистке истории: ${deleteLogsError.message}`)
      }

      setDeletionLogs([]) // Clear deletion logs locally
      toast.success("Все данные восстановлены")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRestoreSingle(logId: string) {
    if (!user) return
    setIsSaving(true)

    try {
      const log = deletionLogs.find(l => l.id === logId)
      if (!log) return

      let realName = log.opening_name
      let collectionName = ""
      let isCollectionRestore = false

      if (log.opening_name.startsWith("[Коллекция] ")) {
        isCollectionRestore = true
        realName = log.opening_name.replace("[Коллекция] ", "")
      } else if (log.opening_name.startsWith("[Из коллекции ")) {
        const match = log.opening_name.match(/^\[Из коллекции (.*?)\] (.*)$/)
        if (match) {
          collectionName = match[1]
          realName = match[2]
        }
      }

      if (isCollectionRestore) {
        // Restore a collection
        let restoredOpeningIds: string[] = []
        try {
          if (log.opening_pgn) {
            restoredOpeningIds = JSON.parse(log.opening_pgn)
          }
        } catch (e) {
          console.error("Failed to parse restored opening IDs", e)
        }

        const newCollection = {
          id: log.opening_id,
          user_id: user.id,
          name: realName,
          opening_ids: restoredOpeningIds,
          created_at: new Date().toISOString(),
        }
        const { error: collError } = await supabase.from("collections").insert(newCollection)
        if (collError) {
          toast.error(`Ошибка при восстановлении коллекции: ${collError.message}`)
          return
        }
        setCollections(prev => [...prev, {
          id: newCollection.id,
          name: newCollection.name,
          description: "",
          openingIds: restoredOpeningIds,
          createdAt: new Date(newCollection.created_at).getTime()
        }])
        toast.success(`Коллекция "${realName}" восстановлена`)
      } else {
        // Restore an opening
        const openingToRestore: Opening = {
          id: log.opening_id,
          name: realName,
          description: log.opening_description,
          pgn: log.opening_pgn,
          createdAt: new Date(log.deleted_at).getTime(),
          leadingSide: "random",
        }

        const { error: insertError } = await supabase.from("openings").upsert({
          id: openingToRestore.id,
          user_id: user.id,
          name: openingToRestore.name,
          description: openingToRestore.description,
          pgn: openingToRestore.pgn,
          created_at: new Date(openingToRestore.createdAt).toISOString(),
        })

        if (insertError) {
          toast.error(`Ошибка при восстановлении дебюта: ${insertError.message}`)
          return
        }

        setOpenings(prev => {
          if (prev.some(o => o.id === openingToRestore.id)) return prev
          return [openingToRestore, ...prev]
        })

        // If it belonged to a collection, try to put it back
        if (collectionName) {
          const collection = collections.find(c => c.name === collectionName)
          if (collection) {
            if (!collection.openingIds.includes(openingToRestore.id)) {
              const newIds = [...collection.openingIds, openingToRestore.id]
              const { error: updError } = await supabase
                .from("collections")
                .update({ opening_ids: newIds })
                .eq("id", collection.id)
              
              if (!updError) {
                setCollections(prev => prev.map(c => c.id === collection.id ? { ...c, openingIds: newIds } : c))
                toast.success(`Дебют восстановлен в коллекцию "${collectionName}"`)
              }
            } else {
              toast.info(`Дебют уже находится в коллекции "${collectionName}"`)
            }
          } else {
            toast.warning(`Коллекция "${collectionName}" не найдена, дебют восстановлен в общий список`)
          }
        }
      }

      // Delete the log entry
      const { error: deleteLogError } = await supabase.from("deletion_logs").delete().eq("id", logId)
      if (deleteLogError) {
        toast.error(`Запись восстановлена, но не удалось удалить лог: ${deleteLogError.message}`)
      }

      setDeletionLogs(prev => prev.filter(l => l.id !== logId))
      if (!collectionName && !isCollectionRestore) toast.success("Дебют восстановлен")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClearAll() {
    if (!user || deletionLogs.length === 0) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from("deletion_logs").delete().eq("user_id", user.id)
      if (error) {
        toast.error(`Ошибка при очистке истории удалений: ${error.message}`)
        return
      }
      setDeletionLogs([])
      toast.success("История удалений очищена")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleEdit(o: Opening): Promise<string | null> {
    if (!user) return "Вы не авторизованы"
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("openings")
        .update({
          name: o.name,
          description: o.description,
          pgn: o.pgn,
          leading_side: o.leadingSide ?? "random",
          created_at: new Date(o.createdAt).toISOString(),
          parent_id: o.parentId,
        })
        .eq("id", o.id)
        .eq("user_id", user.id)
      if (error) {
        toast.error(`Ошибка при обновлении: ${error.message}`)
        return error.message
      }
      setOpenings((prev) =>
        prev
          .map((item) => (item.id === o.id ? o : item))
          .sort((a, b) => b.createdAt - a.createdAt),
      )
      toast.success("Дебют обновлен")
      return null
    } finally {
      setIsSaving(false)
    }
  }

const handleStart = useCallback((config: SessionConfig) => {
  // config.openingIds — готовый список id (корневые дебюты + их миттельшпили),
  // собранный в StartSessionDialog. Сторона определяется per-opening через leadingSide.
  const byId = new Map(openings.map((o) => [o.id, o]))
  const chosen: Opening[] = config.openingIds
    .map((id) => byId.get(id))
    .filter(Boolean) as Opening[]

  if (chosen.length === 0) return

  // Перемешиваем
  for (let i = chosen.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1))
    ;[chosen[i], chosen[r]] = [chosen[r], chosen[i]]
  }

  const session: SessionUnit[] = chosen.map((o) => ({ kind: "single", opening: o }))

  setStartOpen(false)
  setScoreEnabled(true)
  setGlobalFinishedIds(new Set())

  setScreenSafe({
    name: "game",
    session,
    color: "random",
    mode: config.mode,
    isCustom: false,
    advanced: false,
    collectionOpeningIds: config.openingIds,
    isRandomColor: true,
  })
}, [openings, setScreenSafe])

  const handleCustomStart = useCallback((config: CustomSessionConfig) => {
    const byId = new Map(openings.map((o) => [o.id, o]))
    const chosen: Opening[] = config.openingIds.map((id) => byId.get(id)).filter(Boolean) as Opening[]
    if (chosen.length === 0) return
    // Shuffle so "Своя игра" doesn't become too deterministic.
    for (let i = chosen.length - 1; i > 0; i--) {
      const r = Math.floor(Math.random() * (i + 1))
      ;[chosen[i], chosen[r]] = [chosen[r], chosen[i]]
    }

    // Multiply session units based on repeatMoves
    const session: SessionUnit[] = []
    const repeats = 1
    for (const o of chosen) {
      for (let i = 0; i < repeats; i++) {
        session.push({ kind: "single", opening: o })
      }
    }

    let finalColor: "white" | "black" = "white"
    if (config.color === "random") {
      finalColor = Math.random() < 0.5 ? "white" : "black"
    } else {
      finalColor = config.color as "white" | "black"
    }

    setCustomOpen(false)
    setScoreEnabled(true)
    setScreenSafe({ 
      name: "game", 
      session, 
      color: finalColor, 
      mode: "moves", 
      isCustom: true,
      isRandomColor: config.color === "random",
      collectionOpeningIds: config.openingIds,
    })
  }, [openings, setScreenSafe])

  const handleStudy = useCallback((opening: Opening, fromHistory?: boolean) => {
    let initialOrientation: "white" | "black"
    if (opening.leadingSide === "white" || opening.leadingSide === "black") {
      initialOrientation = opening.leadingSide
    } else {
      const finalFen = parsePgn(opening.pgn).finalFen
      initialOrientation = finalFen.split(" ")[1] === "b" ? "white" : "black"
    }
    setScreenSafe({ name: "study", opening, fromHistory, initialOrientation })
  }, [setScreenSafe])

const handleStartCollection = useCallback((openingIds: string[]) => {
  const selectedOpenings = openings.filter((o) => openingIds.includes(o.id))
  if (selectedOpenings.length === 0) {
    toast.error("В коллекции нет доступных дебютов")
    return
  }
  setCollectionOpeningIds(openingIds)
  setStartOpen(true)
}, [openings])

  const handleExit = useCallback((fromStudyScreen?: boolean) => {
    // invalidate session and return home
    const wasFromHistory = screen.name === "study" && screen.fromHistory
    setScreenSafe({ name: "home" })
    if (fromStudyScreen && wasFromHistory) {
      setHistoryOpen(true)
    }
  }, [screen, setScreenSafe])

  async function maybeUpdateRecord(points: number) {
    if (!user) return
    const next = maybeUpdateRecordLogic(points, record ?? 0)
    if (next === null) return
    setIsSaving(true)
    setRecord(next)
    try {
      await supabase.from("records").upsert(
        {
          user_id: user.id,
          best_score: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
    } finally {
      setIsSaving(false)
    }
  }

const handleReplayFromResults = useCallback(() => {
  
  if (screen.name !== "results") return
  const failedUnits = screen.results.filter((r) => r.status === "failed").map((r) => r.unit)
  const failedIds = new Set(failedUnits.flatMap(openingIdsOfUnit))

  // Накапливаем пройденные ID глобально
  const newlyFinished = new Set<string>(globalFinishedIds)
  for (const r of screen.results) {
    if (r.status === "won") {
      if (r.unit.kind === "single") newlyFinished.add(r.unit.opening.id)
      else newlyFinished.add(r.unit.long.id)
    }
  }
  setGlobalFinishedIds(newlyFinished)

const needed = screen.isCustom ? 0 : Math.max(0, screen.targetCount - failedUnits.length)
const availableOpenings = screen.collectionOpeningIds
  ? openings.filter(o => screen.collectionOpeningIds!.includes(o.id))
  : openings
const pool = availableOpenings.filter((o) => !newlyFinished.has(o.id) && !failedIds.has(o.id))
  const newUnits = buildSession(pool, {
    count: needed,
    advanced: screen.advanced ?? false,
    color: screen.color,  // передаём цвет для фильтрации по leadingSide
  })

  const nextSession: SessionUnit[] = [...failedUnits, ...newUnits]
  if (nextSession.length === 0) {
    setScreenSafe({ name: "home" })
    return
  }
  setScoreEnabled(false)
  setScreenSafe({
    name: "game",
    session: nextSession,
    color: screen.color,
    mode: screen.mode,
    advanced: screen.advanced,
    collectionOpeningIds: screen.collectionOpeningIds,  // добавь
  })
}, [screen, openings, globalFinishedIds, setScreenSafe])

  const handleAuth = useCallback(async (email: string, password: string, mode: "login" | "register") => {
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error?.message ?? null
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return error?.message ?? null
  }, [])

  const handleGoogleLogin = useCallback(async () => {
    console.log("Supabase Auth: Initiating Google Sign-In...")
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      console.error("Supabase Auth Error:", error.status, error.message)
      return error.message
    }
    
    console.log("Supabase Auth Status:", data ? "Redirecting to Google..." : "No data returned")
    return null
  }, [])

  const handleLogout = useCallback(async () => {
    setIsSaving(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setIsSaving(false)
    }
  }, [])

  const handleFeedback = useCallback(async (message: string) => {
    if (!user) return "Вы не авторизованы"
    setIsSaving(true)
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        message,
      })
      return error?.message ?? null
    } catch (error) {
      if (error instanceof Error) return error.message
      return "Не удалось отправить обратную связь"
    } finally {
      setIsSaving(false)
    }
  }, [user])

  // Стабильные колбэки для HomeScreen — предотвращают лишние ре-рендеры при memo
  // ВАЖНО: все хуки должны быть ДО условных return
  const handleOpenStart = useCallback(() => setStartOpen(true), [])
  const handleOpenCustomStart = useCallback((initialSelection?: string[]) => {
    setCustomInitialSelection(initialSelection || [])
    setCustomOpen(true)
  }, [])
  const handleEditOpening = useCallback((opening: Opening) => {
    setEditingOpening(opening)
    setAddOpen(true)
  }, [])
  const handleThemeChange = useCallback((theme: import("@/lib/themes").ChessTheme) => {
    setCurrentTheme(theme)
    localStorage.setItem("rcd_board_theme", theme.id)
  }, [])
  const handleLanguageChange = useCallback((l: "ru" | "en") => {
    setLanguage(l)
    localStorage.setItem("rcd_language", l)
  }, [])
  const handlePgnFormatChange = useCallback((f: "standard" | "short") => {
    setPgnFormat(f)
    localStorage.setItem("rcd_pgn_format", f)
  }, [])
  const handleOpenDetail = useCallback((o: Opening) => setScreenSafe({ name: "detail", opening: o }), [setScreenSafe])

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Загрузка сессии...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} onGoogleLogin={handleGoogleLogin} />
  }

  // Один активный экран за раз — React не пересчитывает JSX всех экранов при смене screen
  function renderScreen() {

    if (screen.name === "home") return (
        <HomeScreen
          openings={openings}
          collections={collections}
          onAdd={handleAdd}
          onBulkAdd={handleBulkAdd}
          onStart={handleOpenStart}
          onCustomStart={handleOpenCustomStart}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onEdit={handleEditOpening}
          onStudy={handleStudy}
          onLogout={handleLogout}
          userEmail={user?.email ?? "Пользователь"}
          onSendFeedback={handleFeedback}
          record={record}
          onCreateCollection={handleCreateCollection}
          onDeleteCollection={handleDeleteCollection}
          onUpdateCollection={handleUpdateCollection}
          onStartCollection={handleStartCollection}
          activeCollectionId={activeCollectionId}
          setActiveCollectionId={setActiveCollectionId}
          historyOpen={historyOpen}
          setHistoryOpen={setHistoryOpen}
          deletionLogs={deletionLogs}
          currentTheme={currentTheme}
          onThemeChange={handleThemeChange}
          isSaving={isSaving}
          onClearAllData={handleClearAllData}
          onRestore={handleRestoreSingle}
          onRestoreAll={handleRestoreAll}
          onClearAllLogs={handleClearAll}
          onDetail={handleOpenDetail}
          language={language}
          onLanguageChange={handleLanguageChange}
          pgnFormat={pgnFormat}
          onPgnFormatChange={handlePgnFormatChange}
        />
    )
    if (screen.name === "game") return (
        <>
          {screen.mode === "names" ? (
            <NameGameScreen
              session={screen.session}
              color={screen.color}
              scoringEnabled={scoreEnabled}
              onExit={handleExit}
              theme={currentTheme}
              onFinish={async ({ results, totalSeconds, isRandomColor }) => {
                const enriched: UnitResult[] = results.map((r) => {
                  const pgnToParse = r.unit.kind === "single" ? r.unit.opening.pgn : r.unit.long.pgn
                  const parsed = parsePgn(pgnToParse)
                  const pointsAwarded = calcPointsAwarded(scoreEnabled, r.status, r.seconds, {
                    mode: screen.mode,
                    advanced: screen.advanced ?? false,
                    totalUnits: screen.session.length,
                    isCustom: screen.isCustom ?? false,
                    moveCount: parsed.moveCount,
                    isRandomColor: isRandomColor ?? false,
                  })
                  return {
                    unit: r.unit,
                    status: r.status,
                    seconds: r.seconds,
                    pointsAwarded,
                  }
                })
                const sessionPoints = enriched.reduce((acc, r) => acc + r.pointsAwarded, 0)
                if (scoreEnabled) {
                  await maybeUpdateRecord(sessionPoints)
                }
                setScreenSafe({
                  name: "results",
                  isCustom: screen.isCustom,
                  results: enriched,
                  totalSeconds,
                  sessionPoints,
                  scoringEnabled: scoreEnabled,
                  color: screen.color,
                  targetCount: screen.session.length,
                  mode: screen.mode,
                  advanced: screen.advanced,
                  isRandomColor: isRandomColor,
                })
              }}
            />
          ) : (
            <GameScreen
              session={screen.session}
              color={screen.color}
              onExit={handleExit}
              theme={currentTheme}
              onFinish={async ({ results, totalSeconds, isRandomColor }) => {
                // Replaced 'handleFinish' call with direct logic to transition to results screen.
                const enriched: UnitResult[] = results.map((r) => {
                  const pgnToParse = r.unit.kind === "single" ? r.unit.opening.pgn : r.unit.long.pgn
                  const parsed = parsePgn(pgnToParse)
                  const pointsAwarded = calcPointsAwarded(scoreEnabled, r.status, r.seconds, {
                    mode: screen.mode,
                    advanced: screen.advanced ?? false,
                    totalUnits: screen.session.length,
                    isCustom: screen.isCustom ?? false,
                    moveCount: parsed.moveCount,
                    isRandomColor: isRandomColor ?? false,
                    
                  })
                  return {
                    unit: r.unit,
                    status: r.status,
                    seconds: r.seconds,
                    pointsAwarded,
                  }
                })
                const sessionPoints = enriched.reduce((acc, r) => acc + r.pointsAwarded, 0)
                if (scoreEnabled) {
                  await maybeUpdateRecord(sessionPoints)
                }
                setScreenSafe({
                  name: "results",
                  isCustom: screen.isCustom,
                  results: enriched,
                  totalSeconds,
                  sessionPoints,
                  scoringEnabled: scoreEnabled,
                  color: screen.color,
                  targetCount: screen.session.length,
                  mode: screen.mode,
                  advanced: screen.advanced,
                  isRandomColor: isRandomColor,
                  collectionOpeningIds: screen.collectionOpeningIds,  // добавь
                })
              }}
              scoringEnabled={scoreEnabled}
            />
          )}
        </>
    )
    if (screen.name === "results") return (
        <ResultsScreen
          results={screen.results}
          totalSeconds={screen.totalSeconds}
          sessionPoints={screen.sessionPoints}
          scoringEnabled={screen.scoringEnabled}
          onOk={handleReplayFromResults}
          onExit={handleExit}
          isSaving={isSaving}
          hasMoreOpenings={(() => {
            if (screen.isCustom) {
              const failedUnits = screen.results.filter((r) => r.status === "failed")
              return failedUnits.length > 0
            }

            const failedUnits = screen.results.filter((r) => r.status === "failed")
            if (failedUnits.length > 0) return true

            const finishedIds = new Set<string>()
            for (const r of screen.results) {
              if (r.status === "won") {
                if (r.unit.kind === "single") finishedIds.add(r.unit.opening.id)
                else finishedIds.add(r.unit.long.id)
              }
            }
            const pool = openings.filter((o) => !finishedIds.has(o.id))
            const potentialSession = buildSession(pool, {
              count: 1,
              advanced: screen.advanced ?? false,
              color: screen.color,
            })
            return potentialSession.length > 0
          })()}
        />
    )
    if (screen.name === "study") return (
        <StudyScreen 
          opening={screen.opening} 
          onExit={handleExit} 
          theme={currentTheme} 
          initialOrientation={screen.initialOrientation} 
          pgnFormat={pgnFormat}
        />
    )
    if (screen.name === "detail") return (
        <OpeningDetailScreen
          opening={screen.opening}
          mittelspiels={openings.filter(o => o.parentId === screen.opening.id)}
          parties={parties.filter(p => p.openingId === screen.opening.id)}
          onBack={() => setScreenSafe({ name: "home" })}
          onStudy={(o: Opening) => setScreenSafe({ name: "study", opening: o })}
          onStudyParty={(p: Party) => setScreenSafe({ name: "study", opening: { ...p, id: p.id, name: p.name, description: p.description, pgn: p.pgn, createdAt: p.createdAt, leadingSide: "random" } })}
          onEdit={(o: Opening) => {
            setEditingOpening(o)
            setAddOpen(true)
          }}
          onEditParty={(p: Party) => {
            setAddingPartyToId(p.openingId)
            setEditingOpening({ id: p.id, name: p.name, description: p.description, pgn: p.pgn, createdAt: p.createdAt, leadingSide: "random" })
            setAddOpen(true)
          }}
          onDelete={handleDelete}
          onDeleteParty={async (id: string) => {
            if (!user) return
            setIsSaving(true)
            try {
              await supabase.from("parties").delete().eq("id", id).eq("user_id", user.id)
              setParties(prev => prev.filter(p => p.id !== id))
            } finally {
              setIsSaving(false)
            }
          }}
          onAddMittelspiel={handleAdd}
          onAddParty={() => {
            setAddingPartyToId(screen.opening.id)
            setEditingOpening({ id: "", name: "", description: "", pgn: "", createdAt: Date.now(), leadingSide: "random" })
            setAddOpen(true)
          }}
          onPartyClick={(p: Party) => setScreenSafe({ name: "party", party: p, opening: screen.opening })}
          currentTheme={currentTheme}
          isSaving={isSaving}
        />
    )
    if (screen.name === "party") return (
         <PartyDetailScreen
           party={screen.party}
           onBack={() => setScreenSafe({ name: "detail", opening: screen.opening })}
           onStudy={(p: Party) => setScreenSafe({ name: "study", opening: { id: p.id, name: p.name, description: p.description, pgn: p.pgn, createdAt: p.createdAt, leadingSide: "random" } })}
           onEdit={(p: Party) => {
             setAddingPartyToId(p.openingId)
             setEditingOpening({ id: p.id, name: p.name, description: p.description, pgn: p.pgn, createdAt: p.createdAt, leadingSide: "random" })
             setAddOpen(true)
           }}
          onDelete={async (id: string) => {
            if (!user) return
            setIsSaving(true)
            try {
              await supabase.from("parties").delete().eq("id", id).eq("user_id", user.id)
              setParties(prev => prev.filter(p => p.id !== id))
              setScreenSafe({ name: "detail", opening: screen.opening })
            } finally {
              setIsSaving(false)
            }
          }}
          currentTheme={currentTheme}
          isSaving={isSaving}
        />
    )
    return null
  }


  return (
    <>
      {renderScreen()}


      <AddOpeningDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) {
            setEditingOpening(null)
            setAddingPartyToId(null)
          }
        }}
        onSave={
          addingPartyToId
            ? (p) => (editingOpening?.id ? handleEditParty(p as any) : handleAddParty(p as any))
            : editingOpening
            ? handleEdit
            : handleAdd
        }
        initialOpening={editingOpening}
        parentPgn={editingOpening?.parentId ? openings.find(o => o.id === editingOpening.parentId)?.pgn : undefined}
        parentId={editingOpening?.parentId}
        isSaving={isSaving}
        currentTheme={currentTheme}
      />

      <StartSessionDialog
        currentTheme={currentTheme}
        open={startOpen}
        onOpenChange={setStartOpen}
        openings={openings}
        onStart={handleStart}
        isSaving={isSaving}
      />

      <CustomSessionDialog
      currentTheme={currentTheme}
        open={customOpen}
        onOpenChange={setCustomOpen}
        openings={openings}
        onStart={handleCustomStart}
        initialSelection={customInitialSelection}
        isSaving={isSaving}
      />

      <DeletionHistoryDialog
        currentTheme={currentTheme}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        deletionLogs={deletionLogs}
        onRestoreAll={handleRestoreAll}
        onClearAll={handleClearAll}
        onRestore={handleRestoreSingle}
        onStudy={handleStudy}
        isSaving={isSaving}
      />
    </>
  )
}
