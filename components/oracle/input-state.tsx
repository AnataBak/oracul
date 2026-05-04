"use client"

import { useState } from "react"
import { Check, Eye, EyeOff, HelpCircle, Palette, Send, Settings2, X } from "lucide-react"
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
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <HelpCircle className="h-4 w-4" />
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
    ? "Глаз открыт: Gemini получает изображение выбранной картины и сверяет его с музейным описанием."
    : "Глаз закрыт: ответ строится только по музейной карточке, без передачи изображения в Gemini."

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="animate-fade-in flex flex-col items-center text-center gap-10">
      {/* Логотип/Иконка */}
      <div className="relative">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Palette className="w-10 h-10 md:w-12 md:h-12 text-primary" />
        </div>
        <div className="absolute -inset-2 rounded-full border border-primary/20 animate-pulse" />
      </div>

      {/* Заголовок */}
      <div className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground tracking-tight text-balance">
          Арт-Оракул
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Расскажите, что у вас на душе, и мы подберём картину из коллекции 
          мировых музеев, которая откликнется именно вам
        </p>
      </div>

      {/* Карточка ввода */}
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg shadow-foreground/5 border border-border">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сегодня я чувствую себя..."
            className="w-full min-h-[140px] md:min-h-[160px] resize-none 
                       text-foreground text-lg md:text-xl leading-relaxed
                       placeholder:text-muted-foreground/60 
                       bg-transparent border-none focus:ring-0 focus:outline-none"
            autoFocus
          />

          {/* Разделитель */}
          <div className="h-px bg-border my-4" />
          
          {/* Нижняя часть карточки */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm">
              {value.length > 0 
                ? `${value.length} символов` 
                : "Опишите своё настроение или мысли"}
            </p>
            
            <div className="flex items-center justify-end gap-2">
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
                className="rounded-full"
                onClick={() => onVisualAnalysisChange(!visualAnalysisEnabled)}
              >
                {visualAnalysisEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>

              <Popover open={isEyeHelpOpen} onOpenChange={setIsEyeHelpOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
                    aria-label="Что значит глаз"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 rounded-2xl border-border p-3">
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
                    className="rounded-full px-3 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Настройки</span>
                    <span aria-hidden="true">{selectedVoiceOption.icon}</span>
                    <span aria-hidden="true">{selectedStrictnessOption.icon}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 rounded-2xl border-border p-3">
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

                  <div className="grid grid-cols-2 gap-2">
                    {ARTWORK_SELECTION_STRICTNESS_OPTIONS.map((option) => {
                      const isSelected = option.id === selectionStrictness

                      return (
                        <div key={option.id} className="space-y-2">
                          <div
                            className={`flex items-center gap-1 rounded-xl border p-1 transition-colors ${
                              isSelected
                                ? "border-primary/30 bg-primary/10"
                                : "border-border bg-background/40 hover:bg-primary/5"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectionStrictnessChange(option.id)}
                              className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left"
                            >
                              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <span aria-hidden="true">{option.icon}</span>
                                {option.label}
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

              <Button
                onClick={onSubmit}
                disabled={!value.trim()}
                className="rounded-full px-6 h-11 bg-primary hover:bg-primary/90 
                           text-primary-foreground transition-all duration-300 
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:shadow-lg hover:shadow-primary/20"
              >
                <span className="mr-2">Найти картину</span>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Подсказки настроений */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {["Спокойствие", "Вдохновение", "Меланхолия", "Радость", "Задумчивость"].map((mood) => (
          <button
            key={mood}
            onClick={() => onChange(value + (value ? " " : "") + mood.toLowerCase())}
            className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm
                       hover:bg-primary/10 hover:text-primary transition-colors duration-200
                       border border-transparent hover:border-primary/20"
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  )
}
