import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Car, Shield, AlertTriangle, DollarSign } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { EditableCell } from "@/components/EditableCell";
import { cn } from "@/lib/utils";

const Veiculos = () => {
  const { veiculos, addVeiculo, updateVeiculo, deleteVeiculo, getCustoVeiculos } = useFinance();
  
  const [formData, setFormData] = useState({
    modelo: "",
    ano: "",
    dataCompra: "",
    valorVeiculo: "",
    valorSeguro: "",
    vencimentoSeguro: "",
    parcelaSeguro: "",
    valorFipe: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.modelo || !formData.ano || !formData.dataCompra || !formData.valorVeiculo) return;
    
    addVeiculo({
      modelo: formData.modelo,
      ano: Number(formData.ano),
      dataCompra: formData.dataCompra,
      valorVeiculo: Number(formData.valorVeiculo),
      valorSeguro: Number(formData.valorSeguro) || 0,
      vencimentoSeguro: formData.vencimentoSeguro,
      parcelaSeguro: Number(formData.parcelaSeguro) || 0,
      valorFipe: Number(formData.valorFipe) || Number(formData.valorVeiculo),
    });
    
    setFormData({ modelo: "", ano: "", dataCompra: "", valorVeiculo: "", valorSeguro: "", vencimentoSeguro: "", parcelaSeguro: "", valorFipe: "" });
  };

  // Cálculos
  const totalVeiculos = veiculos.reduce((acc, v) => acc + v.valorVeiculo, 0);
  const totalSeguros = veiculos.reduce((acc, v) => acc + v.valorSeguro, 0);
  const totalFipe = veiculos.reduce((acc, v) => acc + v.valorFipe, 0);
  
  // Verificar vencimento de seguros
  const hoje = new Date();
  const veiculosComSeguroVencendo = veiculos.filter(v => {
    if (!v.vencimentoSeguro) return false;
    const venc = new Date(v.vencimentoSeguro);
    const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return dias > 0 && dias <= 30;
  });

  // Chart data
  const chartData = veiculos.map(v => ({
    modelo: v.modelo.split(" ")[0],
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Imobilizado - Veículos</h1>
            <p className="text-muted-foreground mt-1">Controle seus veículos e custos associados</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 stat-card-neutral animate-fade-in-up">
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
          </div>

          <div className="glass-card p-5 stat-card-neutral animate-fade-in-up" style={{ animationDelay: "50ms" }}>
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
          </div>

          <div className="glass-card p-5 stat-card-positive animate-fade-in-up" style={{ animationDelay: "100ms" }}>
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
          </div>

          <div className={cn(
            "glass-card p-5 animate-fade-in-up",
            veiculosComSeguroVencendo.length > 0 ? "stat-card-negative" : "stat-card-positive"
          )} style={{ animationDelay: "150ms" }}>
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Novo Veículo</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ex: Honda Civic EXL"
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                    placeholder="2024"
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="dataCompra">Data Compra</Label>
                  <Input
                    id="dataCompra"
                    type="date"
                    value={formData.dataCompra}
                    onChange={(e) => setFormData({ ...formData, dataCompra: e.target.value })}
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorVeiculo">Valor (R$)</Label>
                  <Input
                    id="valorVeiculo"
                    type="number"
                    step="0.01"
                    value={formData.valorVeiculo}
                    onChange={(e) => setFormData({ ...formData, valorVeiculo: e.target.value })}
                    placeholder="0,00"
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="valorFipe">Valor FIPE (R$)</Label>
                  <Input
                    id="valorFipe"
                    type="number"
                    step="0.01"
                    value={formData.valorFipe}
                    onChange={(e) => setFormData({ ...formData, valorFipe: e.target.value })}
                    placeholder="0,00"
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valorSeguro">Seguro (R$)</Label>
                  <Input
                    id="valorSeguro"
                    type="number"
                    step="0.01"
                    value={formData.valorSeguro}
                    onChange={(e) => setFormData({ ...formData, valorSeguro: e.target.value })}
                    placeholder="0,00"
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="parcelaSeguro">Parcela Seguro</Label>
                  <Input
                    id="parcelaSeguro"
                    type="number"
                    step="0.01"
                    value={formData.parcelaSeguro}
                    onChange={(e) => setFormData({ ...formData, parcelaSeguro: e.target.value })}
                    placeholder="0,00"
                    className="mt-1.5 bg-muted border-border"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vencimentoSeguro">Venc. Seguro</Label>
                <Input
                  id="vencimentoSeguro"
                  type="date"
                  value={formData.vencimentoSeguro}
                  onChange={(e) => setFormData({ ...formData, vencimentoSeguro: e.target.value })}
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <Button type="submit" className="w-full bg-neon-gradient hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Veículo
              </Button>
            </form>
          </div>

          {/* Chart */}
          <div className="lg:col-span-2 glass-card p-5 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Comparativo de Valores</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
                  <XAxis dataKey="modelo" axisLine={false} tickLine={false} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(220, 20%, 8%)", border: "1px solid hsl(220, 20%, 18%)", borderRadius: "12px" }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
                  />
                  <Bar dataKey="valorCompra" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Valor Compra" />
                  <Bar dataKey="valorFipe" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Valor FIPE" />
                  <Bar dataKey="seguro" fill="hsl(270, 100%, 65%)" radius={[4, 4, 0, 0]} name="Seguro" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Seus Veículos</h3>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Modelo</TableHead>
                  <TableHead className="text-muted-foreground">Ano</TableHead>
                  <TableHead className="text-muted-foreground">Data Compra</TableHead>
                  <TableHead className="text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Valor FIPE</TableHead>
                  <TableHead className="text-muted-foreground">Seguro</TableHead>
                  <TableHead className="text-muted-foreground">Parc. Seguro</TableHead>
                  <TableHead className="text-muted-foreground">Venc. Seguro</TableHead>
                  <TableHead className="text-muted-foreground w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculos.map((item) => {
                  const diasVenc = getDiasVencimento(item.vencimentoSeguro);
                  return (
                    <TableRow key={item.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <EditableCell value={item.modelo} onSave={(v) => updateVeiculo(item.id, { modelo: String(v) })} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={item.ano} type="number" onSave={(v) => updateVeiculo(item.id, { ano: Number(v) })} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={item.dataCompra} type="date" onSave={(v) => updateVeiculo(item.id, { dataCompra: String(v) })} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={item.valorVeiculo} type="currency" onSave={(v) => updateVeiculo(item.id, { valorVeiculo: Number(v) })} />
                      </TableCell>
                      <TableCell className="text-success">
                        <EditableCell value={item.valorFipe} type="currency" onSave={(v) => updateVeiculo(item.id, { valorFipe: Number(v) })} className="text-success" />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={item.valorSeguro} type="currency" onSave={(v) => updateVeiculo(item.id, { valorSeguro: Number(v) })} />
                      </TableCell>
                      <TableCell>
                        <EditableCell value={item.parcelaSeguro} type="currency" onSave={(v) => updateVeiculo(item.id, { parcelaSeguro: Number(v) })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EditableCell value={item.vencimentoSeguro} type="date" onSave={(v) => updateVeiculo(item.id, { vencimentoSeguro: String(v) })} />
                          {diasVenc !== null && diasVenc <= 30 && diasVenc > 0 && (
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              diasVenc <= 7 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                            )}>
                              {diasVenc}d
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteVeiculo(item.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Veiculos;
