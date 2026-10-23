'use client';

// This file loads all recharts components in a single chunk
// This is a large library (~150kb) so we lazy load it

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart as RechartsLine,
  Line,
  AreaChart as RechartsArea,
  Area,
} from 'recharts';

const COLORS = ['#db0201', '#1A1918', '#78736F', '#f79694', '#3F3C39', '#A8A29F'];

interface ChartProps {
  type: 'bar' | 'pie' | 'line' | 'area';
  data: any[];
  dataKey?: string;
  xAxisKey?: string;
  height?: number;
}

export default function RechartsLoader({
  type,
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  height = 300,
}: ChartProps) {
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="text-xs" />
          <YAxis tick={{ fontSize: 12 }} className="text-xs" />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#db0201" radius={[4, 4, 0, 0]} />
        </RechartsBar>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie') {
    return (
      <div className="flex flex-col">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ percent }) => {
                if (percent === 0) return null;
                return `${((percent ?? 0) * 100).toFixed(0)}%`;
              }}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e8e6e4',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any, props: any) => [
                `${value} leads`,
                props.payload.label || name,
              ]}
              itemStyle={{ color: '#1a1918', fontWeight: 600 }}
            />
          </RechartsPie>
        </ResponsiveContainer>
        {/* Custom Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
          {data.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shadow-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs font-medium text-neutral-600">
                {entry.label || entry.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLine data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="text-xs" />
          <YAxis tick={{ fontSize: 12 }} className="text-xs" />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke="#db0201" strokeWidth={2} dot={{ r: 4 }} />
        </RechartsLine>
      </ResponsiveContainer>
    );
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsArea data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} className="text-xs" />
          <YAxis tick={{ fontSize: 12 }} className="text-xs" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#db0201"
            fill="#db02011F"
            strokeWidth={2}
          />
        </RechartsArea>
      </ResponsiveContainer>
    );
  }

  return null;
}
