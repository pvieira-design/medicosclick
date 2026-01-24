"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegendContent, ChartTooltipContent } from "./charts-base";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/lib/utils/cx";

interface BarChartData {
  name: string;
  [key: string]: string | number;
}

interface BarChart01Props {
  data?: BarChartData[];
  dataKey?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  radius?: number;
  className?: string;
}

const defaultBarData: BarChartData[] = [
  { name: "Jan", value: 400 },
  { name: "Fev", value: 300 },
  { name: "Mar", value: 500 },
  { name: "Abr", value: 450 },
  { name: "Mai", value: 470 },
  { name: "Jun", value: 600 },
];

export const BarChart01 = ({
  data = defaultBarData,
  dataKey = "value",
  height = 240,
  color = "fill-utility-brand-500",
  showGrid = true,
  radius = 4,
  className,
}: BarChart01Props) => {
  const isDesktop = useBreakpoint("lg");

  return (
    <div className={cx("w-full", className)} style={{ height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          className="text-tertiary [&_.recharts-text]:text-xs"
          margin={{
            top: isDesktop ? 12 : 6,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        >
          {showGrid && <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />}
          
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            className="text-xs text-tertiary"
          />
          
          <YAxis
            axisLine={false}
            tickLine={false}
            className="text-xs text-tertiary"
            tickFormatter={(value) => Number(value).toLocaleString()}
          />
          
          <Tooltip content={<ChartTooltipContent />} cursor={{ className: "fill-utility-gray-50" }} />
          
          <Bar
            dataKey={dataKey}
            className={color}
            fill="currentColor"
            radius={[radius, radius, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface StackedBarChartProps {
  data?: BarChartData[];
  series?: {
    key: string;
    name: string;
    color: string;
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

const defaultStackedData: BarChartData[] = [
  { name: "Jan", completed: 400, pending: 100, cancelled: 50 },
  { name: "Fev", completed: 300, pending: 150, cancelled: 30 },
  { name: "Mar", completed: 500, pending: 80, cancelled: 40 },
  { name: "Abr", completed: 450, pending: 120, cancelled: 60 },
  { name: "Mai", completed: 470, pending: 90, cancelled: 45 },
  { name: "Jun", completed: 600, pending: 70, cancelled: 35 },
];

export const StackedBarChart = ({
  data = defaultStackedData,
  series = [
    { key: "completed", name: "Realizadas", color: "fill-utility-success-500" },
    { key: "pending", name: "Pendentes", color: "fill-utility-warning-500" },
    { key: "cancelled", name: "Canceladas", color: "fill-utility-error-500" },
  ],
  height = 240,
  showGrid = true,
  showLegend = true,
  className,
}: StackedBarChartProps) => {
  return (
    <div className={cx("w-full", className)} style={{ height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          className="text-tertiary [&_.recharts-text]:text-xs"
          margin={{ top: 12, right: 0, bottom: 0, left: 0 }}
        >
          {showGrid && <CartesianGrid vertical={false} stroke="currentColor" className="text-utility-gray-100" />}
          
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => Number(v).toLocaleString()} />
          
          <Tooltip content={<ChartTooltipContent />} cursor={{ className: "fill-utility-gray-50" }} />
          
          {showLegend && <Legend content={<ChartLegendContent />} />}
          
          {series.map((s, index) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="a"
              className={s.color}
              fill="currentColor"
              radius={index === series.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface HorizontalBarChartProps {
  data?: BarChartData[];
  dataKey?: string;
  height?: number;
  color?: string;
  showValue?: boolean;
  className?: string;
}

const defaultHorizontalData: BarChartData[] = [
  { name: "P1", value: 85 },
  { name: "P2", value: 70 },
  { name: "P3", value: 55 },
  { name: "P4", value: 40 },
  { name: "P5", value: 25 },
];

export const HorizontalBarChart = ({
  data = defaultHorizontalData,
  dataKey = "value",
  height = 200,
  color = "fill-utility-brand-500",
  className,
}: HorizontalBarChartProps) => {
  return (
    <div className={cx("w-full", className)} style={{ height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          className="text-tertiary [&_.recharts-text]:text-xs"
          margin={{ top: 5, right: 30, bottom: 5, left: 30 }}
        >
          <CartesianGrid horizontal={false} stroke="currentColor" className="text-utility-gray-100" />
          
          <XAxis type="number" axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} />
          
          <Tooltip content={<ChartTooltipContent />} cursor={{ className: "fill-utility-gray-50" }} />
          
          <Bar
            dataKey={dataKey}
            className={color}
            fill="currentColor"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
