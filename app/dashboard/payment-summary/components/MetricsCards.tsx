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
                  <>
                    {metric.isCurrency && "$"}
                    {metric.isCurrency ? 
                      metric.value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",") :
                      <NumberDynamic value={metric.value} />
                    }
                  </>
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
