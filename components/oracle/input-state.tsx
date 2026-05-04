"use client"

import { Eye, EyeOff, Palette, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ORACLE_VOICE_OPTIONS, type OracleVoice } from "@/lib/oracle-voices"

interface InputStateProps {
  value: string
  selectedVoice: OracleVoice
  visualAnalysisEnabled: boolean
  onChange: (value: string) => void
  onVoiceChange: (value: OracleVoice) => void
  onVisualAnalysisChange: (value: boolean) => void
  onSubmit: () => void
}

export function InputState({
  value,
  selectedVoice,
  visualAnalysisEnabled,
  onChange,
  onVoiceChange,
  onVisualAnalysisChange,
  onSubmit,
}: InputStateProps) {
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

          <div className="mt-5 space-y-3 text-left">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Голос ответа</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ORACLE_VOICE_OPTIONS.map((voice) => {
                const isSelected = voice.id === selectedVoice

                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => onVoiceChange(voice.id)}
                    className={`rounded-xl border p-3 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-border bg-background/40 hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
                      <span aria-hidden="true">{voice.icon}</span>
                      {voice.label}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {voice.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onVisualAnalysisChange(!visualAnalysisEnabled)}
            className={`mt-4 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
              visualAnalysisEnabled
                ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                : "border-border bg-background/40 hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            <span className="mt-0.5 text-primary">
              {visualAnalysisEnabled ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">
                {visualAnalysisEnabled ? "Визуальный анализ включён" : "Визуальный анализ выключен"}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {visualAnalysisEnabled
                  ? "Оракул посмотрит изображение картины и сверит его с музейным описанием."
                  : "Оракул будет опираться только на музейную карточку, как раньше."}
              </span>
            </span>
          </button>
          
          {/* Разделитель */}
          <div className="h-px bg-border my-4" />
          
          {/* Нижняя часть карточки */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {value.length > 0 
                ? `${value.length} символов` 
                : "Опишите своё настроение или мысли"}
            </p>
            
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
