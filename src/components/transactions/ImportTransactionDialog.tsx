import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Check, X, Loader2, AlertCircle, Pin } from "lucide-react";
import { 
  ContaCorrente, TransacaoCompleta, Categoria, ImportedTransaction, StandardizationRule, OperationType, 
  generateTransactionId, generateTransferGroupId, getDomainFromOperation, TransferGroup, TransactionLinks
} from "@/types/finance";
import { useFinance } from "@/contexts/FinanceContext";
import { toast } from "sonner";
import { parseDateLocal, cn } from "@/lib/utils"; // <-- IMPORTANDO CN
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransactionReviewTable } from "./TransactionReviewTable";
import { StandardizationRuleFormModal } from "./StandardizationRuleFormModal"; // NEW IMPORT

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
    let cleaned = amountStr.trim();
    const isNegative = cleaned.startsWith('-');
    
    // Remove o sinal negativo para processamento
    if (isNegative) {
        cleaned = cleaned.substring(1);
    }
    
    // Remove caracteres não numéricos, exceto ponto e vírgula
    cleaned = cleaned.replace(/[^\d.,]/g, '');

    // Lógica de detecção de formato:
    if (cleaned.includes(',') && cleaned.includes('.')) {
        // Formato BR (milhar ponto, decimal vírgula): 1.234,56
        // Remove pontos de milhar e substitui vírgula por ponto decimal
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        // Formato BR simples (apenas vírgula como decimal): 1234,56
        cleaned = cleaned.replace(',', '.');
    } else if (cleaned.includes('.')) {
        // Formato US (ponto como decimal): 1234.56 ou 1,234.56
        // Se houver mais de um ponto, remove todos exceto o último (que é o decimal)
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            // Remove todos os pontos, exceto o último
            const lastPart = parts.pop();
            cleaned = parts.join('') + '.' + lastPart;
        }
    }
    
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) return 0;
    
    return isNegative ? -parsed : parsed;
};

