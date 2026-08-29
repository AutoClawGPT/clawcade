'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type DropdownMenuProps = {
  children: React.ReactNode;
};

type DropdownMenuTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
};

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// Simple dropdown using state — no external deps
function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

const DropdownContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { open, setOpen } = React.useContext(DropdownContext);
  return (
    <button onClick={() => setOpen(!open)} className="cursor-pointer">
      {children}
    </button>
  );
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align = 'center', children, ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 mt-2 min-w-[8rem] rounded-md border border-border bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95',
        align === 'end' && 'right-0',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

function DropdownMenuItem({
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = React.useContext(DropdownContext);
  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground',
        className
      )}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2 py-1.5 text-sm font-semibold', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
