"use client";

import { Area, AreaChart, CartesianGrid, Label, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegendContent, ChartTooltipContent } from "./charts-base";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/lib/utils/cx";

interface LineChartData {
  date: Date;
  [key: string]: number | Date;
}

interface LineChart01Props {
  data?: LineChartData[];
  series?: {
    key: string;
    name: string;
    color?: string;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  className?: string;
}

const defaultLineData: LineChartData[] = [
  { date: new Date(2025, 0, 1), A: 600, B: 400, C: 100 },
  { date: new Date(2025, 1, 1), A: 620, B: 405, C: 160 },
  { date: new Date(2025, 2, 1), A: 630, B: 400, C: 170 },
  { date: new Date(2025, 3, 1), A: 650, B: 410, C: 190 },
  { date: new Date(2025, 4, 1), A: 600, B: 320, C: 200 },
  { date: new Date(2025, 5, 1), A: 650, B: 430, C: 230 },
  { date: new Date(2025, 6, 1), A: 620, B: 400, C: 200 },
  { date: new Date(2025, 7, 1), A: 750, B: 540, C: 300 },
  { date: new Date(2025, 8, 1), A: 780, B: 490, C: 390 },
  { date: new Date(2025, 9, 1), A: 750, B: 450, C: 300 },
  { date: new Date(2025, 10, 1), A: 780, B: 480, C: 340 },
  { date: new Date(2025, 11, 1), A: 820, B: 500, C: 450 },
];

const defaultColors: Record<string, string> = {
  A: "text-utility-brand-600",
  B: "text-utility-brand-400",
  C: "text-utility-brand-700",
};

export const LineChart01 = ({
  data = defaultLineData,
  series = [
    { key: "A", name: "Series 1", color: "text-utility-brand-600" },
    { key: "B", name: "Series 2", color: "text-utility-brand-400" },
    { key: "C", name: "Series 3", color: "text-utility-brand-700" },
  ],
  xAxisLabel = "Month",
  yAxisLabel = "Active users",
  height = 240,
  className,
}: LineChart01Props) => {
  const isDesktop = useBreakpoint("lg");

  return (
    <div className={cx("flex flex-col gap-2", className)} style={{ height }}>
      <ResponsiveContainer className="h-full">
        <AreaChart
          data={data}
          className="text-tertiary [&_.recharts-text]:text-xs"
          margin={{
            top: isDesktop ? 12 : 6,
            bottom: isDesktop ? 16 : 0,
          }}
        >
          <defs>
            <linearGradient id="gradient-line-01" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0.7" />
              <stop offset="95%" stopColor="currentColor" className="text-utility-brand-700" stopOpacity="0" />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />

          <Legend
            align="right"
            verticalAlign="top"
            layout={isDesktop ? "vertical" : "horizontal"}
            content={<ChartLegendContent className="-translate-y-2" />}
          />

          <XAxis
            fill="currentColor"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            dataKey="date"
            tickFormatter={(value) => value.toLocaleDateString(undefined, { month: "short" })}
            padding={{ left: 10, right: 10 }}
          >
            {isDesktop && (
              <Label fill="currentColor" className="!text-xs font-medium max-lg:hidden" position="bottom">
                {xAxisLabel}
              </Label>
            )}
          </XAxis>

          <YAxis
            fill="currentColor"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            tickFormatter={(value) => Number(value).toLocaleString()}
          >
            <Label
              value={yAxisLabel}
              fill="currentColor"
              className="!text-xs font-medium"
              style={{ textAnchor: "middle" }}
              angle={-90}
              position="insideLeft"
            />
          </YAxis>

          <Tooltip
            content={<ChartTooltipContent />}
            formatter={(value) => Number(value).toLocaleString()}
            labelFormatter={(value) => value.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            cursor={{
              className: "stroke-utility-brand-600 stroke-2",
            }}
          />

          {series.map((s, index) => (
            <Area
              key={s.key}
              isAnimationActive={false}
              className={cx(s.color || defaultColors[s.key], "[&_.recharts-area-area]:translate-y-1.5 [&_.recharts-area-area]:[clip-path:inset(0_0_6px_0)]")}
              dataKey={s.key}
              name={s.name}
              type="monotone"
              stroke="currentColor"
              strokeWidth={2}
              fill={index === 0 ? "url(#gradient-line-01)" : "none"}
              fillOpacity={index === 0 ? 0.1 : 0}
              activeDot={{
                className: "fill-bg-primary stroke-utility-brand-600 stroke-2",
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface SimpleLineChartProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export const SimpleLineChart = ({
  data,
  height = 200,
  color = "text-utility-brand-600",
  showGrid = true,
  showTooltip = true,
  className,
}: SimpleLineChartProps) => {
  return (
    <div className={cx("w-full", className)} style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="gradient-simple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="currentColor" className={color} stopOpacity="0.3" />
              <stop offset="95%" stopColor="currentColor" className={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border-secondary" />}
          
          <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs text-tertiary" />
          <YAxis axisLine={false} tickLine={false} className="text-xs text-tertiary" />
          
          {showTooltip && <Tooltip content={<ChartTooltipContent />} />}
          
          <Area
            type="monotone"
            dataKey="value"
            className={color}
            stroke="currentColor"
            strokeWidth={2}
            fill="url(#gradient-simple)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
