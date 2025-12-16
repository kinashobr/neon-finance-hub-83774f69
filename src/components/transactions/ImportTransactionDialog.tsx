import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Check, X, Loader2, AlertCircle } from "lucide-react";
import { ContaCorrente, TransacaoCompleta, Categoria, ImportedTransaction, StandardizationRule, OperationType, generateTransactionId } from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { parseDateLocal } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionReviewTable } from "./TransactionReviewTable"; // NEW IMPORT

interface ImportTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ContaCorrente;
}

// ============================================
// FUNÇÕES DE PARSING (Fase 2)
// ============================================

// Helper para normalizar valor (R$ 1.234,56 -> 1234.56)
const normalizeAmount = (amountStr: string): number => {
    // Remove R$, pontos de milhar e substitui vírgula por ponto decimal
    const cleaned = amountStr.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

// Helper para normalizar data OFX (YYYYMMDD -> YYYY-MM-DD)
const normalizeOfxDate = (dateStr: string): string => {
    if (dateStr.length >= 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
};

// Parsing CSV (Modelo Nubank: Data, Valor, Identificador, Descrição)
const parseCSV = (content: string, accountId: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase();
    const dataIndex = header.includes('data') ? header.split('\t').findIndex(h => h.includes('data')) : -1;
    const valorIndex = header.includes('valor') ? header.split('\t').findIndex(h => h.includes('valor')) : -1;
    const descIndex = header.includes('descri') ? header.split('\t').findIndex(h => h.includes('descri')) : -1;

    if (dataIndex === -1 || valorIndex === -1 || descIndex === -1) {
        throw new Error("CSV inválido. Colunas 'Data', 'Valor' e 'Descrição' são obrigatórias.");
    }

    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length > Math.max(dataIndex, valorIndex, descIndex)) {
            const dateStr = cols[dataIndex].trim();
            const amountStr = cols[valorIndex].trim();
            const originalDescription = cols[descIndex].trim();
            
            if (!dateStr || !amountStr || !originalDescription) continue;

            const amount = normalizeAmount(amountStr);
            
            // Tenta converter a data (pode ser DD/MM/YYYY ou YYYY-MM-DD)
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType: amount < 0 ? 'despesa' : 'receita', // Fluxo inicial baseado no sinal
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                sourceType: 'csv',
            });
        }
    }
    return transactions;
};

