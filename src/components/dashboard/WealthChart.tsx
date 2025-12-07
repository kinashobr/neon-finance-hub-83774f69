import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", patrimonio: 45000 },
  { month: "Fev", patrimonio: 52000 },
  { month: "Mar", patrimonio: 48000 },
  { month: "Abr", patrimonio: 61000 },
  { month: "Mai", patrimonio: 55000 },
  { month: "Jun", patrimonio: 67000 },
  { month: "Jul", patrimonio: 72000 },
  { month: "Ago", patrimonio: 78000 },
  { month: "Set", patrimonio: 85000 },
  { month: "Out", patrimonio: 91000 },
  { month: "Nov", patrimonio: 97000 },
  { month: "Dez", patrimonio: 105000 },
];

export function WealthChart() {
  return (
    <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Evolução Patrimonial
          </h3>
          <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
          <span>+133%</span>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 20%, 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 8%)",
                border: "1px solid hsl(220, 20%, 18%)",
                borderRadius: "12px",
                boxShadow: "0 4px 20px hsl(220, 20%, 4% / 0.5)",
              }}
              labelStyle={{ color: "hsl(210, 40%, 98%)" }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR")}`,
                "Patrimônio",
              ]}
            />
            <Area
              type="monotone"
              dataKey="patrimonio"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPatrimonio)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
