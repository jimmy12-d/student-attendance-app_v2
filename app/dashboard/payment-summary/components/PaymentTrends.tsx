"use client";
import React from "react";
import { mdiChartLine, mdiCalendarRange } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";

interface PaymentTrendsProps {
  summaryData: {
    dailyBreakdown: { date: string; revenue: number; count: number; }[];
  };
  isLoading: boolean;
}

const PaymentTrends: React.FC<PaymentTrendsProps> = ({ summaryData, isLoading }) => {
  if (isLoading) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/10 border-0 shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg">
              <Icon path={mdiChartLine} size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Payment Trends
              </h3>
            </div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
          </div>
        </div>
      </CardBox>
    );
  }

  if (!summaryData?.dailyBreakdown?.length) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/10 border-0 shadow-xl">
        <div className="p-8 text-center">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 inline-block mb-4">
            <Icon path={mdiChartLine} size={2} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Trend Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            No daily payment records found for the selected period.
          </p>
        </div>
      </CardBox>
    );
  }

  const maxRevenue = Math.max(...summaryData.dailyBreakdown.map(d => d.revenue));
  const maxCount = Math.max(...summaryData.dailyBreakdown.map(d => d.count));

  return (
    <CardBox className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/10 border-0 shadow-xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg">
            <Icon path={mdiChartLine} size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Payment Trends
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Daily revenue and transaction patterns
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded"></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 -ml-1"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenue (Line)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #10B981 0, #10B981 3px, transparent 3px, transparent 6px)' }}></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 -ml-1"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transactions (Dashed)</span>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 py-4">
              <span>${Math.round(maxRevenue).toLocaleString()}</span>
              <span>${Math.round(maxRevenue * 0.75).toLocaleString()}</span>
              <span>${Math.round(maxRevenue * 0.5).toLocaleString()}</span>
              <span>${Math.round(maxRevenue * 0.25).toLocaleString()}</span>
              <span>$0</span>
            </div>

            {/* Chart container */}
            <div className="ml-20 relative h-64 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-800/50 rounded-xl p-4 border border-gray-200/30 dark:border-gray-700/30">
              {/* Grid lines */}
              <div className="absolute inset-4 grid grid-rows-4 gap-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border-t border-gray-200/50 dark:border-gray-700/50"></div>
                ))}
              </div>

              {/* Data visualization */}
              <div className="relative h-full flex items-end justify-between gap-1 px-2">
                {/* Revenue Line (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="transactionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  
                  {/* Revenue line */}
                  <polyline
                    fill="none"
                    stroke="url(#revenueGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={summaryData.dailyBreakdown.map((day, index) => {
                      const x = (index / (summaryData.dailyBreakdown.length - 1)) * 100;
                      const y = 100 - (day.revenue / maxRevenue) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                    className="drop-shadow-sm"
                  />
                  
                  {/* Transaction line */}
                  <polyline
                    fill="none"
                    stroke="url(#transactionGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5,5"
                    points={summaryData.dailyBreakdown.map((day, index) => {
                      const x = (index / (summaryData.dailyBreakdown.length - 1)) * 100;
                      const y = 100 - (day.count / maxCount) * 100;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                    className="drop-shadow-sm"
                  />
                  
                  {/* Data points for revenue */}
                  {summaryData.dailyBreakdown.map((day, index) => {
                    const x = (index / (summaryData.dailyBreakdown.length - 1)) * 100;
                    const y = 100 - (day.revenue / maxRevenue) * 100;
                    return (
                      <circle
                        key={`revenue-${index}`}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill="url(#revenueGradient)"
                        className="drop-shadow-sm hover:r-6 transition-all duration-200"
                      />
                    );
                  })}
                  
                  {/* Data points for transactions */}
                  {summaryData.dailyBreakdown.map((day, index) => {
                    const x = (index / (summaryData.dailyBreakdown.length - 1)) * 100;
                    const y = 100 - (day.count / maxCount) * 100;
                    return (
                      <circle
                        key={`transaction-${index}`}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="3"
                        fill="url(#transactionGradient)"
                        className="drop-shadow-sm hover:r-5 transition-all duration-200"
                      />
                    );
                  })}
                </svg>

                {/* Data points with tooltips */}
                {summaryData.dailyBreakdown.map((day, index) => {
                  const date = new Date(day.date);
                  const dayLabel = date.getDate().toString();
                  
                  return (
                    <div key={day.date} className="group relative flex-1 max-w-12 flex flex-col items-center h-full justify-end">
                      {/* Invisible hover area */}
                      <div className="absolute inset-0 w-full h-full bg-transparent hover:bg-blue-50/20 dark:hover:bg-blue-900/20 rounded transition-colors duration-200"></div>
                      
                      {/* Date label */}
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium relative z-20">
                        {dayLabel}
                      </div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-8 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30">
                        <div className="text-center">
                          <div className="font-semibold">{date.toLocaleDateString()}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600"></div>
                            <span>Revenue: ${day.revenue.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"></div>
                            <span>Transactions: {day.count}</span>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis label */}
            <div className="ml-20 mt-2 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Icon path={mdiCalendarRange} size={0.8} />
                <span>Days of Selected Period</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default PaymentTrends;
