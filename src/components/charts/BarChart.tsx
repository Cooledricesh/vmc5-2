'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { cn } from '@/lib/utils';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  dataKey?: string;
  className?: string;
  height?: number;
  barColor?: string | string[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  showLabel?: boolean;
  orientation?: 'horizontal' | 'vertical';
  title?: string;
  description?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

/**
 * 바 차트 컴포넌트
 */
export function BarChart({
  data,
  dataKey = 'value',
  className,
  height = 400,
  barColor = '#3b82f6',
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showLabel = false,
  orientation = 'vertical',
  title,
  description,
  yAxisLabel,
  xAxisLabel,
}: BarChartProps) {
  const isHorizontal = orientation === 'horizontal';

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            {yAxisLabel || '값'}: {' '}
            <span className="font-medium text-blue-600">
              {payload[0].value.toLocaleString()}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // 커스텀 라벨 컴포넌트
  const CustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={isHorizontal ? x + width + 5 : x + width / 2}
        y={isHorizontal ? y + height / 2 : y - 5}
        fill="#6b7280"
        textAnchor={isHorizontal ? 'start' : 'middle'}
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 차트 헤더 */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}

      {/* 차트 본체 */}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.7}
            />
          )}

          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: 'insideBottom',
                        offset: -10,
                        style: { textAnchor: 'middle', fill: '#6b7280' },
                      }
                    : undefined
                }
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                interval={0}
                angle={data.length > 5 ? -45 : 0}
                textAnchor={data.length > 5 ? 'end' : 'middle'}
                height={data.length > 5 ? 80 : 60}
                label={
                  xAxisLabel
                    ? {
                        value: xAxisLabel,
                        position: 'insideBottom',
                        offset: -10,
                        style: { textAnchor: 'middle', fill: '#6b7280' },
                      }
                    : undefined
                }
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={
                  yAxisLabel
                    ? {
                        value: yAxisLabel,
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#6b7280' },
                      }
                    : undefined
                }
              />
            </>
          )}

          {showTooltip && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}

          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {showLabel && (
              <LabelList
                dataKey={dataKey}
                content={<CustomLabel />}
              />
            )}
            {Array.isArray(barColor) ? (
              data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColor[index % barColor.length]}
                />
              ))
            ) : (
              <Cell fill={barColor} />
            )}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 오행 분석용 특화 바 차트
 */
export function FiveElementsBarChart({
  woodScore,
  fireScore,
  earthScore,
  metalScore,
  waterScore,
  className,
  ...props
}: {
  woodScore: number;
  fireScore: number;
  earthScore: number;
  metalScore: number;
  waterScore: number;
  className?: string;
} & Partial<BarChartProps>) {
  // 오행 색상 매핑
  const elementColors = [
    '#16a34a', // 목(木) - 녹색
    '#dc2626', // 화(火) - 빨강
    '#ca8a04', // 토(土) - 황색
    '#6b7280', // 금(金) - 회색
    '#2563eb', // 수(水) - 파랑
  ];

  const data = [
    { name: '목(木)', value: woodScore },
    { name: '화(火)', value: fireScore },
    { name: '토(土)', value: earthScore },
    { name: '금(金)', value: metalScore },
    { name: '수(水)', value: waterScore },
  ];

  return (
    <BarChart
      data={data}
      className={className}
      barColor={elementColors}
      title="오행 분포"
      description="각 오행의 강도를 나타냅니다"
      yAxisLabel="강도"
      showLabel={true}
      {...props}
    />
  );
}

/**
 * 스택 바 차트 (여러 데이터 세트)
 */
export function StackedBarChart({
  data,
  dataKeys,
  colors,
  className,
  height = 400,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  title,
  description,
}: {
  data: Array<{ [key: string]: any }>;
  dataKeys: string[];
  colors: string[];
  className?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.7}
            />
          )}
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          {showTooltip && <Tooltip />}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={colors[index % colors.length]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 비교 바 차트 (나란히 표시)
 */
export function GroupedBarChart({
  data,
  dataKeys,
  colors,
  className,
  height = 400,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  title,
  description,
}: {
  data: Array<{ [key: string]: any }>;
  dataKeys: string[];
  colors: string[];
  className?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn('w-full', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              strokeOpacity={0.7}
            />
          )}
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          {showTooltip && <Tooltip />}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}