import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Wallet, PiggyBank, TrendingUp, Shield, Target, Bitcoin } from "lucide-react";
import { ContaCorrente, AccountType, ACCOUNT_TYPE_LABELS, generateAccountId } from "@/types/finance";
import { toast } from "sonner";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: ContaCorrente;
  onSubmit: (account: ContaCorrente) => void;
  onDelete?: (accountId: string) => void;
  hasTransactions?: boolean;
}

const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof Building2> = {
  conta_corrente: Building2,
  aplicacao_renda_fixa: TrendingUp,
  poupanca: PiggyBank,
  criptoativos: Bitcoin,
  reserva_emergencia: Shield,
  objetivos_financeiros: Target,
};

export function AccountFormModal({
  open,
  onOpenChange,
  account,
  onSubmit,
  onDelete,
  hasTransactions = false
}: AccountFormModalProps) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("conta_corrente");
  const [institution, setInstitution] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [currency, setCurrency] = useState("BRL");

  const isEditing = !!account;

  useEffect(() => {
    if (open && account) {
      setName(account.name);
      setAccountType(account.accountType || 'conta_corrente');
      setInstitution(account.institution || "");
      setInitialBalance(account.initialBalance.toString());
      setCurrency(account.currency);
    } else if (open) {
      setName("");
      setAccountType("conta_corrente");
      setInstitution("");
      setInitialBalance("");
      setCurrency("BRL");
    }
  }, [open, account]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Nome da conta é obrigatório");
      return;
    }

    const parsedBalance = parseFloat(initialBalance.replace(',', '.')) || 0;

    const newAccount: ContaCorrente = {
      id: account?.id || generateAccountId(),
      name: name.trim(),
      accountType,
      institution: institution.trim() || undefined,
      currency,
      initialBalance: parsedBalance,
      color: account?.color || 'hsl(var(--primary))',
      icon: account?.icon || 'building-2',
      createdAt: account?.createdAt || new Date().toISOString(),
      meta: account?.meta || {}
    };

    onSubmit(newAccount);
    onOpenChange(false);
    toast.success(isEditing ? "Conta atualizada!" : "Conta criada!");
  };

  const handleDelete = () => {
    if (!account) return;
    
    if (hasTransactions) {
      toast.error("Não é possível excluir uma conta com transações vinculadas");
      return;
    }

    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      onDelete?.(account.id);
      onOpenChange(false);
      toast.success("Conta excluída!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {isEditing ? "Editar Conta" : "Nova Conta Movimento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize os dados da conta" 
              : "Adicione uma nova conta para controlar suas movimentações"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              placeholder="Ex: Conta Corrente Banco X"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Tipo de Conta *</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => {
                  const Icon = ACCOUNT_TYPE_ICONS[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {ACCOUNT_TYPE_LABELS[type]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Instituição</Label>
            <Input
              id="institution"
              placeholder="Ex: Banco do Brasil"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Saldo Inicial</Label>
              <Input
                id="initialBalance"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL - Real</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {isEditing && onDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={hasTransactions}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Salvar" : "Criar Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
