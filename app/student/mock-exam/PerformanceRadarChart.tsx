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
type ExamSettings = { [subject: string]: { maxScore: number } };
type MockScores = { [subject: string]: number };
type AllMockData = {
  mock1?: MockScores;
  mock2?: MockScores;
  mock3?: MockScores;
};

interface PerformanceRadarChartProps {
  allMockData: AllMockData;
  studentClassType?: string | null;
  allExamSettings?: { [mockName: string]: ExamSettings };
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

const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

// Grade calculation utility
const calculateGrade = (score: number, maxScore: number): string => {
    if (maxScore === 0) return 'N/A';
    const percentage = score / maxScore;
    if (percentage >= 0.9) return 'A';
    if (percentage >= 0.8) return 'B';
    if (percentage >= 0.7) return 'C';
    if (percentage >= 0.6) return 'D';
    if (percentage >= 0.5) return 'E';
    return 'F';
};

const MOCK_COLORS = {
    mock1: 'rgba(136, 132, 216, 1)',
    mock2: 'rgba(255, 198, 88, 1)',
    mock3: 'rgba(130, 202, 157, 1)',
    mock4: 'rgba(88, 169, 255, 1)',
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

const CustomLegend = ({ datasets, totals, toggleDataset, hiddenDatasets }: any) => {
    return (
        <div className="flex flex-wrap justify-center items-start gap-x-6 sm:gap-x-8 gap-y-4 mt-4">
            {datasets.map((dataset: any) => {
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

const PerformanceRadarChart: React.FC<PerformanceRadarChartProps> = ({ allMockData, studentClassType, allExamSettings }) => {
  const [hiddenDatasets, setHiddenDatasets] = useState<string[]>([]);

  const toggleDataset = (label: string) => {
    setHiddenDatasets(prev => 
        prev.includes(label)
            ? prev.filter(l => l !== label)
            : [...prev, label]
    );
  };
    
  const totals = useMemo(() => {
    const calculatedTotals: { [key:string]: number } = {};
    if (!allExamSettings) return calculatedTotals;

    Object.entries(allMockData).forEach(([mockName, scores]) => {
      const settingsForMock = allExamSettings[mockName];
      if (scores && settingsForMock) {
        let totalForMock = 0;
        Object.keys(settingsForMock).forEach((subject) => {
          const score = scores[subject] || 0;
          if (subject.toLowerCase() === 'english') {
            if (score > 25) { totalForMock += (score - 25); }
          } else {
            totalForMock += score;
          }
        });
        calculatedTotals[mockName] = totalForMock;
      }
    });
    return calculatedTotals;
  }, [allMockData, allExamSettings]);

  const chartData = useMemo(() => {
    const isSocial = studentClassType && studentClassType.includes('S');
    const labels = SUBJECT_ORDER.map(subject => {
        const label = isSocial ? (SOCIAL_STUDIES_LABELS[subject] || subject) : subject;
        return capitalize(label);
    });

    const datasets: any[] = [];

    Object.entries(allMockData).forEach(([mockKey, scores]) => {
        if (!scores) return;

        const mockLabel = `Mock ${mockKey.replace('mock', '')}`;
        const color = MOCK_COLORS[mockKey as keyof typeof MOCK_COLORS] || 'rgba(255, 255, 255, 1)';
        const settingsForMock = allExamSettings?.[mockKey];
        
        const data = SUBJECT_ORDER.map(subject => {
            const score = scores[subject] || 0;
            const maxScore = settingsForMock?.[subject]?.maxScore || 100;
            if (maxScore === 0) return 0;
            return (score / maxScore) * 100;
        });

        datasets.push({
            label: mockLabel,
            data: data,
            backgroundColor: color.replace('1)', '0.4)'),
            borderColor: color,
            borderWidth: 1,
            hidden: hiddenDatasets.includes(mockLabel),
            // Custom properties for tooltip
            rawScores: SUBJECT_ORDER.map(subject => scores[subject] || 0),
            maxScores: SUBJECT_ORDER.map(subject => settingsForMock?.[subject]?.maxScore || 100),
        });
    });

    return { labels, datasets };
  }, [allMockData, hiddenDatasets, studentClassType, allExamSettings]);
  
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
        display: false,
      },
      tooltip: {
        backgroundColor: '#2d3748',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: function(context: any) {
            const dataset = context.dataset;
            const dataIndex = context.dataIndex;
            const rawScore = dataset.rawScores[dataIndex];
            const maxScore = dataset.maxScores[dataIndex];
            const grade = calculateGrade(rawScore, maxScore);
            return `${dataset.label}: ${rawScore} / ${maxScore} (${grade})`;
          },
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
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="relative h-80">
        <Radar data={chartData} options={chartOptions} />
      </div>
      <CustomLegend 
        datasets={chartData.datasets.slice().sort((a, b) => {
            const aNum = parseInt(a.label.replace('Mock ', ''), 10);
            const bNum = parseInt(b.label.replace('Mock ', ''), 10);
            return aNum - bNum;
        })} 
        totals={totals}
        toggleDataset={toggleDataset}
        hiddenDatasets={hiddenDatasets}
      />
    </motion.div>
  );
};

export default PerformanceRadarChart; 