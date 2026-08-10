import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RevenueAreaChart({ data, formatMoney }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f3f4f6"
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          dy={10}
        />
        <YAxis
          yAxisId="left"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
          dx={-10}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#6b7280", fontSize: 12 }}
          dx={10}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: "12px",
          }}
          formatter={(value, name) => [
            name === "revenue" ? formatMoney(value) : value,
            name === "revenue" ? "Doanh thu" : "Đơn hàng",
          ]}
          labelStyle={{
            color: "#374151",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          formatter={(value) => (
            <span className="text-gray-600 font-medium ml-1">
              {value === "revenue" ? "Doanh thu" : "Đơn hàng"}
            </span>
          )}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="#4f46e5"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="orders"
          stroke="#10b981"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorOrders)"
          activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
