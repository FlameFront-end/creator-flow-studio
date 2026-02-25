import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/shared/components/ui/dialog'

type ModalClassNames = {
  overlay?: string
  content?: string
  header?: string
  title?: string
  body?: string
}

type ModalProps = {
  opened: boolean
  onClose: () => void
  title?: ReactNode
  size?: string | number
  className?: string
  classNames?: ModalClassNames
  withCloseButton?: boolean
  centered?: boolean
  children?: ReactNode
}

const modalSizeMap: Record<string, string> = {
  xs: '360px',
  sm: '420px',
  md: '520px',
  lg: '680px',
  xl: '820px',
}

export function Modal({
  opened,
  onClose,
  title,
  size = 'md',
  className,
  classNames,
  withCloseButton = true,
  centered = false,
  children,
}: ModalProps) {
  const maxWidth = typeof size === 'number' ? `${size}px` : modalSizeMap[size] ?? size

  return (
    <Dialog
      open={opened}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay className={cn('appui-Modal-overlay', classNames?.overlay)} />
        <DialogContent
          className={cn('appui-Modal-content', centered ? 'top-1/2' : undefined, className, classNames?.content)}
          style={{ maxWidth }}
        >
          {title ? (
            <DialogHeader className={cn('appui-Modal-header', classNames?.header)}>
              <DialogTitle className={cn('appui-Modal-title', classNames?.title)}>{title}</DialogTitle>
            </DialogHeader>
          ) : null}
          {!withCloseButton ? <DialogClose className="hidden" /> : null}
          <div className={cn('appui-Modal-body', classNames?.body)}>{children}</div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

