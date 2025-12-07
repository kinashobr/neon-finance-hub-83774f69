import { ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface DistribuicaoItem {
  nome: string;
  valor: number;
  cor: string;
}

interface DistribuicaoChartsProps {
  porClasse: DistribuicaoItem[];
  porRisco: DistribuicaoItem[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.nome}</p>
        <p className="text-sm text-muted-foreground">
          R$ {data.valor.toLocaleString("pt-BR")}
        </p>
        <p className="text-xs text-muted-foreground">
          {((data.valor / payload[0].payload.total) * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DistribuicaoCharts({ porClasse, porRisco }: DistribuicaoChartsProps) {
  const totalClasse = porClasse.reduce((acc, item) => acc + item.valor, 0);
  const totalRisco = porRisco.reduce((acc, item) => acc + item.valor, 0);

  const classeData = porClasse.map(item => ({ ...item, total: totalClasse }));
  const riscoData = porRisco.map(item => ({ ...item, total: totalRisco }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Por Classe */}
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Patrimônio por Classe</h3>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={classeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="valor"
                nameKey="nome"
                label={renderCustomLabel}
                labelLine={false}
              >
                {classeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Por Risco */}
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Patrimônio por Risco</h3>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riscoData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="valor"
                nameKey="nome"
                label={renderCustomLabel}
                labelLine={false}
              >
                {riscoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}