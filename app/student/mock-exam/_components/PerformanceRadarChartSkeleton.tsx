import React from 'react';

const PerformanceRadarChartSkeleton = () => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse">
            <div className="relative h-80 flex items-center justify-center">
                {/* Mimic radar chart shape */}
                <div className="w-64 h-64 bg-slate-800 rounded-full"></div>
                <div className="absolute w-48 h-48 bg-slate-700 rounded-full"></div>
                <div className="absolute w-32 h-32 bg-slate-800 rounded-full"></div>
            </div>
            {/* Mimic legend */}
            <div className="flex justify-center items-start gap-x-8 mt-4">
                <div className="flex flex-col items-center space-y-2">
                    <div className="h-4 w-20 bg-slate-700 rounded"></div>
                    <div className="h-6 w-12 bg-slate-700 rounded"></div>
                </div>
                <div className="flex flex-col items-center space-y-2">
                    <div className="h-4 w-20 bg-slate-700 rounded"></div>
                    <div className="h-6 w-12 bg-slate-700 rounded"></div>
                </div>
                <div className="flex flex-col items-center space-y-2">
                    <div className="h-4 w-20 bg-slate-700 rounded"></div>
                    <div className="h-6 w-12 bg-slate-700 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceRadarChartSkeleton; 