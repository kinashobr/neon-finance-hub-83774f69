import { useState } from "react";
import { 
  Settings, X, GripVertical, Eye, EyeOff, 
  RotateCcw, Columns2, Columns3, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardSection {
  id: string;
  nome: string;
  visivel: boolean;
  ordem: number;
}

interface DashboardCustomizerProps {
  sections: DashboardSection[];
  layout: "2col" | "3col" | "fluid";
  onSectionsChange: (sections: DashboardSection[]) => void;
  onLayoutChange: (layout: "2col" | "3col" | "fluid") => void;
  onReset: () => void;
}

export function DashboardCustomizer({
  sections,
  layout,
  onSectionsChange,
  onLayoutChange,
  onReset,
}: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false);

  const toggleVisibility = (sectionId: string) => {
    onSectionsChange(
      sections.map(s => 
        s.id === sectionId ? { ...s, visivel: !s.visivel } : s
      )
    );
  };

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    onSectionsChange(
      newSections.map((s, i) => ({ ...s, ordem: i }))
    );
  };

  const layoutOptions = [
    { value: "2col", label: "2 Colunas", icon: Columns2 },
    { value: "3col", label: "3 Colunas", icon: Columns3 },
    { value: "fluid", label: "Fluido", icon: LayoutGrid },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[350px] bg-card border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Personalizar Dashboard
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              Resetar
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Layout */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Layout</Label>
            <div className="grid grid-cols-3 gap-2">
              {layoutOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={layout === opt.value ? "default" : "outline"}
                  size="sm"
                  className="flex-col h-16 gap-1"
                  onClick={() => onLayoutChange(opt.value)}
                >
                  <opt.icon className="h-4 w-4" />
                  <span className="text-xs">{opt.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Seções</Label>
            <div className="space-y-2">
              {sections
                .sort((a, b) => a.ordem - b.ordem)
                .map((section, index) => (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30",
                      !section.visivel && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-sm">{section.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveSection(section.id, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveSection(section.id, "down")}
                        disabled={index === sections.length - 1}
                      >
                        ↓
                      </Button>
                      <Switch
                        checked={section.visivel}
                        onCheckedChange={() => toggleVisibility(section.id)}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
