"use client"

import { AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorNoticeProps {
  title: string
  message: string
  onDismiss?: () => void
}

export function ErrorNotice({ title, message, onDismiss }: ErrorNoticeProps) {
  return (
    <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-left">
      <AlertCircle className="h-4 w-4" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-1">{message}</AlertDescription>
        </div>
        {onDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="-mr-2 -mt-2 rounded-full text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            onClick={onDismiss}
            aria-label="Скрыть сообщение об ошибке"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}
