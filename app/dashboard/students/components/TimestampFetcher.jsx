import React, { useState } from 'react';

const TimestampFetcher = ({ onDataFetched, onError }) => {
  const [timestampInput, setTimestampInput] = useState('');
  const [isFetchingSheetData, setIsFetchingSheetData] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  // A more reliable function to format timestamps for dd/MM/yyyy format
  const formatTimestamp = (input) => {
    const parts = input.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!parts) {
      return null; 
    }
    
    const [, day, month, year, hours, minutes, seconds] = parts;
    const date = new Date(year, month - 1, day, hours, minutes, seconds);

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const handleFetchData = async () => {
    if (!timestampInput) {
      setSheetError('Please enter a timestamp.');
      return;
    }
    setIsFetchingSheetData(true);
    setSheetError(null);

    try {
      const standardizedTimestamp = formatTimestamp(timestampInput.trim());

      if (!standardizedTimestamp) {
        setSheetError('Invalid timestamp format. Please use dd/MM/yyyy HH:mm:ss.');
        setIsFetchingSheetData(false);
        return;
      }

      const response = await fetch(`/api/student-registration?timestamp=${encodeURIComponent(standardizedTimestamp)}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        const errorMessage = data.error || `Failed to fetch data. Status: ${response.status}`;
        setSheetError(errorMessage);
        onError?.(errorMessage);
      } else {
        onDataFetched(data);
        setSheetError(null);
      }

    } catch (err) {
      console.error("Error fetching sheet data:", err);
      const errorMessage = err.message || 'An unexpected error occurred.';
      setSheetError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsFetchingSheetData(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
      <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Fetch from Registration Sheet
      </label>
      <div className="mt-1 flex items-stretch">
        <input
          type="text"
          id="timestamp"
          name="timestamp"
          value={timestampInput}
          onChange={(e) => setTimestampInput(e.target.value)}
          placeholder="Paste Timestamp here..."
          className="flex-grow block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white dark:bg-gray-700"
        />
        <button
          type="button"
          onClick={handleFetchData}
          disabled={isFetchingSheetData || !timestampInput}
          className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-r-md text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-wait"
        >
          {isFetchingSheetData ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Fetching...
            </>
          ) : (
            'Fetch Data'
          )}
        </button>
      </div>
      {sheetError && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{sheetError}</p>}
    </div>
  );
};

export default TimestampFetcher;
