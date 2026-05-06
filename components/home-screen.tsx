"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Plus, Play, Search, Swords, Zap, Headset, UserCircle2, LogOut, Gamepad2, Moon, SortAsc, Calendar, LayoutGrid, AlertTriangle, Trash2, Clock, History, RotateCcw, Check, X, FolderPlus, Folder, MoreVertical, Edit2, PlayCircle, Paintbrush, ChevronDown, Pencil, Settings, Info, MessageSquare, Languages, Type } from "lucide-react"
import { OpeningCard } from "./opening-card"
import { parsePgn, type Opening, type Collection, OPENINGS_LIMIT, COLLECTIONS_LIMIT } from "@/lib/openings"
import { CHESS_THEMES, type ChessTheme } from "@/lib/themes"
import { ThemeSelectorDialog } from "./theme-selector-dialog"
import { DeletionHistoryDialog } from "./deletion-history-dialog"
import { AddToCollectionDialog } from "./add-to-collection-dialog"
import { SelectCollectionDialog } from "./select-collection-dialog"
import { CollectionDescriptionDialog } from "./collection-description-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AddOpeningForm } from "./add-opening-form"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getStyles } from "@/lib/styles"
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { toast } from "sonner"


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
  onDetail: (opening: Opening) => void
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
  onClearAllData?: () => Promise<void>
  onRestore: (id: string) => Promise<void>
  onRestoreAll: () => Promise<void>
  onClearAllLogs: () => Promise<void>
  language: "ru" | "en"
  onLanguageChange: (lang: "ru" | "en") => void
  pgnFormat: "standard" | "short"
  onPgnFormatChange: (format: "standard" | "short") => void
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
  onDetail,
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
  onClearAllData,
  onRestore,
  onRestoreAll,
  onClearAllLogs,
  language,
  onLanguageChange,
  pgnFormat,
  onPgnFormatChange,
}: Props) {
  const s = getStyles(currentTheme)
  const accentBorder = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent)` }
  const accentGlow = { boxShadow: `0 0 0 1px color-mix(in srgb, ${s.accent} 100%, transparent), 0 0 24px 4px ${s.glow}` }
  
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSaving, setFeedbackSaving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCollectionMode, setIsCollectionMode] = useState(false)
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false)
  const [selectCollectionDialogOpen, setSelectCollectionDialogOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  
  const [emblaRef] = useEmblaCarousel({ 
    loop: true, 
    dragFree: true,
    containScroll: "trimSnaps"
  }, [Autoplay({ delay: 3000, stopOnInteraction: false, playOnInit: true })])

  const recentLogs = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return deletionLogs.filter(log => new Date(log.deleted_at).getTime() > oneDayAgo).slice(0, 15)
  }, [deletionLogs])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLongPress = (opening: Opening) => {
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
    if (onBulkDelete) {
      await onBulkDelete(idsArray)
    } else {
      for (let i = 0; i < idsArray.length; i += 5) {
        await Promise.all(idsArray.slice(i, i + 5).map(id => onDelete(id)))
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const filtered = useMemo(() => {
    let pool = openings.filter(o => !o.parentId)
    if (activeCollectionId) {
      const collection = collections.find(c => c.id === activeCollectionId)
      if (collection) {
        pool = openings.filter(o => collection.openingIds.includes(o.id))
      }
    }
    const q = query.trim().toLowerCase()
    if (!q) return pool
    return pool.filter((o) => 
      o.name.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.pgn.toLowerCase().includes(q)
    )
  }, [openings, activeCollectionId, collections, query])

  const displayOpenings = useMemo(() => {
    let result = [...filtered]
    if (sortBy === "date") {
      result.sort((a, b) => sortOrder === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt)
    } else {
      result.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, "ru")
        return sortOrder === "asc" ? comparison : -comparison
      })
    }
    return result
  }, [filtered, sortBy, sortOrder])

  const confirmDelete = async () => {
    if (!deleteId) return
    await onDelete(deleteId)
    setDeleteId(null)
  }

  if (!mounted) return null

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* ХЕДЕР */}
      <header className="flex h-16 shrink-0 items-center justify-center border-b border-border bg-card/50 backdrop-blur-md z-50">
        <h1 className="text-[20px] sm:text-xs sm:text-base font-black tracking-[0.2em] text-primary sm:text-xl md:text-2xl">
          RANDOM CHESS DEBUT
        </h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ЛЕВАЯ ПАНЕЛЬ: ПОСЛЕДНИЕ ИЗМЕНЕНИЯ */}
        <aside className="hidden w-72 flex-col border-r border-border bg-card/20 lg:flex shrink-0">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Последние изменения</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8 opacity-20" />
                  <p className="text-[11px] sm:text-sm">Нет недавних изменений</p>
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="group relative rounded-xl border border-border bg-card/50 p-3 transition hover:border-primary/50">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-normal sm:tracking-wider text-muted-foreground">
                        Удалено {new Date(log.deleted_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => onRestore(log.id)}
                        className="rounded-full p-1 text-primary opacity-0 transition group-hover:opacity-100 hover:bg-primary/10"
                        title="Восстановить"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </div>
                    <h3 className="line-clamp-1 text-[11px] sm:text-sm font-bold">{log.opening_name || "Без названия"}</h3>
                    <p className="line-clamp-2 text-[10px] text-muted-foreground">{log.opening_description}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-border p-4">
            <Button 
              variant="outline" 
              className="w-full gap-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-wider"
              onClick={() => setHistoryOpen(true)}
              style={accentGlow}
            >
              <History className="h-3.5 w-3.5" />
              Вся история
            </Button>
          </div>
        </aside>

        {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ: ЛЕНТА ДЕБЮТОВ */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-accent/5">
          {/* Верхние кнопки управления */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 sm:gap-4 sm:p-6 shrink-0">
            <Button 
              onClick={onStart} 
              disabled={openings.length === 0}
              className="h-10 sm:h-12 rounded-full px-5 sm:px-8 text-[10px] sm:text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest"
              style={accentGlow}
            >
              <Play className="mr-2 h-4 w-4 fill-current" />
              Старт
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setAddDialogOpen(true)}
              className="h-10 sm:h-12 rounded-full px-5 sm:px-8 text-[10px] sm:text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest"
              style={accentGlow}
            >
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
            {activeCollectionId && (
              <Button 
                variant="ghost"
                onClick={() => setActiveCollectionId(null)}
                className="h-12 rounded-full px-6 text-[11px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Назад
              </Button>
            )}
          </div>

          {/* Бесконечная лента */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-hidden py-4">
            <div className="embla w-full overflow-hidden" ref={emblaRef}>
              <div className="embla__container flex">
                {displayOpenings.length > 0 ? (
                  displayOpenings.map((opening) => (
                    <div key={opening.id} className="embla__slide min-w-0 flex-[0_0_220px] px-2 py-4 sm:flex-[0_0_280px] sm:px-4 sm:py-8 md:flex-[0_0_320px]">
                      <div className="transition-transform duration-300 hover:scale-105 active:scale-95">
                        <OpeningCard
                          opening={opening}
                          onDelete={async (id) => setDeleteId(id)}
                          onEdit={onEdit}
                          onStudy={onDetail}
                          theme={currentTheme}
                          isSaving={isSaving}
                          isDeleteMode={isDeleteMode}
                          isSelected={selectedIds.has(opening.id)}
                          onToggleSelect={toggleSelect}
                          onLongPress={handleLongPress}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex w-full flex-col items-center justify-center py-20 text-center">
                    <div className="mb-4 rounded-full bg-accent/20 p-8">
                      <LayoutGrid className="h-12 w-12 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="text-[11px] sm:text-sm sm:text-xl font-bold">Нет дебютов</h3>
                    <p className="text-muted-foreground">Добавьте свой первый дебют, чтобы начать</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Поиск внизу */}
          <div className="flex w-full items-center justify-center px-4 py-3 sm:p-8 shrink-0">
            <div className="group relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeCollectionId ? "Поиск в коллекции..." : "Поиск по всей библиотеке..."}
                className="h-11 sm:h-14 w-full rounded-full border border-border bg-card pl-11 sm:pl-12 pr-4 sm:pr-6 text-[11px] sm:text-sm sm:text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/5"
                style={accentGlow}
              />
            </div>
          </div>
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ: ПРОФИЛЬ И НАСТРОЙКИ */}
        <aside className="hidden w-80 flex-col border-l border-border bg-card/20 md:flex shrink-0">
          <ScrollArea className="flex-1">
            <div className="space-y-8 p-6">
              {/* Профиль */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" style={accentGlow}>
                    <UserCircle2 className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold tracking-tight">{userEmail}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Шахматист</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-wider text-muted-foreground">Рекорд</span>
                    <span className="text-[10px] sm:text-xs sm:text-lg font-black tabular-nums text-primary">{record !== null ? Math.round(record) : 0}</span>
                  </div>
                </div>
              </section>

              <Separator className="bg-border/50" />

              {/* Настройки */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="text-[11px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest">Настройки</h3>
                </div>

                <div className="space-y-4">
                  {/* Тема */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Тема оформления</Label>
                    <Button 
                      variant="outline" 
                      className="h-12 w-full justify-between rounded-xl px-4"
                      onClick={() => setThemeDialogOpen(true)}
                      style={accentGlow}
                    >
                      <div className="flex items-center gap-3">
                        <Paintbrush className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{currentTheme.name}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </div>

                  {/* Язык */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Язык интерфейса</Label>
                    <div className="flex rounded-xl bg-accent/20 p-1">
                      <button 
                        onClick={() => onLanguageChange("ru")}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase transition",
                          language === "ru" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        RU
                      </button>
                      <button 
                        onClick={() => onLanguageChange("en")}
                        className={cn(
                          "flex-1 rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase transition",
                          language === "en" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  {/* Формат PGN */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground">Формат записи PGN</Label>
                    <Select value={pgnFormat} onValueChange={(v: any) => onPgnFormatChange(v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-accent/20 border-none font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border bg-card">
                        <SelectItem value="standard" className="rounded-lg">Стандартный</SelectItem>
                        <SelectItem value="short" className="rounded-lg">Краткий</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator className="bg-border/50" />

              {/* Обратная связь */}
              <section className="space-y-4">
                <Button 
                  variant="ghost" 
                  className="h-12 w-full justify-start gap-3 rounded-xl px-4 font-semibold"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Обратная связь
                </Button>
                <Button 
                  variant="ghost" 
                  className="h-12 w-full justify-start gap-3 rounded-xl px-4 font-semibold text-error hover:bg-error/10 hover:text-error"
                  onClick={onLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Выйти из системы
                </Button>
              </section>

              {/* Очистка данных */}
              <section className="pt-4">
                <Button 
                  variant="link" 
                  className="h-auto w-full p-0 text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted-foreground hover:text-error"
                  onClick={onClearAllData}
                >
                  Удалить все данные
                </Button>
              </section>
            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Мобильная нижняя панель — видна только на мобильном */}
      <div className="flex shrink-0 items-center justify-around border-t border-border bg-card/80 px-4 py-2 backdrop-blur-md md:hidden">
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <History className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">История</span>
        </button>
        <button
          onClick={() => setThemeDialogOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <Paintbrush className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Тема</span>
        </button>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Фидбек</span>
        </button>
        <button
          onClick={() => setMobileSettingsOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-primary"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Настройки</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition hover:text-error"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-normal sm:tracking-wider">Выйти</span>
        </button>
      </div>

      {/* Модальные окна */}
      <ThemeSelectorDialog
        open={themeDialogOpen}
        onOpenChange={setThemeDialogOpen}
        currentTheme={currentTheme}
        onSelect={onThemeChange}
      />

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md" style={accentGlow}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[10px] sm:text-xs sm:text-base sm:text-2xl font-black">
              <MessageSquare className="h-6 w-6 text-primary" />
              Обратная связь
            </DialogTitle>
            <DialogDescription>
              Мы будем рады услышать ваши предложения или отчеты об ошибках.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ваше сообщение..."
              className="min-h-[150px] w-full rounded-2xl border-none bg-accent/20 p-4 text-[11px] sm:text-sm outline-none ring-primary/20 transition focus:ring-4"
            />
            {feedbackError && <p className="text-[10px] sm:text-xs font-bold text-error">{feedbackError}</p>}
          </div>
          <DialogFooter>
            <Button
              disabled={!feedbackText.trim() || feedbackSaving}
              onClick={async () => {
                setFeedbackSaving(true)
                const err = await onSendFeedback(feedbackText)
                setFeedbackSaving(false)
                if (err) setFeedbackError(err)
                else {
                  setFeedbackOpen(false)
                  setFeedbackText("")
                  toast.success("Спасибо за отзыв!")
                }
              }}
              className="w-full rounded-xl py-6 font-bold uppercase tracking-wide sm:tracking-widest"
              style={accentGlow}
            >
              {feedbackSaving ? "Отправка..." : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="rounded-3xl border-border bg-card p-0 overflow-hidden dialog-wide flex flex-col" style={accentGlow}>
          {/* Header — fixed, не скроллится */}
          <div className="px-8 py-6 border-b border-border text-center shrink-0">
            <DialogTitle className="text-[10px] sm:text-xs sm:text-base sm:text-2xl font-black uppercase tracking-normal sm:tracking-wider text-center">Добавить дебют</DialogTitle>
            <DialogDescription className="text-center text-[11px] sm:text-sm text-muted-foreground mt-1">
              Введите параметры нового дебюта для вашей коллекции.
            </DialogDescription>
          </div>
          {/* Body — скроллится */}
          <div className="p-6">
            <AddOpeningForm 
              onSave={async (o) => {
                const err = await onAdd(o)
                if (!err) setAddDialogOpen(false)
                return err
              }} 
              isSaving={isSaving} 
              currentTheme={currentTheme} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Мобильный диалог настроек */}
      <Dialog open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
        <DialogContent className="rounded-2xl border-border bg-card p-0 w-[90vw] max-w-sm" style={accentGlow}>
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Settings className="h-4 w-4 text-primary" />
              Настройки
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 p-5">

            {/* Тема */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Тема оформления</Label>
              <Button
                variant="outline"
                className="h-10 w-full justify-between rounded-xl px-4"
                onClick={() => { setMobileSettingsOpen(false); setThemeDialogOpen(true) }}
                style={accentGlow}
              >
                <div className="flex items-center gap-2">
                  <Paintbrush className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{currentTheme.name}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </div>

            {/* Язык */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Язык интерфейса</Label>
              <div className="flex rounded-xl bg-accent/20 p-1">
                <button
                  onClick={() => onLanguageChange("ru")}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold uppercase transition",
                    language === "ru" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  RU
                </button>
                <button
                  onClick={() => onLanguageChange("en")}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold uppercase transition",
                    language === "en" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Формат PGN */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Формат записи PGN</Label>
              <Select value={pgnFormat} onValueChange={(v: any) => onPgnFormatChange(v)}>
                <SelectTrigger className="h-10 rounded-xl bg-accent/20 border-none font-semibold text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-card">
                  <SelectItem value="standard" className="rounded-lg">Стандартный</SelectItem>
                  <SelectItem value="short" className="rounded-lg">Краткий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Профиль */}
            <div className="rounded-xl border border-border bg-card/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <UserCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="text-xs font-medium truncate">{userEmail}</span>
              </div>
              <span className="text-xs font-black text-primary ml-3 shrink-0">
                {record !== null ? Math.round(record) : 0} rec
              </span>
            </div>

            {/* Опасная зона */}
            <div className="pt-1 border-t border-border flex flex-col gap-2">
              <Button
                variant="ghost"
                className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-xs font-semibold text-error hover:bg-error/10 hover:text-error"
                onClick={onClearAllData}
              >
                <Trash2 className="h-4 w-4" />
                Удалить все данные
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeletionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        deletionLogs={deletionLogs}
        currentTheme={currentTheme}
        onRestoreAll={onRestoreAll}
        onClearAll={onClearAllLogs}
        onRestore={onRestore}
        onStudy={onStudy}
        isSaving={isSaving}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="rounded-3xl border-border bg-card" style={accentGlow}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[11px] sm:text-sm sm:text-xl font-bold">
              <AlertTriangle className="h-5 w-5 text-error" />
              Удалить дебют?
            </DialogTitle>
            <DialogDescription>
              Это действие переместит дебют в историю удалений.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="rounded-xl">Отмена</Button>
            <Button variant="destructive" onClick={confirmDelete} className="rounded-xl">Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
