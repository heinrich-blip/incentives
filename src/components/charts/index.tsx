/**
 * Reusable chart components for analytics
 */

import
    {
        Area,
        AreaChart,
        Bar,
        BarChart,
        CartesianGrid,
        Cell,
        Legend,
        Line,
        LineChart,
        Pie,
        PieChart,
        ResponsiveContainer,
        Tooltip,
        XAxis,
        YAxis,
    } from "recharts";
import { formatCurrency, formatNumber } from "../../utils/formatters";

// Color palette
const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  surface: "#64748b",
  primaryLight: "#93c5fd",
  successLight: "#86efac",
};

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

interface SparklineProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  showArea?: boolean;
}

export function Sparkline({
  data,
  color = COLORS.primary,
  height = 40,
  showArea = true,
}: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        {showArea && (
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={1.5}
          />
        )}
        {!showArea && (
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface PerformanceGaugeProps {
  value: number;
  max: number;
  label: string;
  color?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

export function PerformanceGauge({
  value,
  max,
  label,
  color = "primary",
  size = "md",
}: PerformanceGaugeProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = size === "sm" ? 40 : size === "md" ? 60 : 80;
  const strokeWidth = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;

  const colorMap = {
    primary: "stroke-primary-500",
    success: "stroke-green-500",
    warning: "stroke-amber-500",
    danger: "stroke-red-500",
  };

  const bgColorMap = {
    primary: "stroke-primary-100",
    success: "stroke-green-100",
    warning: "stroke-amber-100",
    danger: "stroke-red-100",
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={radius * 2}
        height={radius * 1.5}
        className="transform -rotate-90"
        style={{ transformOrigin: "center" }}
      >
        {/* Background arc */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - strokeWidth / 2}
          fill="none"
          strokeWidth={strokeWidth}
          className={bgColorMap[color]}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - strokeWidth / 2}
          fill="none"
          strokeWidth={strokeWidth}
          className={colorMap[color]}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
        <span
          className={`font-bold ${size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl"} text-surface-900`}
        >
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-surface-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}

interface TrendChartProps {
  data: { label: string; value: number; target?: number }[];
  height?: number;
  showTarget?: boolean;
  valueFormatter?: (value: number) => string;
}

export function TrendChart({
  data,
  height = 200,
  showTarget = false,
  valueFormatter = formatNumber,
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={valueFormatter}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [valueFormatter(value as number), "Value"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={COLORS.primary}
          strokeWidth={2}
          fill="url(#colorValue)"
        />
        {showTarget && (
          <Line
            type="monotone"
            dataKey="target"
            stroke={COLORS.warning}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
  valueFormatter?: (value: number) => string;
}

export function SimpleBarChart({
  data,
  height = 200,
  horizontal = false,
  valueFormatter = formatNumber,
}: BarChartProps) {
  const ChartComponent = horizontal ? BarChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 10, right: 10, left: horizontal ? 80 : 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        {horizontal ? (
          <>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={80}
            />
          </>
        ) : (
          <>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={valueFormatter} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [valueFormatter(value as number), "Value"]}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS.primary} />
          ))}
        </Bar>
      </ChartComponent>
    </ResponsiveContainer>
  );
}

interface ComparisonBarChartProps {
  data: { label: string; current: number; previous: number }[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

export function ComparisonBarChart({
  data,
  height = 250,
  valueFormatter = formatNumber,
}: ComparisonBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={valueFormatter}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value, name) => [
            valueFormatter(value as number),
            name === "current" ? "Current" : "Previous",
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={(value) => (value === "current" ? "Current Year" : "Previous Year")}
        />
        <Bar dataKey="previous" fill={COLORS.surface} radius={[4, 4, 0, 0]} name="previous" />
        <Bar dataKey="current" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="current" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  data: { category: string; value: number; percentage: number; color: string }[];
  height?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  height = 200,
  showLegend = true,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="category"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => [formatCurrency(value as number), ""]}
          />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerValue && (
            <span className="text-xl font-bold text-surface-900">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-xs text-surface-500 uppercase tracking-wider">{centerLabel}</span>
          )}
        </div>
      )}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color || PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="text-xs text-surface-600">{entry.category}</span>
              <span className="text-xs font-medium text-surface-900">{entry.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LineComparisonChartProps {
  data: { label: string; actual: number; target: number }[];
  height?: number;
  valueFormatter?: (value: number) => string;
}

export function LineComparisonChart({
  data,
  height = 250,
  valueFormatter = formatNumber,
}: LineComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickFormatter={valueFormatter}
          width={60}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value, name) => [
            valueFormatter(value as number),
            name === "actual" ? "Actual" : "Target",
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          formatter={(value) => (value === "actual" ? "Actual KM" : "Target KM")}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke={COLORS.surface}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          name="target"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ fill: COLORS.primary, strokeWidth: 0, r: 3 }}
          name="actual"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Stat card with sparkline
interface StatCardWithSparklineProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  sparklineData?: { label: string; value: number }[];
  sparklineColor?: string;
}

export function StatCardWithSparkline({
  title,
  value,
  change,
  changeLabel = "vs last month",
  sparklineData,
  sparklineColor,
}: StatCardWithSparklineProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white rounded-lg border border-surface-200 p-4">
      <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">{title}</p>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="text-2xl font-bold text-surface-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
              >
                {isPositive ? "+" : ""}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-surface-400">{changeLabel}</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-20 h-10">
            <Sparkline data={sparklineData} color={sparklineColor} height={40} />
          </div>
        )}
      </div>
    </div>
  );
}