// Helper para normalizar data OFX (YYYYMMDD -> YYYY-MM-DD)
const normalizeOfxDate = (dateStr: string): string => {
    if (dateStr.length >= 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
};

// Parsing CSV (Ajustado para ser mais flexível com separadores e formatos de data DD/MM/YYYY)
const parseCSV = (content: string, accountId: string): ImportedTransaction[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Tenta detectar o separador: tabulação ou vírgula
    const separator = lines[0].includes('\t') ? '\t' : ',';
    
    const header = lines[0].toLowerCase();
    const cols = header.split(separator);
    
    // Tenta encontrar as colunas por nome (tolerante a acentuação)
    const normalizeHeader = (h: string) => h.normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim();
    
    const dataIndex = cols.findIndex(h => normalizeHeader(h).includes('data'));
    const valorIndex = cols.findIndex(h => normalizeHeader(h).includes('valor'));
    const descIndex = cols.findIndex(h => normalizeHeader(h).includes('descri'));

    if (dataIndex === -1 || valorIndex === -1 || descIndex === -1) {
        throw new Error(`CSV inválido. Colunas 'Data', 'Valor' e 'Descrição' são obrigatórias. Separador detectado: '${separator}'`);
    }

    const transactions: ImportedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) {
        // Usa regex para dividir a linha, respeitando aspas se o separador for vírgula
        const lineCols = lines[i].split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (lineCols.length > Math.max(dataIndex, valorIndex, descIndex)) {
            const dateStr = lineCols[dataIndex];
            const amountStr = lineCols[valorIndex];
            const originalDescription = lineCols[descIndex];
            
            if (!dateStr || !amountStr || !originalDescription) continue;

            const amount = normalizeAmount(amountStr);
            
            // Tenta converter a data (DD/MM/YYYY -> YYYY-MM-DD)
            let normalizedDate = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    // Assume DD/MM/YYYY
                    normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            } else if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
                // Assume YYYY-MM-DD (já ok)
            } else {
                // Tenta normalizar data OFX se for o caso (embora OFX deva ser tratado separadamente)
                normalizedDate = normalizeOfxDate(dateStr);
            }
            
            // Validação básica de data
            if (normalizedDate.length < 10 || isNaN(parseDateLocal(normalizedDate).getTime())) {
                console.warn(`Data inválida ignorada: ${dateStr}`);
                continue;
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
  
  // State for Rule Creation Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [txToCreateRule, setTxToCreateRule] = useState<ImportedTransaction | null>(null);

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
              // Tenta preencher a conta destino se a regra for muito específica (opcional)
              // Por enquanto, deixamos null para revisão manual
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
      } else if (file.name.toLowerCase().endsWith('.csv') || content.includes('\t') || content.includes(',')) {
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
  
  const handleUpdateTransaction = (id: string, updates: Partial<ImportedTransaction>) => {
    setImportedTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx));
  };
  
  const handleCreateRule = (tx: ImportedTransaction) => {
    setTxToCreateRule(tx);
    setShowRuleModal(true);
  };
  
  const handleSaveRule = (rule: Omit<StandardizationRule, "id">) => {
    addStandardizationRule(rule);
    
    // Reaplicar regras nas transações importadas para ver o efeito imediato
    const reProcessedTransactions = applyRules(importedTransactions, [...standardizationRules, { ...rule, id: generateTransactionId() }]);
    setImportedTransactions(reProcessedTransactions);
  };

  const handleContabilizar = () => {
    const newTransactions: TransacaoCompleta[] = [];
    const transferGroups: TransferGroup[] = [];
    
    // 1. Validação final
    const incompleteTx = importedTransactions.filter(tx => 
        !tx.operationType || 
        (!tx.isTransfer && !tx.categoryId) || 
        (tx.isTransfer && !tx.destinationAccountId)
    );
    
    if (incompleteTx.length > 0) {
        toast.error(`Atenção: ${incompleteTx.length} transação(ões) não estão totalmente categorizadas ou configuradas.`);
        return;
    }
    
    // 2. Conversão e criação
    importedTransactions.forEach(tx => {
        const now = new Date().toISOString();
        const isTransfer = tx.operationType === 'transferencia';
        
        // Determina o fluxo (in/out)
        let flow: TransacaoCompleta['flow'] = 'out';
        if (tx.operationType === 'receita' || tx.operationType === 'rendimento' || tx.operationType === 'liberacao_emprestimo' || (tx.operationType === 'veiculo' && tx.amount > 0)) {
            flow = 'in';
        } else if (isTransfer) {
            // Transferência: a transação na conta de origem é 'transfer_out'
            flow = 'transfer_out';
        } else {
            flow = 'out';
        }
        
        // Transação principal (na conta importada)
        const primaryTx: TransacaoCompleta = {
            id: tx.id,
            date: tx.date,
            accountId: tx.accountId,
            flow: flow,
            operationType: tx.operationType!,
            domain: getDomainFromOperation(tx.operationType!),
            amount: tx.amount,
            categoryId: tx.categoryId || null,
            description: tx.description,
            links: {
                investmentId: null,
                loanId: null,
                transferGroupId: isTransfer ? generateTransferGroupId() : null,
                parcelaId: null,
                vehicleTransactionId: null,
            },
            conciliated: true, // Transações importadas são consideradas conciliadas
            attachments: [],
            meta: {
                createdBy: 'system',
                source: 'import',
                createdAt: now,
                originalDescription: tx.originalDescription, // <-- CORRIGIDO
            }
        };
        
        newTransactions.push(primaryTx);
        
        // 3. Criação da transação de contrapartida (se for transferência)
        if (isTransfer && tx.destinationAccountId) {
            const transferGroupId = primaryTx.links.transferGroupId!;
            
            // Transação de contrapartida (na conta destino)
            const secondaryTx: TransacaoCompleta = {
                ...primaryTx,
                id: generateTransactionId(),
                accountId: tx.destinationAccountId,
                flow: 'transfer_in',
                operationType: 'transferencia',
                description: `Transferência recebida de ${account.name}`,
                links: {
                    ...primaryTx.links,
                    transferGroupId,
                },
                meta: {
                    ...primaryTx.meta,
                    createdBy: 'system',
                }
            };
            
            newTransactions.push(secondaryTx);
            
            // Adiciona ao grupo de transferências (opcional, mas útil para rastreamento)
            transferGroups.push({
                id: transferGroupId,
                fromAccountId: tx.accountId,
                toAccountId: tx.destinationAccountId,
                amount: tx.amount,
                date: tx.date,
                description: tx.description,
            });
        }
    });
    
    // 4. Adiciona todas as transações ao contexto
    newTransactions.forEach(t => addTransacaoV2(t));
    
    toast.success(`${newTransactions.length} lançamentos contabilizados com sucesso!`);
    onOpenChange(false);
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
      const allCategorized = importedTransactions.every(tx => 
        !!tx.operationType && 
        (tx.isTransfer ? !!tx.destinationAccountId : !!tx.categoryId)
      );
      
      const incompleteCount = importedTransactions.filter(tx => 
        !tx.operationType || 
        (tx.isTransfer ? !tx.destinationAccountId : !tx.categoryId)
      ).length;

      return (
        <div className="space-y-4">
          <div className={cn(
            "p-3 rounded-lg border flex items-center justify-between",
            allCategorized ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30"
          )}>
            <div>
                <p className="text-sm font-medium text-foreground">
                {importedTransactions.length} transações carregadas.
                </p>
                <p className={cn("text-xs mt-1", allCategorized ? "text-success" : "text-warning")}>
                    {allCategorized 
                        ? <><Check className="w-3 h-3 inline mr-1" /> Todas prontas para contabilização.</>
                        : <><AlertCircle className="w-3 h-3 inline mr-1" /> {incompleteCount} transação(ões) pendente(s) de categorização.</>
                    }
                </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <X className="w-4 h-4 mr-2" />
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
            className="w-full bg-success hover:bg-success/90 gap-2"
            disabled={incompleteCount > 0}
          >
            <Check className="w-4 h-4" />
            Contabilizar Lançamentos ({importedTransactions.length})
          </Button>
        </div>
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
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
      
      <StandardizationRuleFormModal
        open={showRuleModal}
        onOpenChange={setShowRuleModal}
        initialTransaction={txToCreateRule}
        categories={categoriasV2}
        onSave={handleSaveRule}
      />
    </>
  );
}