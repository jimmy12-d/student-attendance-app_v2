"use client";
import React from "react";
import { mdiChartPie, mdiTrendingUp, mdiAccountGroup } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";

interface ClassTypeAnalysisProps {
  summaryData: {
    classTypeBreakdown: { classType: string; count: number; revenue: number; }[];
    comparisonData?: { classType: string; previousCount: number; previousRevenue: number; }[];
  };
  dateInterval: { type: 'interval' | 'monthly'; value: string; };
  isLoading: boolean;
}

const ClassTypeAnalysis: React.FC<ClassTypeAnalysisProps> = ({ 
  summaryData, 
  dateInterval, 
  isLoading 
}) => {
  const classColors = [
    "from-blue-500 to-cyan-600",
    "from-green-500 to-emerald-600", 
    "from-purple-500 to-indigo-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-yellow-500 to-amber-600"
  ];

  const getComparisonData = (classType: string) => {
    if (dateInterval.type !== 'monthly' || !summaryData.comparisonData) return null;
    return summaryData.comparisonData.find(c => c.classType === classType);
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatPercentage = (percentage: number) => {
    const isPositive = percentage >= 0;
    return {
      value: Math.abs(percentage).toFixed(1),
      isPositive,
      icon: isPositive ? "↗" : "↘",
      color: isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    };
  };

  if (isLoading) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 border-0 shadow-xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
              <Icon path={mdiChartPie} size={1.5} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Class Type Analysis
                {dateInterval.type === 'monthly' && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    vs Previous Month
                  </span>
                )}
              </h3>
            </div>
          </div>
          
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
            ))}
          </div>
        </div>
      </CardBox>
    );
  }

  if (!summaryData?.classTypeBreakdown?.length) {
    return (
      <CardBox className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 border-0 shadow-xl">
        <div className="p-8 text-center">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 inline-block mb-4">
            <Icon path={mdiChartPie} size={2} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Class Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            No payment records found for the selected period.
          </p>
        </div>
      </CardBox>
    );
  }

  return (
    <CardBox className="bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10 border-0 shadow-xl">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg">
            <Icon path={mdiChartPie} size={1.5} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Class Type Analysis
              {dateInterval.type === 'monthly' && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  vs Previous Month
                </span>
              )}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Revenue and transaction breakdown by class type
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {summaryData.classTypeBreakdown.map((classData, index) => {
            const comparison = getComparisonData(classData.classType);
            const revenueChange = comparison ? calculatePercentageChange(classData.revenue, comparison.previousRevenue) : null;
            const countChange = comparison ? calculatePercentageChange(classData.count, comparison.previousCount) : null;
            const revenueFormat = revenueChange !== null ? formatPercentage(revenueChange) : null;
            const countFormat = countChange !== null ? formatPercentage(countChange) : null;
            
            return (
              <div 
                key={classData.classType}
                className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-purple-300/50 dark:hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${classColors[index % classColors.length]} shadow-sm`}></div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                        {classData.classType}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-2">
                          <Icon path={mdiAccountGroup} size={0.8} className="text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {classData.count} transactions
                          </span>
                          {countFormat && dateInterval.type === 'monthly' && (
                            <span className={`text-xs font-semibold ${countFormat.color} bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm`}>
                              {countFormat.icon} {countFormat.value}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon path={mdiTrendingUp} size={0.8} className="text-gray-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            ${classData.revenue.toLocaleString()}
                          </span>
                          {revenueFormat && dateInterval.type === 'monthly' && (
                            <span className={`text-xs font-semibold ${revenueFormat.color} bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm`}>
                              {revenueFormat.icon} {revenueFormat.value}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {comparison && dateInterval.type === 'monthly' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous Month</p>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {comparison.previousCount} transactions
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          ${comparison.previousRevenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Decorative gradient bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400/20 via-indigo-400/20 to-purple-400/20 rounded-b-2xl group-hover:from-purple-400/40 group-hover:via-indigo-400/40 group-hover:to-purple-400/40 transition-all duration-300"></div>
              </div>
            );
          })}
        </div>
      </div>
    </CardBox>
  );
};

export default ClassTypeAnalysis;
