"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Enhanced Tooltip with more customization options
interface EnhancedTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  skipDelayDuration?: number
  disableHoverableContent?: boolean
  className?: string
  contentClassName?: string
  arrow?: boolean
  disabled?: boolean
}

const EnhancedTooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  EnhancedTooltipProps
>(({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 700,
  skipDelayDuration = 300,
  disableHoverableContent = false,
  className,
  contentClassName,
  arrow = true,
  disabled = false,
  ...props
}, ref) => {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <Tooltip>
        <TooltipTrigger asChild className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          ref={ref}
          side={side}
          align={align}
          className={cn(
            "relative max-w-xs break-words",
            arrow && "data-[side=bottom]:before:border-b-popover data-[side=left]:before:border-l-popover data-[side=right]:before:border-r-popover data-[side=top]:before:border-t-popover",
            contentClassName
          )}
          {...props}
        >
          {content}
          {arrow && (
            <TooltipPrimitive.Arrow
              className="fill-popover stroke-border stroke-1"
              width={11}
              height={5}
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
EnhancedTooltip.displayName = "EnhancedTooltip"

// Quick Tooltip for simple use cases
interface QuickTooltipProps {
  text: string
  children: React.ReactNode
  className?: string
}

const QuickTooltip: React.FC<QuickTooltipProps> = ({
  text,
  children,
  className
}) => (
  <EnhancedTooltip
    content={text}
    className={className}
    delayDuration={500}
  >
    {children}
  </EnhancedTooltip>
)

// Info Tooltip with icon
interface InfoTooltipProps {
  title?: string
  description: string
  children: React.ReactNode
  variant?: "default" | "info" | "warning" | "error" | "success"
  className?: string
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  description,
  children,
  variant = "default",
  className
}) => {
  const variantStyles = {
    default: "bg-popover text-popover-foreground border-border",
    info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800",
    warning: "bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800",
    error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
    success: "bg-green-50 text-green-900 border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-800"
  }

  const content = (
    <div className="space-y-1">
      {title && (
        <div className="font-medium text-sm">{title}</div>
      )}
      <div className="text-xs opacity-90">{description}</div>
    </div>
  )

  return (
    <EnhancedTooltip
      content={content}
      contentClassName={cn(
        "p-3 max-w-sm",
        variantStyles[variant]
      )}
      className={className}
      delayDuration={300}
    >
      {children}
    </EnhancedTooltip>
  )
}

// Keyboard Shortcut Tooltip
interface KeyboardTooltipProps {
  keys: string[]
  description: string
  children: React.ReactNode
  className?: string
}

const KeyboardTooltip: React.FC<KeyboardTooltipProps> = ({
  keys,
  description,
  children,
  className
}) => {
  const content = (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs">{description}</div>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
              {key}
            </kbd>
            {index < keys.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  return (
    <EnhancedTooltip
      content={content}
      contentClassName="p-3"
      className={className}
    >
      {children}
    </EnhancedTooltip>
  )
}

// Status Tooltip with dot indicator
interface StatusTooltipProps {
  status: "online" | "offline" | "busy" | "away"
  message?: string
  children: React.ReactNode
  className?: string
}

const StatusTooltip: React.FC<StatusTooltipProps> = ({
  status,
  message,
  children,
  className
}) => {
  const statusConfig = {
    online: { color: "bg-green-500", label: "Online" },
    offline: { color: "bg-gray-400", label: "Offline" },
    busy: { color: "bg-red-500", label: "Busy" },
    away: { color: "bg-yellow-500", label: "Away" }
  }

  const config = statusConfig[status]

  const content = (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", config.color)} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{config.label}</span>
        {message && (
          <span className="text-xs text-muted-foreground">{message}</span>
        )}
      </div>
    </div>
  )

  return (
    <EnhancedTooltip
      content={content}
      contentClassName="p-2"
      className={className}
    >
      {children}
    </EnhancedTooltip>
  )
}

// Rich Tooltip with custom content
interface RichTooltipProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  disabled?: boolean
}

const RichTooltip: React.FC<RichTooltipProps & { content: React.ReactNode }> = ({
  content,
  children,
  className,
  contentClassName,
  side,
  align,
  delayDuration,
  disabled
}) => (
  <EnhancedTooltip
    content={content}
    side={side}
    align={align}
    delayDuration={delayDuration}
    disabled={disabled}
    className={className}
    contentClassName={cn("p-0", contentClassName)}
  >
    {children}
  </EnhancedTooltip>
)

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  EnhancedTooltip,
  QuickTooltip,
  InfoTooltip,
  KeyboardTooltip,
  StatusTooltip,
  RichTooltip
}