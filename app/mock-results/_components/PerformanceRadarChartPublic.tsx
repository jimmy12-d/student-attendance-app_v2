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
type MockScores = { [subject: string]: number | 'absent' };
type AllMockData = { [mockName: string]: MockScores };

interface PerformanceRadarChartPublicProps {
  allMockData: AllMockData;
  studentClassType?: string | null;
  allExamSettings?: { [mockName: string]: ExamSettings };
  mockReadiness?: { [mockId: string]: boolean };
  studentName?: string | null;
  lastPaymentMonth?: string | null;
}

// Subject name mapping
const SUBJECT_NAMES: { [key: string]: string } = {
  khmer: 'Khmer',
  math: 'Math',
  english: 'English',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  history: 'History',
  geography: 'Geography',
  moral: 'Moral',
  physical_education: 'Physical Education',
  earth_science: 'Earth Science',
  earth: 'Earth Science',
  homeroom: 'Homeroom',
  science: 'Science',
  geometry: 'Geometry'
};

// Default subject order, but will be dynamically determined based on examSettings
// Order prioritizes: Grade 12S (khmer, math, history, moral, geography, earth), then science subjects
const DEFAULT_SUBJECT_ORDER = ['khmer', 'math', 'history', 'moral', 'geography', 'earth', 'geometry', 'chemistry', 'physics', 'biology', 'english'];

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
    const [isDark, setIsDark] = React.useState(true);

    React.useEffect(() => {
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        
        checkTheme();
        
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => observer.disconnect();
    }, []);

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
                                    borderColor: isHidden ? (isDark ? 'rgba(100, 115, 135, 1)' : 'rgba(156, 163, 175, 1)') : color,
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                <AnimatePresence>
                                    {!isHidden && <Checkmark />}
                                </AnimatePresence>
                            </motion.div>
                            <motion.span 
                                className="font-semibold text-sm"
                                animate={{ color: isHidden ? (isDark ? 'rgba(100, 115, 135, 1)' : 'rgba(156, 163, 175, 1)') : (isDark ? 'rgba(226, 232, 240, 1)' : 'rgba(31, 41, 55, 1)') }}
                                transition={{ duration: 0.3 }}
                            >
                                {dataset.label}
                            </motion.span>
                        </div>
                        <motion.p 
                            className="font-bold text-lg ml-4" 
                            animate={{ color: isHidden ? (isDark ? 'rgba(100, 115, 135, 1)' : 'rgba(156, 163, 175, 1)') : color }}
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

const PerformanceRadarChartPublic: React.FC<PerformanceRadarChartPublicProps> = ({ allMockData, studentClassType, allExamSettings, mockReadiness, studentName, lastPaymentMonth }) => {
  const [hiddenDatasets, setHiddenDatasets] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(true);

  // Check if payment is sufficient (>= 2025-11)
  const hasNovemberPayment = lastPaymentMonth && lastPaymentMonth >= "2025-11";

  // Detect theme changes
  React.useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const toggleDataset = (label: string) => {
    setHiddenDatasets(prev => 
        prev.includes(label)
            ? prev.filter(l => l !== l)
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
          const score = scores[subject];
          const numericScore = score === 'absent' ? 0 : score || 0;
          if (subject.toLowerCase() === 'english') {
            if (numericScore > 25) { totalForMock += (numericScore - 25); }
          } else {
            totalForMock += numericScore;
          }
        });
        calculatedTotals[mockName] = totalForMock;
      }
    });
    return calculatedTotals;
  }, [allMockData, allExamSettings]);

  const chartData = useMemo(() => {
    // Dynamically determine subjects based on allExamSettings
    const allSubjects = new Set<string>();
    
    // Collect all subjects from examSettings across all mocks
    if (allExamSettings) {
      Object.values(allExamSettings).forEach(mockSettings => {
        Object.keys(mockSettings).forEach(subject => {
          allSubjects.add(subject);
        });
      });
    }
    
    // Convert to array and sort based on DEFAULT_SUBJECT_ORDER
    const subjectOrder = Array.from(allSubjects).sort((a, b) => {
      const indexA = DEFAULT_SUBJECT_ORDER.indexOf(a);
      const indexB = DEFAULT_SUBJECT_ORDER.indexOf(b);
      
      // If both are in default order, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only a is in default order, it comes first
      if (indexA !== -1) return -1;
      // If only b is in default order, it comes first
      if (indexB !== -1) return 1;
      // Otherwise, sort alphabetically
      return a.localeCompare(b);
    });
    
    // If no subjects found, use empty array
    const SUBJECT_ORDER = subjectOrder.length > 0 ? subjectOrder : [];
    
    const labels = SUBJECT_ORDER.map(subject => {
        return SUBJECT_NAMES[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);
    });

    const datasets: any[] = [];

    Object.entries(allMockData).forEach(([mockKey, scores]) => {
        
        if (!scores || Object.keys(scores).length === 0) {
            return;
        }

        // Don't display results if isReadyToPublishedResult is explicitly false,
        // If mockReadiness is undefined/null or the specific mockKey is undefined, we show the data
        if (mockReadiness && mockReadiness.hasOwnProperty(mockKey) && mockReadiness[mockKey] === false && studentName !== "Test Testing") {
            return;
        }

        // Don't display results if payment is not sufficient (< 2025-11), unless student name is test
        if (!hasNovemberPayment) {
            return;
        }
        
        const mockLabel = `Mock ${mockKey.replace('mock', '')}`;
        const color = MOCK_COLORS[mockKey as keyof typeof MOCK_COLORS] || 'rgba(255, 255, 255, 1)';
        const settingsForMock = allExamSettings?.[mockKey];
        
        const data = SUBJECT_ORDER.map(subject => {
            const score = scores[subject];
            const numericScore = score === 'absent' ? 0 : score || 0;
            const maxScore = settingsForMock?.[subject]?.maxScore || 100;
            if (maxScore === 0) return 0;
            return (numericScore / maxScore) * 100;
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
  }, [allMockData, hiddenDatasets, studentClassType, allExamSettings, mockReadiness, studentName]);
  
  const chartOptions: any = useMemo(() => ({
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: isDark ? '#555' : '#d1d5db' },
        grid: { color: isDark ? '#555' : '#d1d5db' },
        pointLabels: { color: isDark ? '#ddd' : '#374151', font: { size: 12 } },
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
        backgroundColor: isDark ? '#2d3748' : '#ffffff',
        titleColor: isDark ? '#fff' : '#111827',
        bodyColor: isDark ? '#fff' : '#374151',
        borderColor: isDark ? '#4a5568' : '#d1d5db',
        borderWidth: 1,
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
  }), [isDark]);

  if (chartData.datasets.length === 0) {
    return (
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 h-96 flex justify-center items-center">
        <p className="text-gray-500 dark:text-slate-500">Not enough data to display chart</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 cursor-pointer"
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

export default PerformanceRadarChartPublic;
