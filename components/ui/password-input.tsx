"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">

function PasswordInput(
  { className, ...props }: PasswordInputProps,
  ref: React.Ref<HTMLInputElement>,
) {
  const [visible, setVisible] = React.useState(false)
  const labelKey = visible ? "Скрыть пароль" : "Показать пароль"

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        aria-label={labelKey}
        aria-pressed={visible}
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        tabIndex={0}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

const ForwardedPasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(PasswordInput)
ForwardedPasswordInput.displayName = "PasswordInput"

export { ForwardedPasswordInput as PasswordInput }
