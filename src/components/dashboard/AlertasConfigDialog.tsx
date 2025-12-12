import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Target,
  Save
} from "lucide-react";

interface AlertaConfig {
  id: string;
  nome: string;
  ativo: boolean;
  tolerancia: number;
}

interface AlertasConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AlertaConfig[];
  onSave: (config: AlertaConfig[]) => void;
}

const ALERTA_INFO: Record<string, { icon: React.ElementType; descricao: string; unidade: string }> = {
  "saldo-negativo": {
    icon: AlertTriangle,
    descricao: "Alerta quando o saldo total das contas ficar negativo",
    unidade: ""
  },
  "dividas-altas": {
    icon: Target,
    descricao: "Alerta quando dívidas ultrapassarem X% do saldo disponível",
    unidade: "%"
  },
  "margem-baixa": {
    icon: Target,
    descricao: "Alerta quando a margem de poupança ficar abaixo de X%",
    unidade: "%"
  },
  "emprestimos-pendentes": {
    icon: Target,
    descricao: "Alerta sobre empréstimos aguardando configuração",
    unidade: ""
  },
};

export function AlertasConfigDialog({ open, onOpenChange, config, onSave }: AlertasConfigDialogProps) {
  const [localConfig, setLocalConfig] = useState<AlertaConfig[]>(config);

  const handleToggle = (id: string) => {
    setLocalConfig(prev =>
      prev.map(c => (c.id === id ? { ...c, ativo: !c.ativo } : c))
    );
  };

  const handleToleranciaChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalConfig(prev =>
      prev.map(c => (c.id === id ? { ...c, tolerancia: numValue } : c))
    );
  };

  const handleSave = () => {
    onSave(localConfig);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Configurar Alertas
          </DialogTitle>
          <DialogDescription>
            Personalize quais alertas deseja receber e seus limites
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {localConfig.map((alerta, index) => {
            const info = ALERTA_INFO[alerta.id];
            const Icon = info?.icon || Target;

            return (
              <div key={alerta.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label className="font-medium">{alerta.nome}</Label>
                        <p className="text-xs text-muted-foreground">
                          {info?.descricao}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={alerta.ativo}
                      onCheckedChange={() => handleToggle(alerta.id)}
                    />
                  </div>

                  {alerta.ativo && info?.unidade && (
                    <div className="flex items-center gap-2 pl-11">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        Limite:
                      </Label>
                      <div className="relative flex-1 max-w-24">
                        <Input
                          type="number"
                          value={alerta.tolerancia}
                          onChange={(e) => handleToleranciaChange(alerta.id, e.target.value)}
                          className="h-8 text-sm pr-8"
                          min={0}
                          max={500}
                        />
                        {info.unidade && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {info.unidade}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Resetar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}