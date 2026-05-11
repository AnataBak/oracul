"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Check, Eye, EyeOff, HelpCircle, Send, Settings2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ARTWORK_SELECTION_STRICTNESS_OPTIONS,
  getArtworkSelectionStrictnessOption,
  type ArtworkSelectionStrictness,
} from "@/lib/artwork-selection-strictness"
import { ORACLE_VOICE_OPTIONS, type OracleVoice } from "@/lib/oracle-voices"
import { DailyArtOrb } from "./daily-art-orb"

interface InputStateProps {
  value: string
  selectedVoice: OracleVoice
  visualAnalysisEnabled: boolean
  selectionStrictness: ArtworkSelectionStrictness
  onChange: (value: string) => void
  onVoiceChange: (value: OracleVoice) => void
  onVisualAnalysisChange: (value: boolean) => void
  onSelectionStrictnessChange: (value: ArtworkSelectionStrictness) => void
  onSubmit: () => void
}

function HelpButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:p-2"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <HelpCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    </button>
  )
}

function HelpPanel({
  text,
  onClose,
}: {
  text: string
  onClose: () => void
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-left text-sm leading-relaxed text-muted-foreground">
      <div className="flex items-start justify-between gap-3">
        <p>{text}</p>
        <button
          type="button"
          className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label="Закрыть подсказку"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SlidingLabel({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [slideDistance, setSlideDistance] = useState(0)

  useEffect(() => {
    const updateSlideDistance = () => {
      const container = containerRef.current
      const label = textRef.current

      if (!container || !label) {
        return
      }

      setSlideDistance(Math.max(0, label.scrollWidth - container.clientWidth))
    }

    updateSlideDistance()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSlideDistance)
      return () => window.removeEventListener("resize", updateSlideDistance)
    }

    const resizeObserver = new ResizeObserver(updateSlideDistance)

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    if (textRef.current) {
      resizeObserver.observe(textRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [text])

  return (
    <span ref={containerRef} className="block min-w-0 overflow-hidden whitespace-nowrap">
      <span
        ref={textRef}
        className={slideDistance > 0 ? "inline-block animate-strictness-label-pan" : "inline-block"}
        style={
          slideDistance > 0
            ? ({ "--strictness-label-slide": `-${slideDistance}px` } as CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </span>
  )
}

export function InputState({
  value,
  selectedVoice,
  visualAnalysisEnabled,
  selectionStrictness,
  onChange,
  onVoiceChange,
  onVisualAnalysisChange,
  onSelectionStrictnessChange,
  onSubmit,
}: InputStateProps) {
  const selectedVoiceOption =
    ORACLE_VOICE_OPTIONS.find((voice) => voice.id === selectedVoice) || ORACLE_VOICE_OPTIONS[0]
  const selectedStrictnessOption = getArtworkSelectionStrictnessOption(selectionStrictness)
  const [openSettingsHelpId, setOpenSettingsHelpId] = useState<string | null>(null)
  const [isEyeHelpOpen, setIsEyeHelpOpen] = useState(false)
  const eyeHelpText = visualAnalysisEnabled
    ? "Глаз открыт: нейросеть визуально оценивает выбранную картину и сверяет изображение с музейным описанием."
    : "Глаз закрыт: поиск и ответ строятся только по музейному описанию, без визуальной оценки изображения."

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="animate-fade-in flex w-full flex-col items-center gap-6 text-center md:gap-7">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <DailyArtOrb />
        </div>
      </div>

      <div className="space-y-5">
        <h1 className="font-serif text-5xl leading-none tracking-tight text-foreground text-balance md:text-6xl lg:text-7xl">
          Арт-Оракул
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
          Напишите, что происходит внутри. Оракул пройдёт по залам мировых музеев
          и подберёт картину, которая ответит именно вашему настроению.
        </p>
      </div>

      <div className="w-full max-w-3xl">
        <div className="relative overflow-hidden rounded-[2rem] border-y border-accent/25 bg-card/45 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/30 md:p-6">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Сегодня я чувствую себя..."
              className="w-full min-h-[170px] resize-none rounded-[1.75rem] bg-secondary/30 p-5 pr-28 text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/35 md:min-h-[220px] md:text-xl"
              autoFocus
            />
            <span className="pointer-events-none absolute right-4 top-4 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
              Ctrl + Enter
            </span>
          </div>

          <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {value.length > 0
                ? `${value.length} символов`
                : "Опишите своё настроение или мысли"}
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <div className="flex min-w-0 items-center justify-between gap-1 rounded-full border border-border/80 bg-background/55 p-1 sm:justify-start sm:gap-2">
                <Button
                  type="button"
                  variant={visualAnalysisEnabled ? "default" : "outline"}
                  size="icon"
                  aria-label={
                    visualAnalysisEnabled
                      ? "Выключить визуальный анализ"
                      : "Включить визуальный анализ"
                  }
                  aria-pressed={visualAnalysisEnabled}
                  className="size-9 rounded-full"
                  onClick={() => onVisualAnalysisChange(!visualAnalysisEnabled)}
                >
                  {visualAnalysisEnabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>

                <Popover open={isEyeHelpOpen} onOpenChange={setIsEyeHelpOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
                      aria-label="Что значит глаз"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[calc(100vw-2rem)] rounded-2xl border-border p-3 sm:w-72">
                    <HelpPanel text={eyeHelpText} onClose={() => setIsEyeHelpOpen(false)} />
                  </PopoverContent>
                </Popover>

                <Popover
                  onOpenChange={(open) => {
                    if (!open) {
                      setOpenSettingsHelpId(null)
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2 rounded-full px-3 text-muted-foreground hover:text-foreground"
                    >
                      <Settings2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Настройки</span>
                      <span aria-hidden="true">{selectedVoiceOption.icon}</span>
                      <span aria-hidden="true">{selectedStrictnessOption.icon}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[calc(100vw-2rem)] rounded-2xl border-border p-3 sm:w-80">
                  <div className="mb-3 px-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Голос ответа</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Выберите, как оракул прочитает найденную картину.
                    </p>
                  </div>

                  <div className="space-y-1">
                    {ORACLE_VOICE_OPTIONS.map((voice) => {
                      const isSelected = voice.id === selectedVoice

                      return (
                        <div key={voice.id} className="space-y-2">
                          <div
                            className={`flex items-center gap-2 rounded-xl border p-1 transition-colors ${
                              isSelected
                                ? "border-primary/30 bg-primary/10"
                                : "border-transparent hover:bg-primary/5"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onVoiceChange(voice.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left"
                            >
                              <span className="text-lg" aria-hidden="true">{voice.icon}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground">{voice.label}</span>
                              </span>
                              {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                            </button>

                            <HelpButton
                              label={`Что значит ${voice.label}`}
                              onClick={() =>
                                setOpenSettingsHelpId(openSettingsHelpId === voice.id ? null : voice.id)
                              }
                            />
                          </div>
                          {openSettingsHelpId === voice.id ? (
                            <HelpPanel
                              text={voice.description}
                              onClose={() => setOpenSettingsHelpId(null)}
                            />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="my-4 h-px bg-border" />

                  <div className="mb-3 px-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Строгость подбора</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Насколько буквально искать картину под ваш текст.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {ARTWORK_SELECTION_STRICTNESS_OPTIONS.map((option) => {
                      const isSelected = option.id === selectionStrictness

                      return (
                        <div key={option.id} className="space-y-2">
                          <div
                            className={`flex items-center gap-0.5 rounded-xl border p-1 transition-colors sm:gap-1 ${
                              isSelected
                                ? "border-primary/30 bg-primary/10"
                                : "border-border bg-background/40 hover:bg-primary/5"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectionStrictnessChange(option.id)}
                              className="min-w-0 flex-1 rounded-lg px-1.5 py-2 text-left sm:px-2"
                            >
                              <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-foreground sm:gap-2 sm:text-sm">
                                <span className="shrink-0" aria-hidden="true">{option.icon}</span>
                                <SlidingLabel text={option.label} />
                              </span>
                            </button>
                            <HelpButton
                              label={`Что значит ${option.label}`}
                              onClick={() =>
                                setOpenSettingsHelpId(
                                  openSettingsHelpId === option.id ? null : option.id,
                                )
                              }
                            />
                          </div>
                          {openSettingsHelpId === option.id ? (
                            <HelpPanel
                              text={option.description}
                              onClose={() => setOpenSettingsHelpId(null)}
                            />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={onSubmit}
                disabled={!value.trim()}
                className="h-12 rounded-full bg-primary px-6 text-base text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <span className="mr-2">Найти картину</span>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Можно начать с одного слова
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Спокойствие", "Вдохновение", "Меланхолия", "Радость", "Задумчивость"].map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => onChange(value + (value ? " " : "") + mood.toLowerCase())}
              className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/15 hover:text-foreground"
            >
              {mood}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
