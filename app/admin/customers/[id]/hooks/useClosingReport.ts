"use client";

import { useState } from "react";
import { Customer } from "../types";

export interface ClosingReportConfig {
  startDate: string;
  endDate: string;
  showDebtBalance: boolean;
  showPeriodBalance: boolean;
  showPaymentsTotal: boolean;
}

export function useClosingReport(customer: Customer | null) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDebtBalance, setShowDebtBalance] = useState(true);
  const [showPeriodBalance, setShowPeriodBalance] = useState(true);
  const [showPaymentsTotal, setShowPaymentsTotal] = useState(true);

  const setDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  };

  const generateReportUrl = (isThermal: boolean) => {
    if (!customer) return "#";
    const base = isThermal ? "/print/customer-report-thermal" : "/print/customer-report";
    return `${base}?customerId=${customer.id}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&showDebtBalance=${showDebtBalance}&showPeriodBalance=${showPeriodBalance}&showPaymentsTotal=${showPaymentsTotal}`;
  };

  const handleGenerateReport = (isThermal: boolean): boolean => {
    if (!customer || !startDate || !endDate) return false;
    if (new Date(startDate) > new Date(endDate)) return false;
    window.open(generateReportUrl(isThermal), "_blank");
    return true;
  };

  const config: ClosingReportConfig = {
    startDate,
    endDate,
    showDebtBalance,
    showPeriodBalance,
    showPaymentsTotal,
  };

  return {
    config,
    setStartDate,
    setEndDate,
    setShowDebtBalance,
    setShowPeriodBalance,
    setShowPaymentsTotal,
    setDefaultDates,
    handleGenerateReport,
  };
}
