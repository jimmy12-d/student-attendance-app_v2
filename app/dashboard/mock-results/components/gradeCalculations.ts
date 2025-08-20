/**
 * Grade Calculation Utilities
 * Reusable functions for calculating grades, total scores, and student statistics
 */

// Grade calculation utility
export const calculateGrade = (score: number, maxScore: number): string => {
  if (maxScore === 0) return 'N/A';
  const percentage = score / maxScore;
  if (percentage >= 0.9) return 'A';
  if (percentage >= 0.8) return 'B';
  if (percentage >= 0.7) return 'C';
  if (percentage >= 0.6) return 'D';
  if (percentage >= 0.5) return 'E';
  return 'F';
};

// Calculate student total scores with English bonus logic
export const calculateStudentTotals = (
  mockData: { [subject: string]: number }, 
  studentClass: string, 
  maxScoresConfig: { [subject: string]: number }
) => {
  let totalScore = 0;
  let totalMaxScore = 0;

  // Use the actual subjects that exist in the mockData for this student
  Object.keys(mockData).forEach(subject => {
    const score = mockData[subject];
    const maxScore = maxScoresConfig[subject] || 0;
    
    // Only process if the score exists and is a valid number
    if (score !== undefined && score !== null && !isNaN(score)) {
      if (subject === 'english') {
        // English is bonus subject - only add if score > 25
        if (score > 25) {
          totalScore += (score - 25); // Add only the bonus amount
        }
        // Don't add English to totalMaxScore as it's bonus only
      } else {
        // Regular subjects - add both score and max score only if they exist in this mock
        totalScore += score;
        totalMaxScore += maxScore;
      }
    }
  });
  
  const totalGrade = totalMaxScore > 0 ? calculateGrade(totalScore, totalMaxScore) : 'N/A';
  const totalPercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
  
  return { totalScore, totalMaxScore, totalGrade, totalPercentage };
};

// Get max scores based on class type and exam settings
export const getMaxScores = (
  classType: string, 
  mockName: string, 
  allExamSettings: { [mockName: string]: { [subject: string]: { maxScore: number } } }
) => {
  // Determine student class type from class name
  let studentClassType = 'Grade 12 Science'; // default
  if (classType) {
    if (classType.startsWith('Class 7')) {
      studentClassType = "Grade 7";
    } else if (classType.startsWith('Class 8')) {
      studentClassType = "Grade 8";
    } else if (classType.startsWith('Class 9')) {
      studentClassType = "Grade 9";
    } else if (classType.startsWith('Class 10')) {
      studentClassType = "Grade 10";
    } else if (classType === 'Class 11A') {
      studentClassType = "Grade 11A";
    } else if (['Class 11E', 'Class 11F', 'Class 11G'].includes(classType)) {
      studentClassType = "Grade 11E";
    } else if (['Class 12R', 'Class 12S', 'Class 12T'].includes(classType)) {
      studentClassType = "Grade 12 Social";
    } else if (classType.startsWith('Class 12')) {
      studentClassType = "Grade 12";
    }
  }

  // Convert mock name format (mock_1 -> mock1)
  const mockKey = mockName.replace('mock_', 'mock');
  const settingsKey = `${mockKey}_${studentClassType.replace(/\s+/g, '_')}`;
  
  // Get exam settings for this specific mock and class type
  const examSettings = allExamSettings[settingsKey];
  if (examSettings) {
    const maxScores: { [subject: string]: number } = {};
    Object.keys(examSettings).forEach(subject => {
      maxScores[subject] = examSettings[subject].maxScore;
    });
    return maxScores;
  }

  // Fallback to default scores if no exam settings found
  if (classType.includes('12S') || classType.includes('12R') || classType.includes('12T')) {
    // Grade 12 Social
    return {
      math: 125, // Math field contains Khmer score, max 125
      khmer: 75, // Khmer field contains Math score, max 75
      chemistry: 75, // History
      physics: 75, // Moral
      biology: 75, // Geography
      history: 75, // Earth
      english: 50
    };
  } else {
    // Grade 12 Science  
    return {
      math: 75, // Math field contains Khmer score, max 75
      khmer: 125, // Khmer field contains Math score, max 125
      chemistry: 75,
      physics: 75,
      biology: 75,
      english: 50
    };
  }
};

// Calculate class statistics
export const calculateClassStats = (
  students: any[],
  selectedMock: string,
  getMaxScoresFunc: (classType: string, mockName: string) => { [subject: string]: number }
) => {
  const studentTotals = students
    .map(student => {
      const mockData = student.mockResults[selectedMock] || {};
      const hasResults = Object.keys(mockData).length > 0;
      if (!hasResults) return null;
      
      const maxScores = getMaxScoresFunc(student.class, selectedMock);
      return calculateStudentTotals(mockData, student.class, maxScores);
    })
    .filter((totals): totals is NonNullable<typeof totals> => totals !== null);

  if (studentTotals.length > 0) {
    const totalScores = studentTotals.map(t => t.totalScore);
    const totalPercentages = studentTotals.map(t => t.totalPercentage);
    
    const total = totalScores.reduce((sum, score) => sum + score, 0);
    const average = total / totalScores.length;
    const highest = Math.max(...totalScores);
    const lowest = Math.min(...totalScores);
    const passRate = (totalPercentages.filter(percentage => percentage >= 50).length / totalPercentages.length) * 100;

    return {
      totalStudents: students.length,
      averageScore: average,
      highestScore: highest,
      lowestScore: lowest,
      passRate
    };
  }

  return {
    totalStudents: students.length,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0
  };
};