// Parsing OFX (SGML - usando regex tolerante)
const parseOFX = (content: string, accountId: string): ImportedTransaction[] => {
    const transactions: ImportedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;

    while ((match = stmtTrnRegex.exec(content)) !== null) {
        const stmtTrnBlock = match[1];
        
        const trnTypeMatch = stmtTrnBlock.match(/<TRNTYPE>(\w+)/);
        const dtPostedMatch = stmtTrnBlock.match(/<DTPOSTED>(\d+)/);
        const trnAmtMatch = stmtTrnBlock.match(/<TRNAMT>([\d.-]+)/);
        const fitIdMatch = stmtTrnBlock.match(/<FITID>([\s\S]*?)</);
        const memoMatch = stmtTrnBlock.match(/<MEMO>([\s\S]*?)</);

        if (dtPostedMatch && trnAmtMatch && memoMatch) {
            const dateStr = dtPostedMatch[1];
            const amount = parseFloat(trnAmtMatch[1]);
            const originalDescription = memoMatch[1].trim();
            
            if (isNaN(amount)) continue;

            const normalizedDate = normalizeOfxDate(dateStr);
            
            // OFX usa sinal: negativo = débito (despesa), positivo = crédito (receita)
            const operationType: OperationType = amount < 0 ? 'despesa' : 'receita';

            transactions.push({
                id: generateTransactionId(),
                date: normalizedDate,
                amount: Math.abs(amount),
                originalDescription,
                accountId,
                categoryId: null,
                operationType,
                description: originalDescription,
                isTransfer: false,
                destinationAccountId: null,
                sourceType: 'ofx',
            });
        }
    }
    return transactions;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ImportTransactionDialog({ open, onOpenChange, account }: ImportTransactionDialogProps) {
  const { 
    categoriasV2, 
    contasMovimento, 
    standardizationRules, 
    addStandardizationRule,
    addTransacaoV2,
  } = useFinance();
  
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [loading, setLoading] = useState(false);
  const [importedTransactions, setImportedTransactions] = useState<ImportedTransaction[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Aplica as regras de padronização
  const applyRules = useCallback((transactions: ImportedTransaction[], rules: StandardizationRule[]): ImportedTransaction[] => {
    return transactions.map(tx => {
      let updatedTx = { ...tx };
      const originalDesc = tx.originalDescription.toLowerCase();
      
      for (const rule of rules) {
        if (originalDesc.includes(rule.pattern.toLowerCase())) {
          // Aplica a regra
          updatedTx.categoryId = rule.categoryId;
          updatedTx.operationType = rule.operationType;
          updatedTx.description = rule.descriptionTemplate;
          
          // Se a regra for de transferência, marca como tal
          if (rule.operationType === 'transferencia') {
              updatedTx.isTransfer = true;
              // Nota: destinationAccountId será preenchido manualmente na revisão
          }
          
          // Aplica a primeira regra que corresponder e sai
          break;
        }
      }
      return updatedTx;
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecione um arquivo para importar.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const content = await file.text();
      let rawTransactions: ImportedTransaction[] = [];
      
      if (content.toLowerCase().includes('<ofx>')) {
        rawTransactions = parseOFX(content, account.id);
      } else if (content.includes('\t') || content.includes(',')) {
        // Assume CSV se contiver tab ou vírgula (Nubank usa tab)
        rawTransactions = parseCSV(content, account.id);
      } else {
        setError("Formato de arquivo não reconhecido. Use .csv ou .ofx.");
        return;
      }
      
      if (rawTransactions.length === 0) {
        setError("Nenhuma transação válida encontrada no arquivo.");
        return;
      }
      
      // Aplica as regras de padronização
      const processedTransactions = applyRules(rawTransactions, standardizationRules);
      
      setImportedTransactions(processedTransactions);
      setStep('review');
      
    } catch (e: any) {
      console.error("Parsing Error:", e);
      setError(e.message || "Erro ao processar o arquivo. Verifique o formato.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleContabilizar = () => {
    // Lógica de contabilização será implementada na Fase 3
    toast.info("Contabilização em desenvolvimento (Fase 3)");
    onOpenChange(false);
  };
  
  const handleUpdateTransaction = (id: string, updates: Partial<ImportedTransaction>) => {
    setImportedTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
  };
  
  const handleCreateRule = (tx: ImportedTransaction) => {
    // Lógica de criação de regra será implementada na Fase 3
    toast.info(`Criação de regra para "${tx.originalDescription}" em desenvolvimento (Fase 3)`);
  };

  const renderContent = () => {
    if (step === 'upload') {
      return (
        <div className="space-y-6">
          <div className="p-6 border-2 border-dashed border-border rounded-lg text-center space-y-3">
            <Upload className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-medium">Arraste e solte ou clique para selecionar o arquivo</p>
            <Input 
              type="file" 
              accept=".csv,.ofx" 
              onChange={handleFileChange} 
              className="hidden" 
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {file ? file.name : "Selecionar Arquivo (.csv, .ofx)"}
            </Label>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || loading} 
            className="w-full bg-neon-gradient hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {loading ? "Processando..." : "Carregar Transações"}
          </Button>
        </div>
      );
    }
    
    if (step === 'review') {
      return (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-primary">
                {importedTransactions.length} transações prontas para revisão.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                Conta de Origem: {account.name}
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Trocar Arquivo
            </Button>
          </div>
          
          <ScrollArea className="h-[50vh] max-h-[500px] border rounded-lg">
            <TransactionReviewTable
                transactions={importedTransactions}
                accounts={contasMovimento}
                categories={categoriasV2}
                onUpdateTransaction={handleUpdateTransaction}
                onCreateRule={handleCreateRule}
            />
          </ScrollArea>
          
          <Button 
            onClick={handleContabilizar} 
            className="w-full bg-success hover:bg-success/90"
          >
            Contabilizar Lançamentos ({importedTransactions.length})
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importar Extrato - {account.name}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' 
              ? "Carregue um arquivo CSV (Nubank) ou OFX para iniciar a conciliação."
              : "Revise e categorize as transações importadas antes de contabilizar."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}