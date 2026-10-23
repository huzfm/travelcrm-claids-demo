'use client';

import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load all recharts components as a chunk
const RechartsComponents = lazy(() => import('./RechartsLoader'));

interface ChartProps {
  data: any[];
  dataKey?: string;
  xAxisKey?: string;
  height?: number;
}

export function BarChart({ data, dataKey = 'value', xAxisKey = 'name', height = 300 }: ChartProps) {
  return (
    <Suspense fallback={<Skeleton className={`h-[${height}px] w-full`} />}>
      <RechartsComponents
        type="bar"
        data={data}
        dataKey={dataKey}
        xAxisKey={xAxisKey}
        height={height}
      />
    </Suspense>
  );
}

export function PieChartComponent({ data, height = 300 }: { data: any[]; height?: number }) {
  return (
    <Suspense fallback={<Skeleton className={`h-[${height}px] w-full`} />}>
      <RechartsComponents type="pie" data={data} height={height} />
    </Suspense>
  );
}

export function LineChartComponent({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  height = 300,
}: ChartProps) {
  return (
    <Suspense fallback={<Skeleton className={`h-[${height}px] w-full`} />}>
      <RechartsComponents
        type="line"
        data={data}
        dataKey={dataKey}
        xAxisKey={xAxisKey}
        height={height}
      />
    </Suspense>
  );
}

export function AreaChartComponent({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  height = 300,
}: ChartProps) {
  return (
    <Suspense fallback={<Skeleton className={`h-[${height}px] w-full`} />}>
      <RechartsComponents
        type="area"
        data={data}
        dataKey={dataKey}
        xAxisKey={xAxisKey}
        height={height}
      />
    </Suspense>
  );
}
