"use client";
import React from "react";
import { mdiChartLine, mdiCalendarRange } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";

interface PaymentTrendsProps {
  summaryData: {
    currentMonth: { date: string; revenue: number; count: number; }[];
    previousMonth: { date: string; revenue: number; count: number; }[];
  };
  isLoading: boolean;
  dateInterval?: { type: 'interval' | 'monthly'; value: string };
}

const PaymentTrends: React.FC<PaymentTrendsProps> = ({ summaryData, isLoading, dateInterval }) => {
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

  if (!summaryData?.currentMonth?.length && !summaryData?.previousMonth?.length) {
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
            No daily payment records found for the comparison period.
          </p>
        </div>
      </CardBox>
    );
  }

  // Calculate max values with better scaling logic
  const allRevenues = [
    ...(summaryData.currentMonth || []).map(d => d.revenue),
    ...(summaryData.previousMonth || []).map(d => d.revenue)
  ];
  
  // Use fixed scale for consistent labeling
  const maxRevenue = 10000;
  
  // Use the length of the longer dataset for consistent day positioning
  const maxDays = Math.max(
    summaryData.currentMonth?.length || 0,
    summaryData.previousMonth?.length || 0
  );

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
              {dateInterval?.type === 'monthly' 
                ? 'Comparing current period (27th prev month to 10th current) vs previous period (27th to 10th prev month)'
                : 'Comparing second half vs first half of selected period'
              }
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="group relative flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded"></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 -ml-1"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-help">
                {(() => {
                  const now = new Date();
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();
                  
                  // Current period: 27th of previous month to 10th of current month
                  const currentStartMonth = new Date(currentYear, currentMonth - 1, 27);
                  const currentEndMonth = new Date(currentYear, currentMonth, 10);
                  
                  const startMonthName = currentStartMonth.toLocaleDateString('en-US', { month: 'short' });
                  const endMonthName = currentEndMonth.toLocaleDateString('en-US', { month: 'short' });
                  
                  return `${startMonthName} 27 - ${endMonthName} 10`;
                })()}
              </span>
              {/* Legend tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-40">
                <div className="text-center">
                  <div className="font-semibold">
                    {dateInterval?.type === 'monthly' ? 'Current Period (27th-10th)' : 'Second Half'}
                  </div>
                  <div className="text-xs mt-1">
                    {(() => {
                      const totalRevenue = summaryData.currentMonth?.reduce((sum, day) => sum + day.revenue, 0) || 0;
                      const totalCount = summaryData.currentMonth?.reduce((sum, day) => sum + day.count, 0) || 0;
                      return `Total: $${totalRevenue.toFixed(2)} (${totalCount} transactions)`;
                    })()}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
              </div>
            </div>
            <div className="group relative flex items-center gap-2">
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #A855F7 0, #A855F7 3px, transparent 3px, transparent 6px)' }}></div>
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 -ml-1"></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-help">
                {(() => {
                  const now = new Date();
                  const currentMonth = now.getMonth();
                  const currentYear = now.getFullYear();
                  
                  // Previous period: 27th of two months ago to 10th of previous month
                  const previousStartMonth = new Date(currentYear, currentMonth - 2, 27);
                  const previousEndMonth = new Date(currentYear, currentMonth - 1, 10);
                  
                  const startMonthName = previousStartMonth.toLocaleDateString('en-US', { month: 'short' });
                  const endMonthName = previousEndMonth.toLocaleDateString('en-US', { month: 'short' });
                  
                  return `${startMonthName} 27 - ${endMonthName} 10`;
                })()}
              </span>
              {/* Legend tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-40">
                <div className="text-center">
                  <div className="font-semibold">
                    {dateInterval?.type === 'monthly' ? 'Previous Period (27th-10th)' : 'First Half'}
                  </div>
                  <div className="text-xs mt-1">
                    {(() => {
                      const totalRevenue = summaryData.previousMonth?.reduce((sum, day) => sum + day.revenue, 0) || 0;
                      const totalCount = summaryData.previousMonth?.reduce((sum, day) => sum + day.count, 0) || 0;
                      return `Total: $${totalRevenue.toFixed(2)} (${totalCount} transactions)`;
                    })()}
                  </div>
                </div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-14 w-16 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>$10,000</span>
              <span>$7,500</span>
              <span>$5,000</span>
              <span>$2,500</span>
              <span>$0</span>
            </div>

            {/* Chart container */}
            <div className="ml-20 relative h-80 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-800/50 rounded-xl p-4 border border-gray-200/30 dark:border-gray-700/30">
              {/* Grid lines */}
              <div className="absolute inset-4">
                <div className="absolute top-1/4 left-0 right-0 border-t border-gray-200/50 dark:border-gray-700/50"></div>
                <div className="absolute top-1/2 left-0 right-0 border-t border-gray-200/50 dark:border-gray-700/50"></div>
                <div className="absolute top-3/4 left-0 right-0 border-t border-gray-200/50 dark:border-gray-700/50"></div>
              </div>

              {/* Data visualization */}
              <div className="relative h-full flex items-end justify-between gap-1 px-2">
                {/* SVG Lines for both months */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 100 }}>
                  <defs>
                    <linearGradient id="currentMonthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="previousMonthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  
                  {/* Current Month line */}
                  {summaryData.currentMonth && summaryData.currentMonth.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="url(#currentMonthGradient)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      points={summaryData.currentMonth.map((day, index) => {
                        const x = maxDays === 1 ? 50 : (index / (maxDays - 1)) * 100;
                        const y = 100 - (day.revenue / maxRevenue) * 80;
                        return `${x},${y}`;
                      }).join(' ')}
                      className="drop-shadow-sm"
                    />
                  )}
                  
                  {/* Current Month single point line (horizontal) */}
                  {summaryData.currentMonth && summaryData.currentMonth.length === 1 && (
                    <line
                      x1="10"
                      y1={100 - (summaryData.currentMonth[0].revenue / maxRevenue) * 80}
                      x2="90"
                      y2={100 - (summaryData.currentMonth[0].revenue / maxRevenue) * 80}
                      stroke="url(#currentMonthGradient)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      className="drop-shadow-sm"
                    />
                  )}
                  
                  {/* Previous Month line */}
                  {summaryData.previousMonth && summaryData.previousMonth.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="url(#previousMonthGradient)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="2,2"
                      vectorEffect="non-scaling-stroke"
                      points={summaryData.previousMonth.map((day, index) => {
                        const x = maxDays === 1 ? 50 : (index / (maxDays - 1)) * 100;
                        const y = 100 - (day.revenue / maxRevenue) * 80;
                        return `${x},${y}`;
                      }).join(' ')}
                      className="drop-shadow-sm"
                    />
                  )}
                  
                  {/* Previous Month single point line (horizontal) */}
                  {summaryData.previousMonth && summaryData.previousMonth.length === 1 && (
                    <line
                      x1="10"
                      y1={100 - (summaryData.previousMonth[0].revenue / maxRevenue) * 80}
                      x2="90"
                      y2={100 - (summaryData.previousMonth[0].revenue / maxRevenue) * 80}
                      stroke="url(#previousMonthGradient)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeDasharray="2,2"
                      vectorEffect="non-scaling-stroke"
                      className="drop-shadow-sm"
                    />
                  )}
                  
                  {/* Data points for current month */}
                  {summaryData.currentMonth && summaryData.currentMonth.map((day, index) => {
                    const x = maxDays === 1 
                      ? 50 
                      : (index / (maxDays - 1)) * 100;
                    const y = 100 - (day.revenue / maxRevenue) * 80;
                    return (
                      <circle
                        key={`current-${index}`}
                        cx={x}
                        cy={y}
                        r="1"
                        fill="url(#currentMonthGradient)"
                        className="drop-shadow-sm"
                      />
                    );
                  })}
                  
                  {/* Data points for previous month */}
                  {summaryData.previousMonth && summaryData.previousMonth.map((day, index) => {
                    const x = maxDays === 1 
                      ? 50 
                      : (index / (maxDays - 1)) * 100;
                    const y = 100 - (day.revenue / maxRevenue) * 80;
                    return (
                      <circle
                        key={`previous-${index}`}
                        cx={x}
                        cy={y}
                        r="0.8"
                        fill="url(#previousMonthGradient)"
                        className="drop-shadow-sm"
                      />
                    );
                  })}
                </svg>

                {/* Data points with tooltips - positioned at exact SVG coordinates */}
                {Array.from({ length: maxDays }).map((_, index) => {
                  const currentDay = summaryData.currentMonth?.[index];
                  const previousDay = summaryData.previousMonth?.[index];
                  
                  // Use current month date if available, otherwise previous month
                  const referenceDate = currentDay?.date || previousDay?.date;
                  if (!referenceDate) return null;
                  
                  const date = new Date(referenceDate);
                  const dayLabel = date.getDate().toString();
                  
                  // Calculate exact x position to match SVG circles
                  const xPos = maxDays === 1 ? 50 : (index / (maxDays - 1)) * 100;
                  
                  // For comparison, find the corresponding date in the previous period
                  // If current date is Sep 1, look for Aug 1 in previous period
                  let comparisonPreviousDay: { date: string; revenue: number; count: number; } | undefined = previousDay;
                  if (currentDay && summaryData.previousMonth) {
                    const currentDate = new Date(currentDay.date);
                    // Calculate corresponding date in previous month (same day, previous month)
                    const comparisonDate = new Date(currentDate);
                    comparisonDate.setMonth(comparisonDate.getMonth() - 1);
                    const comparisonDateStr = comparisonDate.toISOString().split('T')[0];
                    
                    // Find the data point for this comparison date
                    comparisonPreviousDay = summaryData.previousMonth.find(day => day.date === comparisonDateStr);
                  }
                  
                  return (
                    <div 
                      key={`day-${index}`} 
                      className="group absolute bottom-0 w-6 h-full flex flex-col items-center justify-end"
                      style={{ left: `${xPos}%`, transform: 'translateX(-50%)' }}
                    >
                      {/* Invisible hover area */}
                      <div className="absolute inset-0 w-full h-full bg-transparent hover:bg-blue-50/20 dark:hover:bg-blue-900/20 rounded transition-colors duration-200"></div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-8 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-30">
                        <div className="text-center">
                          <div className="font-semibold">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          {currentDay && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600"></div>
                              <span>
                                {dateInterval?.type === 'monthly' ? 'Current Period' : '2nd Half'}: ${currentDay.revenue.toFixed(2)} ({currentDay.count} txns)
                              </span>
                            </div>
                          )}
                          {previousDay && (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600"></div>
                              <span>
                                {dateInterval?.type === 'monthly' ? 'Previous Period' : '1st Half'}: ${previousDay.revenue.toFixed(2)} ({previousDay.count} txns)
                              </span>
                            </div>
                          )}
                          {currentDay && comparisonPreviousDay && (
                            <div className="mt-2 pt-2 border-t border-gray-600 dark:border-gray-400">
                              <div className="text-center">
                                <div className="text-xs font-medium">
                                  vs {new Date(comparisonPreviousDay.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}: 
                                  <span className={currentDay.revenue >= comparisonPreviousDay.revenue ? 'text-green-400' : 'text-red-400'}>
                                    {currentDay.revenue > comparisonPreviousDay.revenue ? '+' : ''}${(currentDay.revenue - comparisonPreviousDay.revenue).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          {!currentDay && !previousDay && (
                            <div className="text-gray-500">No data available</div>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>

            {/* Date labels below chart */}
            <div className="ml-20 mt-2 flex justify-between px-2">
              {Array.from({ length: maxDays }).map((_, index) => {
                const currentDay = summaryData.currentMonth?.[index];
                const previousDay = summaryData.previousMonth?.[index];
                const referenceDate = currentDay?.date || previousDay?.date;
                if (!referenceDate) return null;
                
                const date = new Date(referenceDate);
                const dayLabel = date.getDate().toString();
                
                return (
                  <div key={`date-label-${index}`} className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                    {dayLabel}
                  </div>
                );
              }).filter(Boolean)}
            </div>

            {/* X-axis label */}
            <div className="ml-20 mt-2 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Icon path={mdiCalendarRange} size={16} />
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
