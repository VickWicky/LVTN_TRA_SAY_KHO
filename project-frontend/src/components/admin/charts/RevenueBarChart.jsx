import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RevenueBarChart({ data, formatMoney }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f3f4f6"
        />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: "12px",
          }}
          formatter={(value) => [formatMoney(value), "Doanh thu"]}
          labelStyle={{
            color: "#374151",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
          cursor={{ fill: "#f3f4f6", opacity: 0.4 }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          formatter={() => (
            <span className="text-gray-600 font-medium ml-1">Doanh thu</span>
          )}
        />
        <Bar
          dataKey="revenue"
          fill="url(#colorBar)"
          radius={[6, 6, 0, 0]}
          barSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
