import React, { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResizableCardProps {
  children: ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey: string;
  className?: string;
  header?: ReactNode;
  title?: string;
}

export function ResizableCard({
  children,
  initialWidth = 300,
  minWidth = 200,
  maxWidth = 500,
  storageKey,
  className,
  header,
  title,
}: ResizableCardProps) {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(storageKey);
      return savedWidth ? Math.min(maxWidth, Math.max(minWidth, parseInt(savedWidth))) : initialWidth;
    }
    return initialWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    localStorage.setItem(storageKey, width.toString());
  }, [width, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX.current;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
    setWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Card
      style={{ width: `${width}px` }}
      className={cn(
        "glass-card stat-card-neutral relative flex flex-col",
        isResizing && "transition-none",
        className
      )}
    >
      {header || (title && (
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {title}
          </CardTitle>
        </CardHeader>
      ))}
      <CardContent className="p-4 pt-2 flex-1 overflow-y-auto">
        {children}
      </CardContent>
      
      {/* Resizer Handle */}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-50 transition-colors hover:bg-primary/20"
        onMouseDown={handleMouseDown}
        title="Arraste para redimensionar"
      />
    </Card>
  );
}