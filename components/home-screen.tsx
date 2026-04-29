"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Play, Search, Swords, Headset, UserCircle2, LogOut, Gamepad2, Moon, SortAsc, Calendar, LayoutGrid, AlertTriangle, Trash2, Clock, History, RotateCcw, Check, X, FolderPlus, Folder, MoreVertical, Edit2, PlayCircle, Paintbrush, ChevronDown } from "lucide-react"
import { OpeningCard } from "./opening-card"
import { parsePgn, type Opening, type Collection, OPENINGS_LIMIT, COLLECTIONS_LIMIT } from "@/lib/openings"
import { CHESS_THEMES, type ChessTheme } from "@/lib/themes"
import { ThemeSelectorDialog } from "./theme-selector-dialog"
import { AddToCollectionDialog } from "./add-to-collection-dialog"
import { SelectCollectionDialog } from "./select-collection-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AddOpeningForm } from "./add-opening-form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getStyles } from "@/lib/styles"

type Props = {
  openings: Opening[]
  collections: Collection[]
  onAdd: (opening: Opening) => Promise<string | null>
  onBulkAdd?: (items: Opening[]) => Promise<string | null>
  onStart: () => void
  onCustomStart: (initialSelection?: string[]) => void
  onDelete: (id: string) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  onEdit: (opening: Opening) => void
  onStudy: (opening: Opening, fromHistory?: boolean) => void
  onLogout: () => Promise<void>
  userEmail: string
  onSendFeedback: (message: string) => Promise<string | null>
  record: number | null
  onCreateCollection: (name: string, openingIds: string[]) => Promise<string | null>
  onDeleteCollection: (id: string) => Promise<void>
  onUpdateCollection: (id: string, updates: Partial<Collection>) => Promise<void>
  onStartCollection?: (openingIds: string[]) => void
  activeCollectionId: string | null
  setActiveCollectionId: (id: string | null) => void
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  deletionLogs?: any[]
  currentTheme: ChessTheme
  onThemeChange: (theme: ChessTheme) => void
  isSaving?: boolean
}

export function HomeScreen({
  openings,
  collections = [],
  onAdd,
  onBulkAdd,
  onStart,
  onCustomStart,
  onDelete,
  onBulkDelete,
  onEdit,
  onStudy,
  onLogout,
  userEmail,
  onSendFeedback,
  record,
  onCreateCollection,
  onDeleteCollection,
  onUpdateCollection,
  onStartCollection,
  activeCollectionId,
  setActiveCollectionId,
  historyOpen,
  setHistoryOpen,
  deletionLogs = [],
  currentTheme,
  onThemeChange,
  isSaving = false,
}: Props) {
  const s = getStyles(currentTheme)
  const accentBorder = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent)` }
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}` }
  const moonGlow = {background: "#ffffff",boxShadow: "0 0 22px 8px rgba(255, 255, 255, 0.55), 0 0 44px 8px rgba(200,200,255,0.2)",}
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [collectionSortBy, setCollectionSortBy] = useState<"name" | "date">("date")
  const [collectionSortOrder, setCollectionSortOrder] = useState<"asc" | "desc">("desc")
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [collectionToDeleteId, setCollectionToDeleteId] = useState<string | null>(null)
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCollectionMode, setIsCollectionMode] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [selectCollectionDialogOpen, setSelectCollectionDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(16)
  const [visibleCollectionsCount, setVisibleCollectionsCount] = useState(8)
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLongPress = (opening: Opening) => {
    // Enter delete mode and select this opening
    setIsDeleteMode(true)
    setIsCollectionMode(false)
    setSelectedIds(new Set([opening.id]))
  }

  const handleAddToExistingCollection = async (collectionId: string) => {
    const collection = collections.find(c => c.id === collectionId)
    if (!collection) return

    const newOpeningIds = [...new Set([...collection.openingIds, ...Array.from(selectedIds)])]
    await onUpdateCollection(collectionId, { openingIds: newOpeningIds })
    
    setSelectedIds(new Set())
    setIsDeleteMode(false)
    setSelectCollectionDialogOpen(false)
  }
  const handleConfirmAdd = async (newOpeningIds: string[]) => {
    if (!activeCollectionId) return
    await onUpdateCollection(activeCollectionId, { openingIds: newOpeningIds })
  }
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      setIsDeleteMode(false)
      return
    }

    const idsArray = Array.from(selectedIds)
    
    if (activeCollectionId) {
      const collection = collections.find(c => c.id === activeCollectionId)
      if (collection) {
        const newOpeningIds = collection.openingIds.filter(id => !selectedIds.has(id))
        await onUpdateCollection(activeCollectionId, { openingIds: newOpeningIds })
      }
    } else {
      if (onBulkDelete) {
        // Modern way: single optimized call
        await onBulkDelete(idsArray)
        } else {
          for (let i = 0; i < idsArray.length; i += 5) {
            await Promise.all(idsArray.slice(i, i + 5).map(id => onDelete(id)))
          }
        }
    }

    setSelectedIds(new Set())
    setIsDeleteMode(false)
  }
  const handleSelectAll = () => {
     if (selectedIds.size === displayOpenings.length) {
       setSelectedIds(new Set())
     } else {
       setSelectedIds(new Set(displayOpenings.map(o => o.id)))
     }
   }
  const handleCreateCollectionSubmit = async () => {
    if (!newCollectionName.trim()) return
    
    if (editingCollectionId) {
      await onUpdateCollection(editingCollectionId, {
        name: newCollectionName.trim(),
        openingIds: Array.from(selectedIds)
      })
    } else {
      if (selectedIds.size === 0) return
      await onCreateCollection(newCollectionName.trim(), Array.from(selectedIds))
    }
    
    setCollectionDialogOpen(false)
    setNewCollectionName("")
    setIsCollectionMode(false)
    setSelectedIds(new Set())
    setEditingCollectionId(null)
  }
