import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, Car, Shield, AlertTriangle, DollarSign, FileText, Search, ArrowRight, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useFinance, Veiculo, SeguroVeiculo } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FipeConsultaDialog } from "@/components/vehicles/FipeConsultaDialog";
import { TransacaoCompleta, generateTransactionId, OperationType, getFlowTypeFromOperation, getDomainFromOperation } from "@/types/finance";
import { useNavigate } from "react-router-dom";

const Veiculos = () => {
  const navigate = useNavigate();
  const { 
    veiculos, 
    addVeiculo, 
    updateVeiculo, 
    deleteVeiculo, 
    getCustoVeiculos,
    getPendingVehicles,
    segurosVeiculo,
    addSeguroVeiculo,
    updateSeguroVeiculo,
    deleteSeguroVeiculo,
    getValorFipeTotal,
    contasMovimento,
    categoriasV2,
    investimentosRF,
    emprestimos,
    addTransacaoV2,
    transacoesV2,
  } = useFinance();
  
  const [activeTab, setActiveTab] = useState("veiculos");
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const [showAddSeguro, setShowAddSeguro] = useState(false);
  const [pendingVehicleId, setPendingVehicleId] = useState<number | null>(null);
  const [showFipeDialog, setShowFipeDialog] = useState(false);
  const [selectedVeiculoFipe, setSelectedVeiculoFipe] = useState<Veiculo | undefined>(undefined);
  
  // Estado para simular o pré-preenchimento do modal de movimentação
  const [parcelaToPay, setParcelaToPay] = useState<{
    seguroId: number;
    parcelaNumero: number;
    valor: number;
    veiculoNome: string;
    vencimento: string;
  } | null>(null);
  
  // Forms
  const [formData, setFormData] = useState({
    modelo: "",
    marca: "",
    tipo: "carro" as 'carro' | 'moto' | 'caminhao',
    ano: "",
    dataCompra: "",
    valorVeiculo: "",
    valorFipe: "",
  });

  const [formSeguro, setFormSeguro] = useState({
    veiculoId: "",
    numeroApolice: "",
    seguradora: "",
    vigenciaInicio: "",
    vigenciaFim: "",
    valorTotal: "",
    numeroParcelas: "",
    meiaParcela: false,
  });

  const handleOpenFipeConsulta = (veiculo?: Veiculo) => {
    setSelectedVeiculoFipe(veiculo);
    setShowFipeDialog(true);
  };
  
  const handleUpdateFipe = (veiculoId: number, valorFipe: number) => {
    updateVeiculo(veiculoId, { valorFipe });
    toast.success("Valor FIPE atualizado!");
  };
  
  const handleSubmitVeiculo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.modelo || !formData.ano || !formData.dataCompra || !formData.valorVeiculo) return;
    
    if (pendingVehicleId) {
      updateVeiculo(pendingVehicleId, {
        modelo: formData.modelo,
        marca: formData.marca,
        tipo: formData.tipo,
        ano: Number(formData.ano),
        valorFipe: Number(formData.valorFipe) || Number(formData.valorVeiculo),
        status: 'ativo',
      });
      setPendingVehicleId(null);
    } else {
      addVeiculo({
        modelo: formData.modelo,
        marca: formData.marca,
        tipo: formData.tipo,
        ano: Number(formData.ano),
        dataCompra: formData.dataCompra,
        valorVeiculo: Number(formData.valorVeiculo),
        valorSeguro: 0,
        vencimentoSeguro: "",
        parcelaSeguro: 0,
        valorFipe: Number(formData.valorFipe) || Number(formData.valorVeiculo),
        status: 'ativo',
      });
    }
    
    setFormData({ modelo: "", marca: "", tipo: "carro", ano: "", dataCompra: "", valorVeiculo: "", valorFipe: "" });
    setShowAddVeiculo(false);
    toast.success(pendingVehicleId ? "Veículo configurado!" : "Veículo adicionado!");
  };

  const handleSubmitSeguro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSeguro.veiculoId || !formSeguro.numeroApolice || !formSeguro.seguradora || 
        !formSeguro.vigenciaInicio || !formSeguro.vigenciaFim || !formSeguro.valorTotal || 
        !formSeguro.numeroParcelas) return;
    
    const numParcelas = Number(formSeguro.numeroParcelas);
    const valorTotal = Number(formSeguro.valorTotal);
    const valorParcela = valorTotal / numParcelas;
    
    // Generate installment dates
    const parcelas = [];
    const dataInicio = new Date(formSeguro.vigenciaInicio);
    
    for (let i = 0; i < numParcelas; i++) {
      const dataVencimento = new Date(dataInicio);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      parcelas.push({
        numero: i + 1,
        vencimento: dataVencimento.toISOString().split('T')[0],
        valor: formSeguro.meiaParcela && i === 0 ? valorParcela / 2 : valorParcela,
        paga: false,
      });
    }
    
    addSeguroVeiculo({
      veiculoId: Number(formSeguro.veiculoId),
      numeroApolice: formSeguro.numeroApolice,
      seguradora: formSeguro.seguradora,
      vigenciaInicio: formSeguro.vigenciaInicio,
      vigenciaFim: formSeguro.vigenciaFim,
      valorTotal: valorTotal,
      numeroParcelas: numParcelas,
      meiaParcela: formSeguro.meiaParcela,
      parcelas,
    });
    
    // Update vehicle with insurance info
    updateVeiculo(Number(formSeguro.veiculoId), {
      valorSeguro: valorTotal,
      vencimentoSeguro: formSeguro.vigenciaFim,
      parcelaSeguro: valorParcela,
    });
    
    setFormSeguro({ veiculoId: "", numeroApolice: "", seguradora: "", vigenciaInicio: "", vigenciaFim: "", valorTotal: "", numeroParcelas: "", meiaParcela: false });
    setShowAddSeguro(false);
    toast.success("Seguro cadastrado!");
  };

  const handleConfigurePendingVehicle = (vehicle: Veiculo) => {
    setPendingVehicleId(vehicle.id);
    setFormData({
      modelo: vehicle.modelo || "",
      marca: vehicle.marca || "",
      tipo: vehicle.tipo || "carro",
      ano: vehicle.ano.toString(),
      dataCompra: vehicle.dataCompra,
      valorVeiculo: vehicle.valorVeiculo.toString(),
      valorFipe: vehicle.valorFipe.toString(),
    });
    setShowAddVeiculo(true);
  };

  // Cálculos
  const pendingVehicles = getPendingVehicles();
  const totalVeiculos = veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorVeiculo, 0);
  const totalSeguros = veiculos.filter(v => v.status !== 'vendido').reduce((acc, v) => acc + v.valorSeguro, 0);
  const totalFipe = getValorFipeTotal();
  
  // Verificar vencimento de seguros
  const hoje = new Date();
  const veiculosComSeguroVencendo = veiculos.filter(v => {
    if (!v.vencimentoSeguro || v.status === 'vendido') return false;
    const venc = new Date(v.vencimentoSeguro);
    const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return dias > 0 && dias <= 30;
  });

  // Chart data
  const chartData = veiculos.filter(v => v.status !== 'vendido').map(v => ({
    modelo: v.modelo.split(" ")[0] || "Pendente",
    valorCompra: v.valorVeiculo,
    valorFipe: v.valorFipe,
    seguro: v.valorSeguro,
  }));

  const getDiasVencimento = (data: string) => {
    if (!data) return null;
    const venc = new Date(data);
    const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  // Get all insurance payments (paid and pending)
  const allParcelas = useMemo(() => {
    const all: { seguro: SeguroVeiculo; parcela: typeof segurosVeiculo[0]['parcelas'][0]; veiculo: Veiculo | undefined; transaction?: TransacaoCompleta }[] = [];
    
    segurosVeiculo.forEach(seguro => {
      const veiculo = veiculos.find(v => v.id === seguro.veiculoId);
      seguro.parcelas.forEach(parcela => {
        const transaction = parcela.transactionId ? transacoesV2.find(t => t.id === parcela.transactionId) : undefined;
        all.push({ seguro, parcela, veiculo, transaction });
      });
    });
    
    return all.sort((a, b) => new Date(a.parcela.vencimento).getTime() - new Date(b.parcela.vencimento).getTime());
  }, [segurosVeiculo, veiculos, transacoesV2]);

  const parcelasPendentes = allParcelas.filter(p => !p.parcela.paga);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Imobilizado - Veículos</h1>
            <p className="text-muted-foreground mt-1">Controle seus veículos, seguros e custos associados</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpenFipeConsulta()} className="gap-2">
              <Search className="w-4 h-4" />
              Consultar FIPE
            </Button>
            <Dialog open={showAddSeguro} onOpenChange={setShowAddSeguro}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Shield className="w-4 h-4" />
                  Novo Seguro
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                  <DialogTitle>Cadastrar Seguro de Veículo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitSeguro} className="space-y-4">
                  <div>
                    <Label>Veículo *</Label>
                    <Select 
                      value={formSeguro.veiculoId} 
                      onValueChange={(v) => setFormSeguro(prev => ({ ...prev, veiculoId: v }))}
                    >
                      <SelectTrigger className="mt-1 bg-muted border-border">
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {veiculos.filter(v => v.status === 'ativo').map(v => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.modelo} ({v.ano})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Número da Apólice *</Label>
                      <Input
                        value={formSeguro.numeroApolice}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, numeroApolice: e.target.value }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Seguradora *</Label>
                      <Input
                        value={formSeguro.seguradora}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, seguradora: e.target.value }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Vigência Início *</Label>
                      <Input
                        type="date"
                        value={formSeguro.vigenciaInicio}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, vigenciaInicio: e.target.value }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Vigência Fim *</Label>
                      <Input
                        type="date"
                        value={formSeguro.vigenciaFim}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, vigenciaFim: e.target.value }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor Total (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formSeguro.valorTotal}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, valorTotal: e.target.value }))}
                        placeholder="0,00"
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Número de Parcelas *</Label>
                      <Input
                        type="number"
                        value={formSeguro.numeroParcelas}
                        onChange={(e) => setFormSeguro(prev => ({ ...prev, numeroParcelas: e.target.value }))}
                        className="mt-1 bg-muted border-border"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="meiaParcela"
                      checked={formSeguro.meiaParcela}
                      onCheckedChange={(checked) => setFormSeguro(prev => ({ ...prev, meiaParcela: checked === true }))}
                    />
                    <Label htmlFor="meiaParcela" className="text-sm cursor-pointer">
                      Seguro é meia parcela? (primeira parcela com 50% de desconto)
                    </Label>
                  </div>
                  <Button type="submit" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Seguro
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Botão Novo Veículo */}
            <Button 
              variant="default" 
              className="gap-2 bg-neon-gradient hover:opacity-90"
              onClick={() => {
                setPendingVehicleId(null);
                setFormData({ modelo: "", marca: "", tipo: "carro", ano: "", dataCompra: "", valorVeiculo: "", valorFipe: "" });
                setShowAddVeiculo(true);
              }}
            >
              <Car className="w-4 h-4" />
              Novo Veículo
            </Button>
          </div>
        </div>

        {/* Pending Vehicles Alert */}
        {pendingVehicles.length > 0 && (
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Veículos Pendentes de Cadastro</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Existem {pendingVehicles.length} veículo(s) comprado(s) aguardando configuração completa.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {pendingVehicles.map(vehicle => (
                  <Button
                    key={vehicle.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigurePendingVehicle(vehicle)}
                    className="gap-2 border-warning/50 hover:bg-warning/20"
                  >
                    <Car className="w-4 h-4" />
                    Compra em {new Date(vehicle.dataCompra).toLocaleDateString("pt-BR")} - R$ {vehicle.valorVeiculo.toLocaleString("pt-BR")}
                  </Button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card stat-card-neutral animate-fade-in-up">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Valor dos Veículos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {totalVeiculos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Car className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card stat-card-neutral animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Seguros</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {totalSeguros.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card stat-card-positive animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Valor FIPE Atual</p>
                  <p className="text-2xl font-bold text-success mt-1">
                    R$ {totalFipe.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-success/10 text-success">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "glass-card animate-fade-in-up",
            veiculosComSeguroVencendo.length > 0 ? "stat-card-negative" : "stat-card-positive"
          )} style={{ animationDelay: "150ms" }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Custo Total</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {getCustoVeiculos().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {veiculosComSeguroVencendo.length > 0 && (
                    <p className="text-xs text-destructive mt-1">{veiculosComSeguroVencendo.length} seguro(s) vencendo</p>
                  )}
                </div>
                <div className={cn(
                  "p-3 rounded-xl",
                  veiculosComSeguroVencendo.length > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                )}>
                  {veiculosComSeguroVencendo.length > 0 ? <AlertTriangle className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="veiculos">Veículos</TabsTrigger>
            <TabsTrigger value="seguros">Controle de Seguros</TabsTrigger>
            <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          </TabsList>

          {/* Tab Veículos */}
          <TabsContent value="veiculos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <Card className="lg:col-span-2 glass-card">
                <CardHeader>
                  <CardTitle>Comparativo de Valores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="modelo" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                          formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
                        />
                        <Bar dataKey="valorCompra" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Valor Compra" />
                        <Bar dataKey="valorFipe" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Valor FIPE" />
                        <Bar dataKey="seguro" fill="hsl(270, 100%, 65%)" radius={[4, 4, 0, 0]} name="Seguro" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Total de Veículos</span>
                    <Badge>{veiculos.filter(v => v.status === 'ativo').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Pendentes Cadastro</span>
                    <Badge variant="outline" className="border-warning text-warning">{pendingVehicles.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Seguros Ativos</span>
                    <Badge variant="outline" className="border-success text-success">{segurosVeiculo.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Parcelas Pendentes</span>
                    <Badge variant="outline" className="border-warning text-warning">{parcelasPendentes.length}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Seus Veículos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Data Compra</TableHead>
                      <TableHead className="text-right">Valor Compra</TableHead>
                      <TableHead className="text-right">Valor FIPE</TableHead>
                      <TableHead className="text-right">Seguro</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {veiculos.map((item) => {
                      const diasVenc = getDiasVencimento(item.vencimentoSeguro);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-primary" />
                              <EditableCell value={item.modelo || "Pendente"} onSave={(v) => updateVeiculo(item.id, { modelo: String(v) })} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.tipo || "carro"}</Badge>
                          </TableCell>
                          <TableCell>
                            <EditableCell value={item.ano} type="number" onSave={(v) => updateVeiculo(item.id, { ano: Number(v) })} />
                          </TableCell>
                          <TableCell>{new Date(item.dataCompra).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={item.valorVeiculo} type="currency" onSave={(v) => updateVeiculo(item.id, { valorVeiculo: Number(v) })} />
                          </TableCell>
                          <TableCell className="text-right text-success">
                            <EditableCell value={item.valorFipe} type="currency" onSave={(v) => updateVeiculo(item.id, { valorFipe: Number(v) })} className="text-success" />
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {item.valorSeguro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                item.status === 'ativo' && "border-success text-success",
                                item.status === 'pendente_cadastro' && "border-warning text-warning",
                                item.status === 'vendido' && "border-muted-foreground text-muted-foreground"
                              )}
                            >
                              {item.status === 'ativo' ? 'Ativo' : item.status === 'pendente_cadastro' ? 'Pendente' : 'Vendido'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {item.status === 'pendente_cadastro' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleConfigurePendingVehicle(item)}
                                  className="h-8 px-2 hover:bg-warning/10 hover:text-warning"
                                >
                                  Configurar
                                </Button>
                              )}
                              {item.status === 'ativo' && item.marca && item.modelo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenFipeConsulta(item)}
                                  className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                                >
                                  <Search className="w-4 h-4 mr-1" />
                                  FIPE
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteVeiculo(item.id)}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Seguros */}
          <TabsContent value="seguros" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Seguros Cadastrados</CardTitle>
                <Badge variant="outline">{segurosVeiculo.length} seguros</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Apólice</TableHead>
                      <TableHead>Seguradora</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Parcelas</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segurosVeiculo.map((seguro) => {
                      const veiculo = veiculos.find(v => v.id === seguro.veiculoId);
                      const parcelasPagas = seguro.parcelas.filter(p => p.paga).length;
                      return (
                        <TableRow key={seguro.id}>
                          <TableCell className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            {veiculo?.modelo || "N/A"}
                          </TableCell>
                          <TableCell>{seguro.numeroApolice}</TableCell>
                          <TableCell>{seguro.seguradora}</TableCell>
                          <TableCell>
                            {new Date(seguro.vigenciaInicio).toLocaleDateString("pt-BR")} - {new Date(seguro.vigenciaFim).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {seguro.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">
                              {parcelasPagas}/{seguro.numeroParcelas}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSeguroVeiculo(seguro.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {segurosVeiculo.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum seguro cadastrado. Clique em "Novo Seguro" para adicionar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Parcelas (Todas) */}
          <TabsContent value="parcelas" className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Controle de Parcelas de Seguro</CardTitle>
                <Badge variant="outline" className="border-primary text-primary">{allParcelas.length} parcelas</Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Seguradora</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor Devido</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allParcelas.map((item, index) => {
                      const diasVenc = getDiasVencimento(item.parcela.vencimento);
                      const vencida = diasVenc !== null && diasVenc < 0 && !item.parcela.paga;
                      const proximaVencer = diasVenc !== null && diasVenc >= 0 && diasVenc <= 7 && !item.parcela.paga;
                      
                      return (
                        <TableRow 
                          key={`${item.seguro.id}-${item.parcela.numero}`}
                          className={cn(
                            item.parcela.paga ? "bg-success/5 hover:bg-success/10" : "hover:bg-muted/30",
                            vencida && "bg-destructive/5 hover:bg-destructive/10"
                          )}
                        >
                          <TableCell className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-primary" />
                            {item.veiculo?.modelo || "N/A"}
                          </TableCell>
                          <TableCell>{item.seguro.seguradora}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.parcela.numero}/{item.seguro.numeroParcelas}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {new Date(item.parcela.vencimento).toLocaleDateString("pt-BR")}
                              {vencida && (
                                <Badge variant="destructive" className="text-xs">Vencida</Badge>
                              )}
                              {proximaVencer && (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  {diasVenc}d
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {item.parcela.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                item.parcela.paga ? "border-success text-success" : "border-warning text-warning"
                              )}
                            >
                              {item.parcela.paga ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {item.parcela.paga ? 'Paga' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.transaction?.date ? new Date(item.transaction.date).toLocaleDateString("pt-BR") : '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-success">
                            {item.transaction?.amount ? `R$ ${item.transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : '—'}
                          </TableCell>
                          <TableCell>
                            {!item.parcela.paga ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/receitas-despesas')}
                                className="h-8 px-2 hover:bg-primary/10 hover:text-primary gap-1"
                              >
                                Pagar <ArrowRight className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { /* Opção de estornar */ }}
                                className="h-8 w-8 text-muted-foreground"
                                title="Estornar pagamento"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allParcelas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nenhuma parcela de seguro cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Dialog Adicionar/Configurar Veículo */}
        <Dialog open={showAddVeiculo} onOpenChange={setShowAddVeiculo}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {pendingVehicleId ? "Configurar Veículo Pendente" : "Cadastrar Novo Veículo"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitVeiculo} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marca *</Label>
                  <Input
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label>Modelo *</Label>
                  <Input
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as 'carro' | 'moto' | 'caminhao' }))}
                  >
                    <SelectTrigger className="mt-1 bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carro">Carro</SelectItem>
                      <SelectItem value="moto">Moto</SelectItem>
                      <SelectItem value="caminhao">Caminhão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ano *</Label>
                  <Input
                    type="number"
                    value={formData.ano}
                    onChange={(e) => setFormData(prev => ({ ...prev, ano: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label>Data Compra *</Label>
                  <Input
                    type="date"
                    value={formData.dataCompra}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataCompra: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Compra (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valorVeiculo}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorVeiculo: e.target.value }))}
                    className="mt-1 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label>Valor FIPE (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valorFipe}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorFipe: e.target.value }))}
                    placeholder="Opcional"
                    className="mt-1 bg-muted border-border"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {pendingVehicleId ? "Salvar Configuração" : "Adicionar Veículo"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* FIPE Consulta Dialog */}
        <FipeConsultaDialog 
          open={showFipeDialog} 
          onOpenChange={setShowFipeDialog}
          veiculo={selectedVeiculoFipe}
          onUpdateFipe={handleUpdateFipe}
        />
      </div>
    </MainLayout>
  );
};

export default Veiculos;