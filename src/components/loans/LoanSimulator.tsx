import { useState, useMemo } from "react";
import { Calculator, TrendingUp, RefreshCw, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Emprestimo } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useFinance } from "@/contexts/FinanceContext"; // Import useFinance

interface LoanSimulatorProps {
  emprestimos: Emprestimo[];
  className?: string;
}

export function LoanSimulator({ emprestimos, className }: LoanSimulatorProps) {
  const { calculateLoanAmortizationAndInterest } = useFinance(); // Destructure the necessary function
  
  const [aumentoParcela, setAumentoParcela] = useState("");
  const [valorQuitacao, setValorQuitacao] = useState("");
  const [novaTaxa, setNovaTaxa] = useState("");

  const totalSaldoDevedor = useMemo(() => {
    return emprestimos.reduce((acc, e) => {
      if (e.status === 'quitado' || e.status === 'pendente_config') return acc;
      
      // Use the actual paid installments count from the loan object
      const parcelasPagas = e.parcelasPagas || 0; 
      
      let saldoDevedor = e.valorTotal;
      
      if (parcelasPagas > 0) {
          // Calculate the amortization schedule up to the last paid installment
          const calc = calculateLoanAmortizationAndInterest(e.id, parcelasPagas);
          if (calc) {
              saldoDevedor = calc.saldoDevedor;
          } else {
              // Fallback (should not happen for configured loans)
              saldoDevedor = Math.max(0, e.valorTotal - (parcelasPagas * e.parcela));
          }
      }
      
      return acc + saldoDevedor;
    }, 0);
  }, [emprestimos, calculateLoanAmortizationAndInterest]);

  const parcelaTotal = useMemo(() => {
    return emprestimos.reduce((acc, e) => acc + e.parcela, 0);
  }, [emprestimos]);

  const taxaMedia = useMemo(() => {
    if (emprestimos.length === 0) return 0;
    return emprestimos.reduce((acc, e) => acc + e.taxaMensal, 0) / emprestimos.length;
  }, [emprestimos]);

  // Simulação: Aumentar parcela
  const simulacaoAumento = useMemo(() => {
    const aumento = Number(aumentoParcela) || 0;
    if (aumento <= 0 || totalSaldoDevedor <= 0) return null;

    const novaParcela = parcelaTotal + aumento;
    
    // Simplificação: Assumindo que a taxa média se aplica ao saldo devedor total
    // Para calcular meses restantes, precisamos da taxa média efetiva (i)
    const i = taxaMedia / 100;
    
    // Fórmula para calcular N (número de períodos) dado P, PMT e i:
    // N = -log(1 - (P * i) / PMT) / log(1 + i)
    
    let mesesRestantes = 0;
    let novosMesesRestantes = 0;
    
    if (i > 0 && parcelaTotal > 0 && novaParcela > 0) {
        // Meses restantes com parcela atual
        const term1 = (totalSaldoDevedor * i) / parcelaTotal;
        if (term1 < 1) {
            mesesRestantes = -Math.log(1 - term1) / Math.log(1 + i);
        } else {
            mesesRestantes = 999; // Parcela insuficiente
        }

        // Meses restantes com nova parcela
        const term2 = (totalSaldoDevedor * i) / novaParcela;
        if (term2 < 1) {
            novosMesesRestantes = -Math.log(1 - term2) / Math.log(1 + i);
        } else {
            novosMesesRestantes = 999; // Parcela insuficiente
        }
    } else if (i === 0) {
        // Sem juros
        mesesRestantes = totalSaldoDevedor / parcelaTotal;
        novosMesesRestantes = totalSaldoDevedor / novaParcela;
    } else {
        return null;
    }
    
    const mesesEconomizados = Math.max(0, mesesRestantes - novosMesesRestantes);
    
    // Juros economizados: (Parcela Atual * Meses Restantes) - (Nova Parcela * Novos Meses Restantes)
    // Esta é uma simplificação, mas reflete o custo total economizado.
    const jurosEconomizadosFinal = Math.max(0, (parcelaTotal * mesesRestantes) - (novaParcela * novosMesesRestantes));


    return {
      novaParcela,
      mesesEconomizados: mesesEconomizados,
      jurosEconomizados: jurosEconomizadosFinal,
    };
  }, [aumentoParcela, parcelaTotal, totalSaldoDevedor, taxaMedia]);

  // Simulação: Quitar agora
  const simulacaoQuitacao = useMemo(() => {
    const valor = Number(valorQuitacao) || 0;
    if (valor <= 0 || totalSaldoDevedor <= 0) return null;

    const percentualQuitacao = Math.min(100, (valor / totalSaldoDevedor) * 100);
    const saldoRestante = Math.max(0, totalSaldoDevedor - valor);
    
    // Simplificação: Juros economizados é o juros restante do saldo quitado
    // Juros restantes = (Parcela Total * Meses Restantes) - Saldo Devedor
    // Se quitamos X do saldo, economizamos os juros que seriam pagos sobre X.
    
    // Estimativa de juros restantes sobre o valor quitado (simplificado)
    const mesesRestantesEstimados = totalSaldoDevedor / parcelaTotal;
    const jurosEconomizados = valor * (taxaMedia / 100) * mesesRestantesEstimados * 0.5; // Fator de 0.5 para simular a média

    return {
      percentualQuitacao,
      saldoRestante,
      jurosEconomizados: Math.max(0, jurosEconomizados),
    };
  }, [valorQuitacao, totalSaldoDevedor, parcelaTotal, taxaMedia]);

  // Simulação: Refinanciar
  const simulacaoRefinanciamento = useMemo(() => {
    const taxa = Number(novaTaxa) || 0;
    if (taxa <= 0 || taxa >= taxaMedia || totalSaldoDevedor <= 0) return null;

    const diferencaTaxa = taxaMedia - taxa;
    
    // Economia Anual: Saldo Devedor * Diferença de Taxa * 12 meses
    const economiaAnual = totalSaldoDevedor * (diferencaTaxa / 100) * 12;
    
    // Nova Parcela (Simplificação: Mantém o mesmo prazo, recalcula a parcela)
    const mesesRestantes = totalSaldoDevedor / parcelaTotal; // Prazo restante estimado
    
    const i = taxa / 100;
    let novaParcela = 0;
    
    if (i > 0 && mesesRestantes > 0) {
        // PMT = P * [ i / (1 - (1 + i)^-n) ]
        novaParcela = (totalSaldoDevedor * i) / (1 - Math.pow(1 + i, -mesesRestantes));
    } else if (i === 0) {
        novaParcela = totalSaldoDevedor / mesesRestantes;
    } else {
        return null;
    }

    const reducaoParcela = parcelaTotal - novaParcela;

    return {
      novaTaxa: taxa,
      economiaAnual,
      novaParcela,
      reducaoParcela,
    };
  }, [novaTaxa, taxaMedia, totalSaldoDevedor, parcelaTotal]);

  const formatCurrency = (value: number) => 
    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Simulador de Cenários</h3>
      </div>

      <Tabs defaultValue="aumentar" className="space-y-4">
        <TabsList className="bg-muted/50 w-full grid grid-cols-3">
          <TabsTrigger value="aumentar" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-3 h-3 mr-1" />
            Aumentar
          </TabsTrigger>
          <TabsTrigger value="quitar" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <DollarSign className="w-3 h-3 mr-1" />
            Quitar
          </TabsTrigger>
          <TabsTrigger value="refinanciar" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refinanciar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aumentar" className="space-y-4">
          <div>
            <Label className="text-xs">Aumentar parcela em (R$)</Label>
            <Input
              type="number"
              placeholder="500"
              value={aumentoParcela}
              onChange={(e) => setAumentoParcela(e.target.value)}
              className="mt-1.5 bg-muted border-border"
            />
          </div>
          {simulacaoAumento && (
            <div className="space-y-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nova parcela:</span>
                <span className="font-medium text-success">{formatCurrency(simulacaoAumento.novaParcela)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meses economizados:</span>
                <span className="font-medium text-success">{simulacaoAumento.mesesEconomizados.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Economia em juros:</span>
                <span className="font-bold text-success">{formatCurrency(simulacaoAumento.jurosEconomizados)}</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quitar" className="space-y-4">
          <div>
            <Label className="text-xs">Valor disponível para quitação (R$)</Label>
            <Input
              type="number"
              placeholder="10000"
              value={valorQuitacao}
              onChange={(e) => setValorQuitacao(e.target.value)}
              className="mt-1.5 bg-muted border-border"
            />
          </div>
          {simulacaoQuitacao && (
            <div className="space-y-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">% da dívida quitada:</span>
                <span className="font-medium text-success">{simulacaoQuitacao.percentualQuitacao.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo restante:</span>
                <span className="font-medium">{formatCurrency(simulacaoQuitacao.saldoRestante)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Economia em juros:</span>
                <span className="font-bold text-success">{formatCurrency(simulacaoQuitacao.jurosEconomizados)}</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="refinanciar" className="space-y-4">
          <div>
            <Label className="text-xs">Nova taxa mensal (%) - Atual: {taxaMedia.toFixed(2)}%</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1.50"
              value={novaTaxa}
              onChange={(e) => setNovaTaxa(e.target.value)}
              className="mt-1.5 bg-muted border-border"
            />
          </div>
          {simulacaoRefinanciamento && (
            <div className="space-y-2 p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nova parcela:</span>
                <span className="font-medium text-success">{formatCurrency(simulacaoRefinanciamento.novaParcela)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Redução mensal:</span>
                <span className="font-medium text-success">{formatCurrency(simulacaoRefinanciamento.reducaoParcela)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Economia anual:</span>
                <span className="font-bold text-success">{formatCurrency(simulacaoRefinanciamento.economiaAnual)}</span>
              </div>
            </div>
          )}
          {novaTaxa && Number(novaTaxa) >= taxaMedia && (
            <p className="text-xs text-warning">A nova taxa deve ser menor que a taxa atual ({taxaMedia.toFixed(2)}%)</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}