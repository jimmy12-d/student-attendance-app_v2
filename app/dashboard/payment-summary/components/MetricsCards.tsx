"use client";
import React from "react";
import { mdiCurrencyUsd, mdiAccount, mdiTrendingUp, mdiCalendar } from "@mdi/js";
import Icon from "../../../_components/Icon";
import CardBox from "../../../_components/CardBox";
import NumberDynamic from "../../../_components/NumberDynamic";

interface MetricsCardsProps {
  summaryData: {
    totalRevenue: number;
    totalTransactions: number;
    averagePayment: number;
    dailyAverage: number;
    unpaidStudentsCount: number;
  };
  isLoading: boolean;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ summaryData, isLoading }) => {
  type MetricCard = {
    title: string;
    value: number;
    icon: string;
    color: string;
    bgColor: string;
    darkBgColor: string;
    isCurrency: boolean;
    trend?: string;
  };

  const metricsCards: MetricCard[] = [
    {
      title: "Total Revenue",
      value: summaryData?.totalRevenue || 0,
      icon: mdiCurrencyUsd,
      color: "from-emerald-500 to-green-600",
      bgColor: "from-emerald-50 to-green-50",
      darkBgColor: "from-emerald-900/20 to-green-900/20",
      isCurrency: true,
      // trend: "+12.1%"
    },
    {
      title: "Total Transactions",
      value: summaryData?.totalTransactions || 0,
      icon: mdiAccount,
      color: "from-blue-500 to-cyan-600",
      bgColor: "from-blue-50 to-cyan-50",
      darkBgColor: "from-blue-900/20 to-cyan-900/20",
      isCurrency: false,
      // trend: "+8.3%"
    },
    {
      title: "Average Payment",
      value: summaryData?.averagePayment || 0,
      icon: mdiTrendingUp,
      color: "from-purple-500 to-indigo-600",
      bgColor: "from-purple-50 to-indigo-50",
      darkBgColor: "from-purple-900/20 to-indigo-900/20",
      isCurrency: true,
      // trend: "+5.7%"
    },
    {
      title: "Daily Average",
      value: summaryData?.dailyAverage || 0,
      icon: mdiCalendar,
      color: "from-orange-500 to-red-600",
      bgColor: "from-orange-50 to-red-50",
      darkBgColor: "from-orange-900/20 to-red-900/20",
      isCurrency: true,
      // trend: "+15.2%"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {metricsCards.map((metric, index) => (
        <CardBox
          key={metric.title}
          className={`bg-gradient-to-br ${metric.bgColor} dark:${metric.darkBgColor} border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-default`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-2xl bg-gradient-to-r ${metric.color} shadow-lg`}>
                <Icon path={metric.icon} size={24} className="text-white mt-1" />
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  {metric.trend}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {metric.title}
              </p>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>
                      {metric.isCurrency && "$"}
                      {metric.isCurrency ? 
                        metric.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") :
                        <NumberDynamic value={metric.value} />
                      }
                    </span>
                    {metric.title === "Total Transactions" && summaryData?.unpaidStudentsCount > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {summaryData.unpaidStudentsCount} unpaid
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardBox>
      ))}
    </div>
  );
};

export default MetricsCards;
