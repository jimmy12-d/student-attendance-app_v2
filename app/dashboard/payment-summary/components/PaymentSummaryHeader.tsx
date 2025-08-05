"use client";
import React from "react";
import { mdiChartLine } from "@mdi/js";
import Icon from "../../../_components/Icon";

interface PaymentSummaryHeaderProps {
  isAuthenticated: boolean;
  startDate: string;
  endDate: string;
  formatDateRange: (start: string, end: string) => string;
}

const PaymentSummaryHeader: React.FC<PaymentSummaryHeaderProps> = ({
  isAuthenticated,
  startDate,
  endDate,
  formatDateRange
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl mb-6 shadow-2xl">
    </div>
  );
};

export default PaymentSummaryHeader;
