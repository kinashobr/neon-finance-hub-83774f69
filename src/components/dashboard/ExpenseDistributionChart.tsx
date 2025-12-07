import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "Moradia", value: 3500, color: "hsl(199, 89%, 48%)" },
  { name: "Alimentação", value: 1800, color: "hsl(270, 100%, 65%)" },
  { name: "Transporte", value: 1200, color: "hsl(160, 100%, 45%)" },
  { name: "Lazer", value: 800, color: "hsl(330, 100%, 65%)" },
  { name: "Saúde", value: 600, color: "hsl(38, 92%, 50%)" },
  { name: "Outros", value: 400, color: "hsl(215, 20%, 55%)" },
];

export function ExpenseDistributionChart() {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div
      className="glass-card p-5 animate-fade-in-up"
      style={{ animationDelay: "300ms" }}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Distribuição de Despesas
        </h3>
        <p className="text-sm text-muted-foreground">Por categoria</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-[200px] w-[200px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 8%)",
                  border: "1px solid hsl(220, 20%, 18%)",
                  borderRadius: "12px",
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString("pt-BR")}`,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-foreground">
                  R$ {item.value.toLocaleString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({((item.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
