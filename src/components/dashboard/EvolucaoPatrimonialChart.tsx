import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis } from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EvolucaoData {
  mes: string;
  patrimonioTotal: number;
  receitas: number;
  despesas: number;
  investimentos: number;
  dividas: number;
}

interface EvolucaoPatrimonialChartProps {
  data: EvolucaoData[];
}

const lineOptions = [
  { id: "patrimonioTotal", label: "Patrimônio Total", color: "hsl(199, 89%, 48%)" },
  { id: "receitas", label: "Receitas", color: "hsl(142, 76%, 36%)" },
  { id: "despesas", label: "Despesas", color: "hsl(0, 72%, 51%)" },
  { id: "investimentos", label: "Investimentos", color: "hsl(270, 100%, 65%)" },
  { id: "dividas", label: "Endividamento", color: "hsl(38, 92%, 50%)" },
];

export function EvolucaoPatrimonialChart({ data }: EvolucaoPatrimonialChartProps) {
  const [periodo, setPeriodo] = useState("6m");
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["patrimonioTotal", "receitas", "despesas"])
  );

  const toggleLine = (lineId: string) => {
    setActiveLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  const filteredData = () => {
    switch (periodo) {
      case "3m": return data.slice(-3);
      case "6m": return data.slice(-6);
      case "12m": return data;
      default: return data;
    }
  };

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Evolução Patrimonial</h3>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-28 bg-muted border-border h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 meses</SelectItem>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Linhas visíveis</h4>
                {lineOptions.map(line => (
                  <div key={line.id} className="flex items-center gap-2">
                    <input
                      id={line.id}
                      type="checkbox"
                      checked={activeLines.has(line.id)}
                      onChange={() => toggleLine(line.id)}
                      className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-primary"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: line.color }}
                    />
                    <label htmlFor={line.id} className="text-sm cursor-pointer">
                      {line.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData()}>
            <defs>
              {lineOptions.map(line => (
                <linearGradient key={line.id} id={`gradient-${line.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" vertical={false} />
            <XAxis
              dataKey="mes"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 8%)",
                border: "1px solid hsl(220, 20%, 18%)",
                borderRadius: "12px",
              }}
              formatter={(value: number, name: string) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                lineOptions.find(l => l.id === name)?.label || name
              ]}
            />
            <Legend />
            {lineOptions.map(line => (
              activeLines.has(line.id) && (
                <Area
                  key={line.id}
                  type="monotone"
                  dataKey={line.id}
                  stroke={line.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${line.id})`}
                  name={line.id}
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}