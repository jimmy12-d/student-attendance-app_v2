"use client";

import React, { useMemo, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Define types for our data
type MockScores = { [subject: string]: number };
type AllMockData = {
  mock1?: MockScores;
  mock2?: MockScores;
  mock3?: MockScores;
};

interface PerformanceRadarChartProps {
  allMockData: AllMockData;
  progressStatus: string;
}

const SUBJECT_ORDER = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history'];
const SOCIAL_STUDIES_LABELS: { [key: string]: string } = {
  math: 'Khmer',
  khmer: 'Math',
  chemistry: 'History',
  physics: 'Moral',
  biology: 'Geometry',
  history: 'Earth',
};

const MOCK_COLORS = {
    mock1: 'rgba(136, 132, 216, 1)',
    mock2: 'rgba(255, 198, 88, 1)',
    mock3: 'rgba(130, 202, 157, 1)',
};

const Checkmark = () => (
    <motion.svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 0.2 }}
    >
        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
);

const CustomLegend = ({ datasets, totals, toggleDataset, hiddenDatasets, showMock3 }: any) => {
    return (
        <div className="flex justify-center items-start gap-x-8 mt-4">
            {datasets.map((dataset: any) => {
                if (dataset.label === 'Mock 3' && !showMock3) return null;

                const isHidden = hiddenDatasets.includes(dataset.label);
                const mockKey = dataset.label.toLowerCase().replace(' ', '');
                const color = MOCK_COLORS[mockKey as keyof typeof MOCK_COLORS];

                return (
                    <div
                        key={dataset.label}
                        onClick={() => toggleDataset(dataset.label)}
                        className="flex flex-col items-center cursor-pointer"
                    >
                        <div className="flex items-center gap-x-2">
                            <motion.div 
                                className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
                                animate={{ 
                                    backgroundColor: isHidden ? 'transparent' : color,
                                    borderColor: isHidden ? 'rgba(100, 115, 135, 1)' : color,
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                <AnimatePresence>
                                    {!isHidden && <Checkmark />}
                                </AnimatePresence>
                            </motion.div>
                            <motion.span 
                                className="font-semibold text-sm"
                                animate={{ color: isHidden ? 'rgba(100, 115, 135, 1)' : 'rgba(226, 232, 240, 1)' }}
                                transition={{ duration: 0.3 }}
                            >
                                {dataset.label}
                            </motion.span>
                        </div>
                        <motion.p 
                            className="font-bold text-lg ml-4" 
                            animate={{ color: isHidden ? 'rgba(100, 115, 135, 1)' : color }}
                            transition={{ duration: 0.3 }}
                        >
                            {totals[mockKey]}
                        </motion.p>
                    </div>
                );
            })}
        </div>
    );
};

const PerformanceRadarChart: React.FC<PerformanceRadarChartProps> = ({ allMockData, progressStatus }) => {
  const [hiddenDatasets, setHiddenDatasets] = useState<string[]>([]);
  const showMock3 = progressStatus === 'Paid Star';

  const toggleDataset = (label: string) => {
    setHiddenDatasets(prev => 
        prev.includes(label)
            ? prev.filter(l => l !== label)
            : [...prev, label]
    );
  };
    
  const totals = useMemo(() => {
    const calculatedTotals: { [key: string]: number } = { mock1: 0, mock2: 0, mock3: 0 };
    Object.entries(allMockData).forEach(([mockName, scores]) => {
        if (scores && (mockName === 'mock1' || mockName === 'mock2' || mockName === 'mock3')) {
            let totalForMock = 0;
            Object.entries(scores).forEach(([subject, score]) => {
                if (subject.toLowerCase() === 'english') {
                    if (score > 25) totalForMock += (score - 25);
                } else {
                    totalForMock += score || 0;
                }
            });
            calculatedTotals[mockName] = totalForMock;
        }
    });
    return calculatedTotals;
  }, [allMockData]);

  const chartData = useMemo(() => {
    const labels = SUBJECT_ORDER.map(subject => SOCIAL_STUDIES_LABELS[subject] || subject);
    const datasets: {
        label: string;
        data: number[];
        backgroundColor: string;
        borderColor: string;
        borderWidth: number;
        hidden?: boolean;
    }[] = [];

    if (allMockData.mock1) {
        datasets.push({
            label: 'Mock 1',
            data: SUBJECT_ORDER.map(subject => allMockData.mock1?.[subject] || 0),
            backgroundColor: 'rgba(136, 132, 216, 0.4)',
            borderColor: MOCK_COLORS.mock1,
            borderWidth: 1,
            hidden: hiddenDatasets.includes('Mock 1'),
        });
    }
    if (allMockData.mock2) {
        datasets.push({
            label: 'Mock 2',
            data: SUBJECT_ORDER.map(subject => allMockData.mock2?.[subject] || 0),
            backgroundColor: 'rgba(255, 198, 88, 0.4)',
            borderColor: MOCK_COLORS.mock2,
            borderWidth: 1,
            hidden: hiddenDatasets.includes('Mock 2'),
        });
    }
    if (showMock3 && allMockData.mock3) {
        datasets.push({
            label: 'Mock 3',
            data: SUBJECT_ORDER.map(subject => allMockData.mock3?.[subject] || 0),
            backgroundColor: 'rgba(130, 202, 157, 0.4)',
            borderColor: MOCK_COLORS.mock3,
            borderWidth: 1,
            hidden: hiddenDatasets.includes('Mock 3'),
        });
    }
    return { labels, datasets };
  }, [allMockData, showMock3, hiddenDatasets]);
  
  const chartOptions: any = {
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: '#555' },
        grid: { color: '#555' },
        pointLabels: { color: '#ddd', font: { size: 12 } },
        ticks: { display: false, backdropColor: 'transparent' },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      legend: {
        display: false, // Disable default legend
      },
      tooltip: {
        backgroundColor: '#2d3748',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          labelColor: function(context: any) {
            return {
              borderColor: context.dataset.borderColor,
              backgroundColor: context.dataset.borderColor,
              borderWidth: 2,
              borderRadius: 2,
            };
          }
        }
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-4 h-96 flex justify-center items-center">
        <p className="text-slate-500">Not enough data to display the performance chart.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer"
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="relative h-80">
        <Radar data={chartData} options={chartOptions} />
      </div>
      <CustomLegend 
        datasets={chartData.datasets} 
        totals={totals}
        toggleDataset={toggleDataset}
        hiddenDatasets={hiddenDatasets}
        showMock3={showMock3}
      />
    </motion.div>
  );
};

export default PerformanceRadarChart; 