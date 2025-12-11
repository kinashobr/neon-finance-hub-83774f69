import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Car, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { 
  buscarMarcas, 
  buscarModelos, 
  buscarAnos, 
  buscarValorFipe,
  tipoToFipe,
  FipeMarca,
  FipeModelo,
  FipeAno,
  FipeResult 
} from "@/services/fipeService";
import { Veiculo } from "@/contexts/FinanceContext";
import { cn } from "@/lib/utils";

interface FipeConsultaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo?: Veiculo;
  onUpdateFipe?: (veiculoId: number, valorFipe: number) => void;
}

export function FipeConsultaDialog({ open, onOpenChange, veiculo, onUpdateFipe }: FipeConsultaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'result'>('select');
  const [error, setError] = useState<string | null>(null);
  
  // Selection states
  const [tipo, setTipo] = useState<'carros' | 'motos' | 'caminhoes'>(
    veiculo?.tipo ? tipoToFipe(veiculo.tipo) : 'carros'
  );
  const [marcas, setMarcas] = useState<FipeMarca[]>([]);
  const [modelos, setModelos] = useState<FipeModelo[]>([]);
  const [anos, setAnos] = useState<FipeAno[]>([]);
  
  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [selectedModelo, setSelectedModelo] = useState<string>('');
  const [selectedAno, setSelectedAno] = useState<string>('');
  
  const [resultado, setResultado] = useState<FipeResult | null>(null);
  const [valorNumerico, setValorNumerico] = useState<number>(0);
  
  const loadMarcas = async (tipoVeiculo: 'carros' | 'motos' | 'caminhoes') => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarMarcas(tipoVeiculo);
      setMarcas(data);
      setModelos([]);
      setAnos([]);
      setSelectedMarca('');
      setSelectedModelo('');
      setSelectedAno('');
    } catch (err) {
      setError('Erro ao carregar marcas');
    } finally {
      setLoading(false);
    }
  };
  
  const loadModelos = async (codigoMarca: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarModelos(tipo, codigoMarca);
      setModelos(data.modelos);
      setAnos([]);
      setSelectedModelo('');
      setSelectedAno('');
    } catch (err) {
      setError('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAnos = async (codigoModelo: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await buscarAnos(tipo, selectedMarca, codigoModelo);
      setAnos(data);
      setSelectedAno('');
    } catch (err) {
      setError('Erro ao carregar anos');
    } finally {
      setLoading(false);
    }
  };
  
  const consultarFipe = async () => {
    if (!selectedMarca || !selectedModelo || !selectedAno) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await buscarValorFipe(tipo, selectedMarca, selectedModelo, selectedAno);
      setResultado(data);
      
      const valor = parseFloat(
        data.Valor
          .replace('R$ ', '')
          .replace(/\./g, '')
          .replace(',', '.')
      );
      setValorNumerico(valor);
      setStep('result');
    } catch (err) {
      setError('Erro ao consultar valor FIPE');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTipoChange = (novoTipo: 'carros' | 'motos' | 'caminhoes') => {
    setTipo(novoTipo);
    loadMarcas(novoTipo);
  };
  
  const handleMarcaChange = (codigo: string) => {
    setSelectedMarca(codigo);
    loadModelos(codigo);
  };
  
  const handleModeloChange = (codigo: string) => {
    setSelectedModelo(codigo);
    loadAnos(codigo);
  };
  
  const handleAplicarValor = () => {
    if (veiculo && onUpdateFipe && valorNumerico > 0) {
      onUpdateFipe(veiculo.id, valorNumerico);
      onOpenChange(false);
    }
  };
  
  const handleReset = () => {
    setStep('select');
    setResultado(null);
    setValorNumerico(0);
  };
  
  // Calculate difference with vehicle purchase price
  const getDiferenca = () => {
    if (!veiculo || !valorNumerico) return null;
    const diff = valorNumerico - veiculo.valorVeiculo;
    const percent = (diff / veiculo.valorVeiculo) * 100;
    return { diff, percent };
  };
  
  const diferenca = getDiferenca();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Consulta FIPE
          </DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {step === 'select' && (
          <div className="space-y-4">
            {veiculo && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">Veículo selecionado:</p>
                <p className="font-medium">{veiculo.marca} {veiculo.modelo} ({veiculo.ano})</p>
              </div>
            )}
            
            <div>
              <Label>Tipo de Veículo</Label>
              <Select value={tipo} onValueChange={handleTipoChange}>
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carros">Carro</SelectItem>
                  <SelectItem value="motos">Moto</SelectItem>
                  <SelectItem value="caminhoes">Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Marca</Label>
              <Select 
                value={selectedMarca} 
                onValueChange={handleMarcaChange}
                disabled={marcas.length === 0}
              >
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione a marca"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {marcas.map(m => (
                    <SelectItem key={m.codigo} value={m.codigo}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Modelo</Label>
              <Select 
                value={selectedModelo} 
                onValueChange={handleModeloChange}
                disabled={modelos.length === 0}
              >
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione o modelo"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {modelos.map(m => (
                    <SelectItem key={m.codigo} value={m.codigo.toString()}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Ano</Label>
              <Select 
                value={selectedAno} 
                onValueChange={setSelectedAno}
                disabled={anos.length === 0}
              >
                <SelectTrigger className="mt-1 bg-muted border-border">
                  <SelectValue placeholder={loading ? "Carregando..." : "Selecione o ano"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {anos.map(a => (
                    <SelectItem key={a.codigo} value={a.codigo}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={consultarFipe} 
              disabled={!selectedMarca || !selectedModelo || !selectedAno || loading}
              className="w-full bg-neon-gradient hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Consultar FIPE
                </>
              )}
            </Button>
            
            {marcas.length === 0 && !loading && (
              <Button 
                variant="outline" 
                onClick={() => loadMarcas(tipo)}
                className="w-full"
              >
                Carregar Marcas
              </Button>
            )}
          </div>
        )}
        
        {step === 'result' && resultado && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Car className="w-5 h-5 text-primary" />
                <span className="font-semibold">{resultado.Marca} {resultado.Modelo}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Ano:</span>
                  <p className="font-medium">{resultado.AnoModelo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Combustível:</span>
                  <p className="font-medium">{resultado.Combustivel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Código FIPE:</span>
                  <p className="font-medium">{resultado.CodigoFipe}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Referência:</span>
                  <p className="font-medium">{resultado.MesReferencia}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-primary/20">
                <span className="text-muted-foreground text-sm">Valor FIPE:</span>
                <p className="text-2xl font-bold text-primary">{resultado.Valor}</p>
              </div>
            </div>
            
            {diferenca && (
              <div className={cn(
                "p-3 rounded-lg border flex items-center justify-between",
                diferenca.diff > 0 
                  ? "bg-success/10 border-success/20" 
                  : diferenca.diff < 0 
                    ? "bg-destructive/10 border-destructive/20"
                    : "bg-muted border-border"
              )}>
                <div className="flex items-center gap-2">
                  {diferenca.diff > 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : diferenca.diff < 0 ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {diferenca.diff > 0 ? 'Valorização' : diferenca.diff < 0 ? 'Desvalorização' : 'Igual'}
                  </span>
                </div>
                <Badge variant={diferenca.diff >= 0 ? "default" : "destructive"}>
                  {diferenca.diff >= 0 ? '+' : ''}
                  {diferenca.percent.toFixed(1)}%
                </Badge>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Nova Consulta
              </Button>
              {veiculo && onUpdateFipe && (
                <Button onClick={handleAplicarValor} className="flex-1 bg-neon-gradient hover:opacity-90">
                  Aplicar Valor
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
