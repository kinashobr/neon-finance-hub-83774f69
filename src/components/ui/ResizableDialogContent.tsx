import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DialogContent, DialogContentProps } from "@/components/ui/dialog";

// Helper to load/save dimensions
const loadDimensions = (key: string, initial: number, min: number, max: number): number => {
  if (typeof window === 'undefined') return initial;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const value = parseInt(saved);
      return Math.min(max, Math.max(min, value));
    }
  } catch (e) {
    console.error(`Failed to load dimension for ${key}`, e);
  }
  return initial;
};

interface ResizableDialogContentProps extends DialogContentProps {
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  storageKey: string;
  className?: string;
}

export function ResizableDialogContent({
  children,
  initialWidth = 900,
  initialHeight = 600,
  minWidth = 700,
  minHeight = 500,
  maxWidth = 1400,
  maxHeight = 900,
  storageKey,
  className,
  ...props
}: ResizableDialogContentProps) {
  
  const [width, setWidth] = useState(() => 
    loadDimensions(`${storageKey}_width`, initialWidth, minWidth, maxWidth)
  );
  const [height, setHeight] = useState(() => 
    loadDimensions(`${storageKey}_height`, initialHeight, minHeight, maxHeight)
  );
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  // Save dimensions on change
  useEffect(() => {
    localStorage.setItem(`${storageKey}_width`, width.toString());
    localStorage.setItem(`${storageKey}_height`, height.toString());
  }, [width, height, storageKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    startWidth.current = width;
    startHeight.current = height;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;

    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight.current + deltaY));

    setWidth(newWidth);
    setHeight(newHeight);
  }, [isResizing, minWidth, minHeight, maxWidth, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'nwse-resize';
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

  const style = {
    width: `${width}px`,
    height: `${height}px`,
    // Override Radix defaults that might be set by shadcn/ui DialogContent
    maxWidth: 'none',
    maxHeight: 'none',
  };

  return (
    <DialogContent
      {...props}
      className={cn(
        // Remove default size constraints and ensure flex column layout for internal content
        "max-w-none max-h-none p-0 flex flex-col", 
        isResizing && "transition-none",
        className
      )}
      style={style}
    >
      {children}
      
      {/* Resizer Handle (Bottom Right) */}
      <div
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize z-50 transition-colors bg-primary/50 hover:bg-primary rounded-tl-lg"
        onMouseDown={handleMouseDown}
        title="Arraste para redimensionar"
      />
    </DialogContent>
  );
}