const handleEditCollection = (collection: Collection) => {
  setEditingCollectionId(collection.id)
  setNewCollectionName(collection.name)
  setSelectedIds(new Set(collection.openingIds))
  setCollectionDialogOpen(true)
}
  useEffect(() => {
    setMounted(true)
  }, [])
  useEffect(() => {
    setVisibleCount(16)
    setVisibleCollectionsCount(8)
  }, [activeCollectionId, query, sortBy, collectionSortBy])
  const filtered = useMemo(() => {
    // 1. First, define the pool of openings to filter from
    let pool = openings
    if (activeCollectionId) {
      const collection = collections.find(c => c.id === activeCollectionId)
      if (collection) {
        pool = openings.filter(o => collection.openingIds.includes(o.id))
      }
    }

    const q = query.trim().toLowerCase()
    if (!q) return pool

    // Check if query is a number (for move count filtering)
    const moveCountQuery = parseInt(q, 10)
    const isNumeric = !isNaN(moveCountQuery) && /^\d+$/.test(q)

    return pool.filter((o) => {
      // Basic text search
      const matchesText = 
        o.name.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.pgn.toLowerCase().includes(q)
      
      if (matchesText) return true

      // If numeric, also check for exact move count
      if (isNumeric) {
        const parsed = parsePgn(o.pgn)
        return parsed.fullMoveCount === moveCountQuery
      }

      return false
    })
  }, [openings, query, activeCollectionId, collections])
  const confirmDelete = async () => {
    if (!deleteId) return
    
    if (activeCollectionId) {
      const collection = collections.find(c => c.id === activeCollectionId)
      const opening = openings.find(o => o.id === deleteId)
      if (collection && opening) {
        const newOpeningIds = collection.openingIds.filter(id => id !== deleteId)
        await onUpdateCollection(activeCollectionId, { openingIds: newOpeningIds })
        
        // No easy way to log here without userId, but ClientApp should handle this
        // in onUpdateCollection if we wanted to. For now, we've at least fixed
        // the primary collection deletion logging in ClientApp.
      }
      setDeleteId(null)
    } else {
      await onDelete(deleteId)
        setDeleteId(null)
    }
  }
  const confirmDeleteCollection = async () => {
    if (!collectionToDeleteId) return
    await onDeleteCollection(collectionToDeleteId)
    setCollectionToDeleteId(null)
  }
  const displayOpenings = useMemo(() => {
    let result = [...filtered]
    
    if (sortBy === "date") {
      result.sort((a, b) => {
        return sortOrder === "desc" 
          ? b.createdAt - a.createdAt 
          : a.createdAt - b.createdAt
      })
    } else {
      result.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, "ru")
        return sortOrder === "asc" ? comparison : -comparison
      })
    }
    return result
  }, [filtered, sortBy, sortOrder])

  const sortedCollections = useMemo(() => {
    let result = [...collections]
    
    if (collectionSortBy === "date") {
      result.sort((a, b) => {
        return collectionSortOrder === "desc" 
          ? b.createdAt - a.createdAt 
          : a.createdAt - b.createdAt
      })
    } else {
      result.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, "ru")
        return collectionSortOrder === "asc" ? comparison : -comparison
      })
    }
    return result
  }, [collections, collectionSortBy, collectionSortOrder])
  const visibleOpenings = displayOpenings.slice(0, visibleCount)
  const handleAddButtonClick = () => {
    const container = document.getElementById("add-form-container")
    if (container) {
      container.scrollIntoView({ behavior: "smooth" })
      // Focus the name input after a short delay to allow for scrolling
      setTimeout(() => {
        const nameInput = document.getElementById("opening-name")
        if (nameInput) {
          nameInput.focus()
        }
      }, 500)
    }
  }




