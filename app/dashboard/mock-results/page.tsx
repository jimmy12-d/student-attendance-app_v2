"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React from 'react';
import { mdiChartLine } from '@mdi/js';
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import { MockExamScoresTable } from './components';

const MockResultsPage = () => {
  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiChartLine} title="Mock Exam Results" main>
      </SectionTitleLineWithButton>

      {/* Mock Exam Scores Table - reads from form_responses collection */}
      <MockExamScoresTable formId="q57n4s6X6pMAX6yHRoQ0" />
    </SectionMain>
  );
};

export default MockResultsPage;
