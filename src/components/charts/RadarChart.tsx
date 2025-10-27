'use client';

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface RadarChartProps {
  data: Array<{
    subject: string;
    value: number;
    fullMark?: number;
  }>;
  dataKey?: string;
  className?: string;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
  showTooltip?: boolean;
  showLegend?: boolean;
  title?: string;
  description?: string;
}

/**
 * 레이더 차트 컴포넌트 (오행 분포 등에 사용)
 */
export function RadarChart({
  data,
  dataKey = 'value',
  className,
  height = 400,
  fillColor = '#3b82f6',
  strokeColor = '#2563eb',
  showTooltip = true,
  showLegend = false,
  title,
  description,
}: RadarChartProps) {
  // 데이터 정규화 (fullMark가 없으면 100으로 설정)
  const normalizedData = data.map(item => ({
    ...item,
    fullMark: item.fullMark || 100,
  }));

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">
            {payload[0].payload.subject}
          </p>
          <p className="text-sm text-gray-600">
            값: <span className="font-medium">{payload[0].value}</span>
            {payload[0].payload.fullMark && (
              <span className="text-gray-400">
                {' / '}
                {payload[0].payload.fullMark}
              </span>
            )}
          </p>
        </div>
      );
    }
    return null;
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
        <RechartsRadarChart data={normalizedData}>
          <PolarGrid
            gridType="polygon"
            radialLines={true}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            className="font-medium"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name={dataKey}
            dataKey={dataKey}
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: strokeColor, strokeWidth: 1, fillOpacity: 0.1 }}
            />
          )}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
              formatter={(value) => (
                <span className="text-sm text-gray-600">{value}</span>
              )}
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 오행 분석용 특화 레이더 차트
 */
export function FiveElementsRadarChart({
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
} & Partial<RadarChartProps>) {
  // 오행 색상 매핑
  const elementColors = {
    wood: '#16a34a',   // 녹색
    fire: '#dc2626',   // 빨강
    earth: '#ca8a04',  // 황색
    metal: '#6b7280',  // 회색
    water: '#2563eb',  // 파랑
  };

  const data = [
    { subject: '목(木)', value: woodScore, fullMark: 100 },
    { subject: '화(火)', value: fireScore, fullMark: 100 },
    { subject: '토(土)', value: earthScore, fullMark: 100 },
    { subject: '금(金)', value: metalScore, fullMark: 100 },
    { subject: '수(水)', value: waterScore, fullMark: 100 },
  ];

  return (
    <RadarChart
      data={data}
      className={className}
      fillColor="#3b82f6"
      strokeColor="#1e40af"
      title="오행 분포도"
      description="오행의 균형 상태를 나타냅니다"
      {...props}
    />
  );
}

/**
 * 다중 데이터셋 레이더 차트
 */
export function MultiRadarChart({
  datasets,
  categories,
  className,
  height = 400,
  showTooltip = true,
  showLegend = true,
  title,
  description,
}: {
  datasets: Array<{
    name: string;
    data: number[];
    color: string;
  }>;
  categories: string[];
  className?: string;
  height?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
  title?: string;
  description?: string;
}) {
  // 데이터 변환
  const data = categories.map((category, index) => {
    const point: any = { subject: category };
    datasets.forEach(dataset => {
      point[dataset.name] = dataset.data[index] || 0;
    });
    return point;
  });

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
        <RechartsRadarChart data={data}>
          <PolarGrid
            gridType="polygon"
            radialLines={true}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickCount={5}
            axisLine={false}
          />
          {datasets.map((dataset) => (
            <Radar
              key={dataset.name}
              name={dataset.name}
              dataKey={dataset.name}
              stroke={dataset.color}
              fill={dataset.color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
          {showTooltip && <Tooltip />}
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}