const ThemeIcon = currentTheme.icon
  return ( 
    <div className="screen-in min-h-dvh bg-background">
      {/* ХЕДЕР */}
      <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/85 backdrop-blur-md" style={{ borderColor: s.accent }}>
      
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveCollectionId(null)}
              className="group flex items-center gap-2 outline-none"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-active:scale-95 ${currentTheme.id === "dark" && !activeCollectionId ? "" : "bg-accent text-accent-foreground"}`}
              >
                {activeCollectionId ? (
                  <Folder className="h-6 w-6" />
                ) : currentTheme.id === "dark" ? (
                  <div
                    className="relative flex h-10 w-10 items-center justify-center rounded-full"
                  style={moonGlow}
                  >
                    <Moon className="h-6 w-6 text-black" />
                  </div>
                ) : (
                  <ThemeIcon className="h-6 w-6" />
                  
                )}
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold leading-none tracking-tight">
                  {activeCollectionId ? "Коллекция" : "RCD"}
                </h1>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {activeCollectionId ? collections.find(c => c.id === activeCollectionId)?.name : "Random Chess Debut"}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2" >
            {mounted && (
              <div className="mr-2 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
              style={{ borderColor: s.accent }}>
                <span className="text-foreground font-semibold">Рекорд</span>
                <span className="tabular-nums text-foreground font-bold">
                  {record !== null ? Math.round(record) : 0}
                </span>
              </div>
            )}

            <button
              onClick={() => setThemeDialogOpen(true)}
              disabled={isSaving}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Тематика"
            style={{ borderColor: s.accent }}>
              <Paintbrush className="h-5 w-5" />
            </button>


            <button
              onClick={() => setHistoryOpen(true)}
              disabled={isSaving}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="История удалений"
            style={{ borderColor: s.accent }}>
              <Clock className="h-5 w-5" />
              {deletionLogs.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white animate-in zoom-in duration-300">
                  {deletionLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent"
              aria-label="Обратная связь"
             
            style={{ borderColor: s.accent }}>
              <Headset className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition hover:bg-accent"
                aria-label="Профиль"
              
              style={{ borderColor: s.accent }}>
                <UserCircle2 className="h-5 w-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl"
               style={{ borderColor: s.accent }}>
                  <div className="mb-1 truncate px-2 py-1 text-xs text-muted-foreground">{userEmail}</div>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false)
                      await onLogout()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-error transition hover:bg-error/10 hover:text-error"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* КАРТОЧКА ГЛАВНОЕ МЕНЮ */}
      <main className="mx-auto max-w-6xl px-4 pb-6 pt-20 md:pb-10 md:pt-24"
      style={accentGlow}>
        
        {!activeCollectionId && (
          
          <div className="mb-8 flex flex-col items-center gap-6 md:mb-10">
            {/* КАРТОЧКАСТАРТ И СВОЯ ИГРА */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStart}
                disabled={openings.length === 0 || isSaving}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={accentGlow}>
                <Play className="h-4 w-4 fill-current" />
                Старт
              </button>

              <button
                type="button"
                onClick={() => onCustomStart()}
                disabled={openings.length === 0 || isSaving}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-card px-6 text-sm font-semibold transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                style={accentGlow}
              >
                <Gamepad2 className="h-4 w-4" />
                Своя игра
              </button>
            </div>

            {/* КАРТОЧКА ПОИСКА */}
            <div className="flex w-full max-w-md flex-col gap-4">
              <div className="relative group">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по названию, описанию или ходам..."
                  className="h-14 w-full rounded-2xl bg-card pl-12 pr-4 text-base outline-none transition focus:border-primary"
                  style={accentGlow}

                />
              </div>
            </div>

            {/* ТЕЛО ДОБАВЛЕНИЯ ДЕБЮТОВ */}
            <div className="w-full max-w-md" id="add-form-container" >
                <AddOpeningForm onSave={onAdd} isInline isSaving={isSaving} currentTheme={currentTheme} />
              </div>
          </div>
        )}

        {/* КОЛЛЕКЦИИ */}
        {collections.length > 0 && !activeCollectionId && (
          <div className="mb-10">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-card p-1 shadow-sm gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (collectionSortBy === "name") {
                        setCollectionSortOrder(prev => prev === "asc" ? "desc" : "asc")
                      } else {
                        setCollectionSortBy("name")
                        setCollectionSortOrder("asc")
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${collectionSortBy === "name" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    style={accentGlow}
                  >
                    <SortAsc className={cn("h-3.5 w-3.5 transition-transform", collectionSortBy === "name" && collectionSortOrder === "desc" && "rotate-180")} />
                    Название
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (collectionSortBy === "date") {
                        setCollectionSortOrder(prev => prev === "desc" ? "asc" : "desc")
                      } else {
                        setCollectionSortBy("date")
                        setCollectionSortOrder("desc")
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${collectionSortBy === "date" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    style={accentGlow}
                  >
                    <Calendar className={cn("h-3.5 w-3.5 transition-transform", collectionSortBy === "date" && collectionSortOrder === "asc" && "rotate-180")} />
                    Дата
                  </button>
                </div>
              </div>

              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Folder className="h-5 w-5 text-primary" />
                Коллекции
                <span className="text-sm font-normal text-muted-foreground">
                  ({collections.length} из {COLLECTIONS_LIMIT})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedCollections.slice(0, visibleCollectionsCount).map((collection) => {
                
                const validCount = collection.openingIds.filter(id => openings.some(o => o.id === id)).length
                {/* КАРТОЧКА КОЛЛЕКЦИИ */}
                return (
                  <div
                    key={collection.id}
                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-transparent bg-card p-4 transition-all hover:-translate-y-0.5"
                    style={accentGlow}
                    onClick={() => setActiveCollectionId(collection.id)}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Folder className="h-6 w-6" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="rounded-lg p-1 hover:bg-accent outline-none"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                          style={accentBorder}
                        >
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleEditCollection(collection)
                          }}>
                            <Edit2 className="mr-0 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-error" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setCollectionToDeleteId(collection.id)
                            }}
                          >
                            <Trash2 className="mr-0 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="mb-1 font-bold line-clamp-1">{collection.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {validCount} {pluralOpenings(validCount)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {new Intl.DateTimeFormat("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(collection.createdAt))}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {sortedCollections.length > visibleCollectionsCount && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setVisibleCollectionsCount(prev => prev + 8)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-card px-8 text-sm font-semibold transition hover:bg-accent active:scale-95"
                  style={accentGlow}
                >
                  <ChevronDown className="h-4 w-4" />
                  Показать еще
                </button>
              </div>
            )}

            {/* РАЗДЕЛИТЕЛЬ */}
            <div className="mt-12 flex items-center gap-4">
              <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 100%, transparent)`, boxShadow: `0 0 6px 4px ${s.glow}` }} />
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 100%, transparent)`, boxShadow: `0 0 6px 4px ${s.glow}` }} />
              <div className="h-px flex-1 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${s.accent} 100%, transparent)`, boxShadow: `0 0 6px 4px ${s.glow}` }} />
            </div>
          </div>
        )}

        {/* ВНУТРИ КОЛЛЕКЦИИ */}
        {activeCollectionId && (
          <div className="mb-8 flex flex-col gap-6">
            {/* КАРТОЧКА ВНУТРИ КОЛЛЕКЦИИ */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-card p-6 shadow-xl shadow-accent/5 sm:flex-row"
          style={accentGlow}>
            {/* ПОЛЕ НАЗВАНИЯ И ИКНОНКИ */}
              <div className="flex items-center gap-4 text-center sm:text-left">
                {/* ИКОНКА КОЛЛЕКЦИИ */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                style={accentGlow}>
                  <Folder className="h-7 w-7"  />
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-tight">
                    {collections.find(c => c.id === activeCollectionId)?.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {displayOpenings.length} дебютов в коллекции
                  </p>
                </div>
              </div>
              {/* КНОПКИ КОЛЛЕКЦИИ */}
              <div className="flex w-full items-center justify-center gap-3 sm:w-auto">
                {/* СТАРТ */}
                <button
                  onClick={() => {
                    const collection = collections.find(c => c.id === activeCollectionId)
                    if (collection && onStartCollection) {
                      onStartCollection(collection.openingIds)
                    } else {
                      onStart()
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20"
                  style={accentGlow}>
                  <Play className="h-4 w-4 fill-current" />
                  Старт
                </button>
                {/* СВОЯ ИГРА */}
                <button
                  onClick={() => {
                    const collection = collections.find(c => c.id === activeCollectionId)
                    if (collection) {
                      onCustomStart(collection.openingIds)
                    } else {
                      onCustomStart()
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold transition hover:bg-accent"
                  style={accentGlow}>
                  <Gamepad2 className="h-4 w-4" />
                  Своя игра
                </button>
                {/* ДОБАВИТЬ */}
                <button
                  onClick={() => setAddDialogOpen(true)}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-card px-5 text-sm font-semibold transition hover:bg-accent disabled:opacity-50"
                  style={accentGlow}>
                  <Plus className="h-4 w-4" />
                  Добавить
                </button>
                {/* ВЕРНУТЬСЯ */}
                <button
                  onClick={() => setActiveCollectionId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-foreground transition hover:bg-accent"
                  style={accentGlow}>
                  <RotateCcw className="h-4 w-4" />
                  Вернуться
                </button>
              </div>
            </div>
            {/* ПОЛЕ ПОИСКА ВНУТРИ КОЛЛЕКЦИИ */}
            <div className="flex w-full max-w-md self-center">
              
              <div className="relative group w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск внутри коллекции..."
                  className="h-12 w-full rounded-2xl bg-card pl-11 pr-4 text-sm outline-none transition
                    focus:border-accent focus:ring-4 focus:ring-accent/5"
                     style={accentGlow}
                 
                />
              </div>
            </div>
          </div>
        )}

        {displayOpenings.length === 0 ? (
          query.trim() ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 py-16 text-center"
           >
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Ничего не найдено по вашему запросу</p>
            </div>
          ) : (
            <EmptyState 
              onAddClick={handleAddButtonClick} 
              isSaving={isSaving} 
              isCollection={!!activeCollectionId}
            />
          )
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between">
              <div className="flex items-center ">
                {isDeleteMode ? (
                  <div className="flex items-center gap-3 rounded-full bg-card"
                     >
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                    style={accentGlow}>
                      {selectedIds.size === displayOpenings.length ? "Снять всё" : "Выбрать всё"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeleteMode(false)
                        setSelectedIds(new Set())
                      }}
                      className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                    style={accentGlow}>
                      <X className="h-3.5 w-3.5" />
                      Отмена
                    </button>
                  </div>
                ) : isCollectionMode ? (
                  <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                    style={accentGlow}>
                      {selectedIds.size === displayOpenings.length ? "Снять всё" : "Выбрать всё"}
                    </button>
                    <div className="mx-1 my-1.5 w-px bg-border" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCollectionMode(false)
                        setSelectedIds(new Set())
                        setEditingCollectionId(null)
                        setNewCollectionName("")
                      }}
                      className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                    style={accentGlow}>
                      <X className="h-3.5 w-3.5" />
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex flex-wrap gap-1">
                    <div className="inline-flex rounded-full bg-card p-1 gap-3"
                       >
                      <button
                        type="button"
                        onClick={() => {
                          setIsDeleteMode(true)
                          setIsCollectionMode(false)
                          setSelectedIds(new Set())
                        }}
                        className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                        title="Массовое удаление"
                      style={accentGlow}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Выбрать
                      </button>
                      {!activeCollectionId && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCollectionMode(true)
                              setIsDeleteMode(false)
                              setSelectedIds(new Set())
                            }}
                            className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
                            title="Создать коллекцию"
                          style={accentGlow}>
                            <FolderPlus className="h-3.5 w-3.5" />
                            Коллекция
                          </button>
                        </>
                      )}
                    </div>

                    <div className="inline-flex rounded-full bg-card p-1 shadow-sm gap-3"
                 >
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "name") {
                            setSortOrder(prev => prev === "asc" ? "desc" : "asc")
                          } else {
                            setSortBy("name")
                            setSortOrder("asc")
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${sortBy === "name" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      style={accentGlow}>
                        <SortAsc className={cn("h-3.5 w-3.5 transition-transform", sortBy === "name" && sortOrder === "desc" && "rotate-180")} />
                        Название
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (sortBy === "date") {
                            setSortOrder(prev => prev === "desc" ? "asc" : "desc")
                          } else {
                            setSortBy("date")
                            setSortOrder("desc")
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${sortBy === "date" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      style={accentGlow}>
                        <Calendar className={cn("h-3.5 w-3.5 transition-transform", sortBy === "date" && sortOrder === "asc" && "rotate-180")} />
                        Дата
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {activeCollectionId ? "Дебюты в коллекции" : "Основная коллекция"}
                <span className="text-sm font-normal text-muted-foreground">
                  ({activeCollectionId ? displayOpenings.length : openings.length} из {activeCollectionId ? OPENINGS_LIMIT : OPENINGS_LIMIT})
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleOpenings.map((opening) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  onDelete={() => { setDeleteId(opening.id); return Promise.resolve() }}
                  onEdit={onEdit}
                  onStudy={onStudy}
                  isDeleteMode={isDeleteMode || isCollectionMode}
                  isSelected={selectedIds.has(opening.id)}
                  onToggleSelect={toggleSelect}
                  theme={currentTheme}
                  isSaving={isSaving}
                  onLongPress={handleLongPress}
                />
              ))}
            </div>

            {displayOpenings.length > visibleCount && (
              <div className="mt-8 flex justify-center pb-12">
                <button
                  onClick={() => setVisibleCount(prev => prev + 16)}
                  className="inline-flex h-11 text-foreground items-center gap-2 rounded-full bg-card px-8 text-sm font-semibold text-primary transition hover:bg-primary/5 active:scale-95"
                style={accentGlow}>
          
                  Показать еще
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {/* КАрточка обратной связи  */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md"
        style={accentGlow}>
          <DialogHeader>
            {/* Иконка обратной связи */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
            style={accentGlow}>
              <Headset className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">Обратная связь</DialogTitle>
            <DialogDescription className="text-center"
            >
              Опишите проблему или предложение. Сообщение сохранится в Supabase.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setFeedbackError(null)
              if (!feedbackText.trim()) {
                setFeedbackError("Введите сообщение")
                return
              }
              setFeedbackSaving(true)
              try {
                const error = await onSendFeedback(feedbackText.trim())
                if (error) {
                  setFeedbackError(error)
                  return
                }
                setFeedbackText("")
                setFeedbackOpen(false)
              } finally {
                setFeedbackSaving(false)
              }
            }}
            className="flex flex-col gap-3"
            
          >
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ваше сообщение..."
              disabled={feedbackSaving || isSaving}
              className="min-h-[120px] rounded-md border border-input bg-background p-3 text-sm outline-none transition focus:border-accent disabled:opacity-50"
            />
            {feedbackError && <p className="text-xs text-error">{feedbackError}</p>}
            <button
              type="submit"
              disabled={feedbackSaving || isSaving}
              className="h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {feedbackSaving || isSaving ? "Сохранение..." : "Отправить"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fixed Selection Bar for Collections */}
      {(isCollectionMode || isDeleteMode) && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-4 rounded-2xl bg-card p-4 backdrop-blur-md" style={accentGlow}>
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {selectedIds.size}
              </div>
              <span className="text-sm font-medium">дебютов выбрано</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-2">
              {isCollectionMode ? (
                <button
                  onClick={() => setCollectionDialogOpen(true)}
                  disabled={isSaving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-error px-6 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 shadow-lg shadow-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  {editingCollectionId ? "Обновить коллекцию" : "Создать коллекцию"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {!activeCollectionId && (
                    <button
                      onClick={() => setSelectCollectionDialogOpen(true)}
                      disabled={isSaving}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Добавить в коллекцию
                    </button>
                  )}
                  <button
                    onClick={handleBulkDelete}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-error px-6 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 shadow-lg shadow-error/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Карточка создания/редактирования коллекции */}
      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent className="sm:max-w-md"style={accentGlow}>
          <DialogHeader>
            <DialogTitle>{editingCollectionId ? "Редактировать коллекцию" : "Новая коллекция"}</DialogTitle>
            <DialogDescription>
              Введите название для вашей подборки из {selectedIds.size} дебютов.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="collection-name" className="mb-2 block text-sm font-medium">
              Название коллекции
            </label>
            <input
              id="collection-name"
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value.slice(0, 100))}
              placeholder="Например: Мой репертуар за черных"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              disabled={isSaving}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <button
              onClick={() => {
                setCollectionDialogOpen(false)
                setEditingCollectionId(null)
              }}
              disabled={isSaving}
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              Отмена
            </button>
            <button
              onClick={handleCreateCollectionSubmit}
              disabled={!newCollectionName.trim() || isSaving}
              className="rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md"
        style={accentGlow}>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error"style={accentGlow}>
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">
              {activeCollectionId ? "Убрать из коллекции?" : "Удалить дебют?"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {activeCollectionId 
                ? "Вы уверены, что хотите убрать этот дебют из текущей коллекции? Он останется в общем списке."
                : "Вы уверены, что хотите безвозвратно удалить этот дебют из своей базы данных?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => setDeleteId(null)}
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl border border-border bg-card font-semibold transition hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              Отмена
            </button>
            <button
              onClick={confirmDelete}
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl bg-error font-semibold text-white shadow-lg shadow-error/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              {isSaving ? "Удаление..." : (activeCollectionId ? "Убрать" : "Удалить")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления коллекции */}
      <Dialog open={collectionToDeleteId !== null} onOpenChange={(open) => !open && setCollectionToDeleteId(null)}>
        <DialogContent className="max-w-md"style={accentGlow}>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error"style={accentGlow}>
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">Удалить коллекцию?</DialogTitle>
            <DialogDescription className="text-center">
              Вы уверены, что хотите удалить эту коллекцию? Дебюты внутри неё не будут удалены, только сама группа.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => setCollectionToDeleteId(null)}
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl border border-border bg-card font-semibold transition hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              Отмена
            </button>
            <button
              onClick={confirmDeleteCollection}
              disabled={isSaving}
              className="h-11 flex-1 rounded-xl bg-[#DC2626] text-white font-semibold text-white shadow-lg shadow-error/20 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={accentGlow}>
              {isSaving ? "Удаление..." : "Удалить"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ThemeSelectorDialog
        open={themeDialogOpen}
        onOpenChange={setThemeDialogOpen}
        currentTheme={currentTheme}
        onSelect={onThemeChange}
      />

      {/* Select Collection Dialog */}
      <SelectCollectionDialog
        open={selectCollectionDialogOpen}
        onOpenChange={setSelectCollectionDialogOpen}
        collections={collections}
        selectedOpeningIds={selectedIds}
        onConfirm={handleAddToExistingCollection}
        isSaving={isSaving}
      />
      {/* Добавить в коллекцию */}
      {activeCollectionId && (
        <AddToCollectionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          allOpenings={openings}
          currentOpeningIds={collections.find(c => c.id === activeCollectionId)?.openingIds || []}
          onConfirm={handleConfirmAdd}
          isSaving={isSaving}
          
        />
      )}
    </div>
  )
}

function pluralOpenings(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "дебют"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дебюта"
  return "дебютов"
}

 {/* Пустое состояние */}
function EmptyState({ onAddClick, isSaving = false, isCollection = false }: { onAddClick: () => void, isSaving?: boolean, isCollection?: boolean }) {
  if (isCollection) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-muted-foreground">Пусто</h3>
        </div>
      </div>
    )
  }
 {/* Добавить первый дебют */}
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary shadow-inner">
        <Plus className="h-8 w-8" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold">Добавьте первый дебют</h3>
        <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
          Воспользуйтесь формой выше, чтобы создать свою коллекцию. Приложение само рассчитает количество ходов и построит превью позиции.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddClick}
        disabled={isSaving}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-8 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
        Создать дебют
      </button>
    </div>
  )
}
