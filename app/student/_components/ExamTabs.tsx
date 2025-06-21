"use client";

import React from 'react';

type Props = {
  tabs: string[];
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
};

const ExamTabs = ({ tabs, selectedTab, setSelectedTab }: Props) => {
  return (
    <div className="mb-6 border-b-2 border-slate-700">
      <nav className="-mb-0.5 flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`py-4 px-1 inline-flex items-center gap-2 text-sm font-medium transition-all
              ${
                selectedTab === tab
                  ? 'border-b-2 border-purple-500 text-purple-400'
                  : 'border-b-2 border-transparent text-gray-400 hover:text-purple-400'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ExamTabs; 