"use client"

import { type ReactNode, useState } from "react"
import { ArrowDown, ArrowUp, RotateCcw, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useGeminiTextChain, useGeminiTtsChain } from "@/lib/model-preferences"

interface ChainEditorProps<T extends string> {
  title: string
  description: string
  chain: T[]
  defaultChain: readonly T[]
  isCustom: boolean
  moveUp: (index: number) => void
  moveDown: (index: number) => void
  reset: () => void
}

function ChainEditor<T extends string>({
  title,
  description,
  chain,
  defaultChain,
  isCustom,
  moveUp,
  moveDown,
  reset,
}: ChainEditorProps<T>) {
  const lastIndex = chain.length - 1

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <ol className="space-y-2">
        {chain.map((model, index) => {
          const isFirst = index === 0
          const isLast = index === lastIndex
          const defaultPosition = defaultChain.indexOf(model)
          const movedFromDefault = defaultPosition !== index

          return (
            <li
              key={model}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
            >
              <span className="text-xs font-mono w-6 text-center text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-mono break-all">{model}</div>
                {movedFromDefault ? (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    стандартное место: {defaultPosition + 1}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveUp(index)}
                  disabled={isFirst}
                  aria-label={`Поднять ${model} на одну позицию вверх`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveDown(index)}
                  disabled={isLast}
                  aria-label={`Опустить ${model} на одну позицию вниз`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {isCustom ? "Используется твой порядок." : "Стандартный порядок."}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={!isCustom}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Сбросить
        </Button>
      </div>
    </section>
  )
}

interface ModelChainSettingsProps {
  trigger?: ReactNode
}

export function ModelChainSettings({ trigger }: ModelChainSettingsProps) {
  const [open, setOpen] = useState(false)
  const textChain = useGeminiTextChain()
  const ttsChain = useGeminiTtsChain()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            Настройки моделей
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройки моделей</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Здесь можно поменять порядок, в котором сервер пробует модели Gemini.
            Сохраняется только в этом браузере; для других пользователей не меняется.
            Если что-то сломаешь — кнопка «Сбросить» вернёт стандартный порядок.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <ChainEditor
            title="Текстовая модель терапевта (/api/art)"
            description="Используется и для подбора ключевых слов, и для генерации самого ответа терапевта."
            {...textChain}
          />
          <ChainEditor
            title="Озвучка ответа (/api/tts)"
            description="Кнопка «Прослушать голосом». Pro-модель на free-tier обычно отвечает 429 — её разумно держать в конце."
            {...ttsChain}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
