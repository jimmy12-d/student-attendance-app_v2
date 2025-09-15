'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useLocale, useTranslations } from 'next-intl';
import { calculateAverageArrivalTime } from '@/app/dashboard/_lib/attendanceLogic';
import type { RawAttendanceRecord } from '@/app/dashboard/_lib/attendanceLogic';

interface StudentData {
  shift?: string;
  class?: string;
  fullName?: string;
}

interface HealthArrivalChartProps {
  recentRecords: RawAttendanceRecord[];
  studentData: StudentData | null;
  selectedDate: string;
  classConfigs: any;
  calculateMinutesFromStartTime: (arrivalTime: string, startTime: string) => number;
  getShiftInfo: (shift: string) => {
    startTime: string;
    name: string;
    icon: string;
  };
  className?: string;
}

const HealthArrivalChart: React.FC<HealthArrivalChartProps> = ({
  recentRecords,
  studentData,
  selectedDate,
  classConfigs,
  calculateMinutesFromStartTime,
  getShiftInfo,
  className = ""
}) => {
  const t = useTranslations('student.attendance');
  const locale = useLocale();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 320 });
  const [maxDaysToShow, setMaxDaysToShow] = useState(14); // Default for desktop
  const [initialScrollSet, setInitialScrollSet] = useState(false);

  // Calculate average arrival time using the correct logic
  const averageArrivalTime = React.useMemo(() => {
    if (!studentData || !recentRecords || recentRecords.length === 0) {
      return { averageTime: 'N/A', details: 'No data available' };
    }
    
    // Debug: Log the data structure
    console.log('HealthArrivalChart - recentRecords sample:', recentRecords[0]);
    console.log('HealthArrivalChart - studentData:', studentData);
    
    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Transform the data to match RawAttendanceRecord format if needed
    const transformedRecords = recentRecords.map(record => ({
      ...record,
      // Ensure we have the required fields for calculateAverageArrivalTime
      timeIn: record.timeIn || (record.timestamp ? 
        new Date(record.timestamp.seconds * 1000).toLocaleTimeString('en-US', { 
          hour12: false, hour: '2-digit', minute: '2-digit' 
        }) : undefined),
      startTime: record.startTime || getShiftInfo(studentData.shift || '').startTime
    }));
    
    console.log('HealthArrivalChart - transformedRecords sample:', transformedRecords[0]);
    
    return calculateAverageArrivalTime(
      studentData as any, // Cast to match the Student interface from attendanceLogic
      transformedRecords,
      currentMonth,
      classConfigs
    );
  }, [studentData, recentRecords, classConfigs, getShiftInfo]);

  // Khmer font utility
  const khmerFont = (additionalClasses: string = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

  // Colors and styling constants
  const colors = {
    present: '#22c55e', // green-500
    late: '#f97316', // orange-500
    onTime: '#3b82f6', // blue-500
    absent: '#ef4444', // red-500
    startLine: '#475569', // slate-600
    text: '#1e293b', // slate-800
    textLight: '#64748b', // slate-500
    background: 'rgba(241, 245, 249, 0.6)', // slate-100
    backgroundDark: 'rgba(30, 41, 59, 0.6)' // slate-800
  };

  // Chart configuration - reduced margins for bigger graph
  const margin = { top: 40, right: 20, bottom: 60, left: 20 };
  const innerWidth = chartDimensions.width - margin.left - margin.right;
  const innerHeight = chartDimensions.height - margin.top - margin.bottom;

  // Responsive max days calculation - updated for mobile to show 5 dates initially
  const getMaxDaysToShow = (width: number) => {
    if (width <= 480) return 5; // Small mobile phones - show 5 dates initially
    if (width <= 768) return 5; // Large mobile phones and small tablets - show 5 dates initially
    if (width <= 1024) return 7; // Small desktop/laptop - show 7 dates
    return 14; // Large desktop - show 14 dates
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxDays = getMaxDaysToShow(containerWidth);
        
        console.log('Container width:', containerWidth, 'Max days:', maxDays); // Debug log
        
        setMaxDaysToShow(maxDays);
        
        // Calculate width based on all current month records for scrolling
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthRecords = recentRecords.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });
        
        // Add extra space for the average label on the right with padding for scrolling
        const avgLabelSpace = 200; // Extra space for average label with padding
        const requiredWidth = (currentMonthRecords.length * 40) + avgLabelSpace; // 40px per record + space for label
        
        setChartDimensions({
          width: Math.max(requiredWidth, containerWidth),
          height: 300
        });
      }
    };

    // Initial call
    handleResize();
    
    // Add resize observer for better detection
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }
    
    // Fallback window resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [recentRecords.length]);

  useEffect(() => {
    if (!svgRef.current || !studentData?.shift || !recentRecords.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Filter current month records and add today's indicator
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const currentMonthRecords = recentRecords
      .filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending: oldest first (left), newest last (right)

    console.log('Total recentRecords:', recentRecords.length);
    console.log('Current month records:', currentMonthRecords.length);
    console.log('maxDaysToShow:', maxDaysToShow);

    if (currentMonthRecords.length === 0) return;

    const shiftStartTime = getShiftInfo(studentData.shift).startTime;

    // Create scales
    const xScale = d3.scaleBand()
      .domain(currentMonthRecords.map((_, i) => i.toString()))
      .range([margin.left, chartDimensions.width - margin.right])
      .padding(0.2); // Reduced padding for less space

    const yScale = d3.scaleLinear()
      .domain([-35, 35]) // Early (-30) to Late (30)
      .range([0, innerHeight]); // Standard: 0 is top, innerHeight is bottom

    // Create main group, translated to respect margins
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Add enhanced gradients and patterns
    const defs = svg.append('defs');
    
    // Glow filter for a sophisticated look
    const filter = defs.append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Late gradient - enhanced
    const lateGradient = defs.append('linearGradient')
      .attr('id', 'lateGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    lateGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.late).attr('stop-opacity', 0.8);
    lateGradient.append('stop').attr('offset', '100%').attr('stop-color', colors.late).attr('stop-opacity', 0.4);

    // Early gradient - enhanced
    const earlyGradient = defs.append('linearGradient')
      .attr('id', 'earlyGradient')
      .attr('x1', '0%').attr('y1', '100%')
      .attr('x2', '0%').attr('y2', '0%');
    earlyGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.present).attr('stop-opacity', 0.8);
    earlyGradient.append('stop').attr('offset', '100%').attr('stop-color', colors.present).attr('stop-opacity', 0.4);

    // On-time gradient - enhanced
    const onTimeGradient = defs.append('linearGradient')
      .attr('id', 'onTimeGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    onTimeGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.onTime).attr('stop-opacity', 0.9);
    onTimeGradient.append('stop').attr('offset', '100%').attr('stop-color', d3.color(colors.onTime)?.brighter(0.5).toString()).attr('stop-opacity', 0.7);

    // Absent gradient - enhanced diamond
    const absentGradient = defs.append('linearGradient')
      .attr('id', 'absentGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    absentGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.absent).attr('stop-opacity', 0.9);
    absentGradient.append('stop').attr('offset', '100%').attr('stop-color', d3.color(colors.absent)?.darker(0.5).toString()).attr('stop-opacity', 0.7);

    // Add enhanced start time line (center line)
    g.append('line')
      .attr('class', 'start-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', colors.startLine)
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);

    // Add start time label with background
    const startTimeLabel = g.append('g').attr('class', 'start-time-label');
    
    startTimeLabel.append('text')
      .attr('x', -10)
      .attr('y', yScale(0))
      .attr('fill', colors.textLight)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .text('On Time');

    // Add enhanced average line if available
    if (averageArrivalTime?.averageTime && averageArrivalTime.averageTime !== 'N/A') {
      let avgMinutesFromStart = 0;
      const avgTimeString = averageArrivalTime.averageTime;

      if (avgTimeString.includes('early')) {
        const timeValue = parseFloat(avgTimeString.replace(/[^0-9.-]+/g, ''));
        avgMinutesFromStart = -timeValue;
      } else if (avgTimeString.includes('late')) {
        const timeValue = parseFloat(avgTimeString.replace(/[^0-9.-]+/g, ''));
        avgMinutesFromStart = timeValue;
      }

      const clampedAvg = Math.max(-30, Math.min(30, avgMinutesFromStart));
      const avgLineY = yScale(clampedAvg);
      const isLate = clampedAvg > 0;

      const avgLine = g.append('g').attr('class', 'avg-line');

      // Enhanced average line with gradient
      const avgLineGradient = defs.append('linearGradient')
        .attr('id', 'avgLineGradient')
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
      avgLineGradient.append('stop').attr('offset', '0%').attr('stop-color', isLate ? colors.late : colors.present).attr('stop-opacity', 0.8);
      avgLineGradient.append('stop').attr('offset', '50%').attr('stop-color', isLate ? colors.late : colors.present).attr('stop-opacity', 0.4);
      avgLineGradient.append('stop').attr('offset', '100%').attr('stop-color', isLate ? colors.late : colors.present).attr('stop-opacity', 0.8);

      // Main average line
      avgLine.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', avgLineY)
        .attr('y2', avgLineY)
        .attr('stroke', 'url(#avgLineGradient)')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,4')
        .attr('opacity', 0)
        .transition()
        .duration(1000)
        .attr('opacity', 0.9);

      // Average line markers at ends
      avgLine.append('circle')
        .attr('cx', 0)
        .attr('cy', avgLineY)
        .attr('r', 4)
        .attr('fill', isLate ? colors.late : colors.present)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .transition()
        .delay(500)
        .duration(800)
        .attr('opacity', 1);

      avgLine.append('circle')
        .attr('cx', innerWidth)
        .attr('cy', avgLineY)
        .attr('r', 4)
        .attr('fill', isLate ? colors.late : colors.present)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .transition()
        .delay(500)
        .duration(800)
        .attr('opacity', 1);

      // Enhanced average label with background - moved to right side
      const labelGroup = avgLine.append('g').attr('class', 'avg-label');

      // Create a more prominent and readable average display
      const labelText = `📊 Average: ${avgTimeString}`;
      const labelWidth = labelText.length * 7 + 30; // Increased width for better readability
      const labelHeight = 32; // Increased height
      const labelX = innerWidth + 15; // Position closer to chart edge for easier scrolling
      const labelY = avgLineY - labelHeight/2 + 16; // Center vertically on the line

      // Enhanced background with better styling
      labelGroup.append('rect')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('width', labelWidth)
        .attr('height', labelHeight)
        .attr('fill', 'rgba(255, 255, 255, 0.98)')
        .attr('stroke', isLate ? colors.late : colors.present)
        .attr('stroke-width', 2.5)
        .attr('rx', 16)
        .attr('ry', 16)
        .style('filter', 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))')
        .attr('opacity', 0)
        .transition()
        .delay(800)
        .duration(600)
        .attr('opacity', 1);

      // Enhanced text with better typography
      labelGroup.append('text')
        .attr('x', labelX + labelWidth/2)
        .attr('y', labelY + labelHeight/2)
        .attr('fill', isLate ? colors.late : colors.present)
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .text(labelText)
        .attr('opacity', 0)
        .transition()
        .delay(1000)
        .duration(600)
        .attr('opacity', 1);

      // Add a connecting line from the average line to the label
      labelGroup.append('line')
        .attr('x1', innerWidth)
        .attr('y1', avgLineY)
        .attr('x2', labelX)
        .attr('y2', labelY + labelHeight/2)
        .attr('stroke', isLate ? colors.late : colors.present)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0)
        .transition()
        .delay(600)
        .duration(800)
        .attr('opacity', 0.7);

      // Add subtle glow effect to the average line
      avgLine.attr('filter', 'url(#glow)');
    }

    // Create enhanced tooltip
    const tooltip = d3.select('body').selectAll('.d3-attendance-tooltip')
      .data([0])
      .join('div')
      .attr('class', 'd3-attendance-tooltip')
      .style('position', 'absolute')
      .style('background', 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))')
      .style('color', 'white')
      .style('padding', '10px 14px')
      .style('border-radius', '10px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000')
      .style('box-shadow', '0 6px 24px rgba(0, 0, 0, 0.2)')
      .style('backdrop-filter', 'blur(10px)')
      .style('border', '1px solid rgba(255, 255, 255, 0.1)');

    // Add data bars/boxes with enhanced positioning
    const bars = g.selectAll('.attendance-bar')
      .data(currentMonthRecords)
      .enter()
      .append('g')
      .attr('class', 'attendance-bar');

    bars.each(function(record, i) {
      const g = d3.select(this);
      const x = xScale(i.toString())!;
      const barWidth = xScale.bandwidth();
      
      // Fix: Use timeIn from RawAttendanceRecord instead of timestamp
      const arrivalTime = record.timeIn || '';
      
      const minutesFromStart = arrivalTime ? calculateMinutesFromStartTime(arrivalTime, shiftStartTime) : 0;
      const clampedMinutes = Math.max(-30, Math.min(30, minutesFromStart));
      
      // Fix: Correct early/late logic
      const isEarly = clampedMinutes < 0;  // Negative = early (before start time)
      const isLate = clampedMinutes > 0;   // Positive = late (after start time)
      const isOnTime = Math.abs(clampedMinutes) <= 2;
      const isAbsent = record.status === 'absent';
      const isToday = record.date === todayString;
      
      const dayOfMonth = new Date(record.date).getDate();
      const displayTime = isAbsent ? 'ABS' : (arrivalTime ? arrivalTime.substring(0, 5) : 'N/A');
      
      // --- NEW SOPHISTICATED RENDER LOGIC ---
      let shape;

      if (isAbsent) {
        const centerX = x + barWidth / 2;
        const centerY = yScale(0);
        const size = barWidth / 8; // Control the size of the 'X'
        
        // Draw an 'X' mark
        shape = g.append('g')
          .attr('class', 'absent-x')
          .attr('transform', `translate(${centerX}, ${centerY})`);
          
        shape.append('line')
          .attr('x1', -size)
          .attr('y1', -size)
          .attr('x2', size)
          .attr('y2', size);
          
        shape.append('line')
          .attr('x1', -size)
          .attr('y1', size)
          .attr('x2', size)
          .attr('y2', -size);
          
        shape.selectAll('line')
          .attr('stroke', colors.absent)
          .attr('stroke-width', 2.5)
          .attr('stroke-linecap', 'round');

      } else if (isOnTime) {
        shape = g.append('rect')
          .attr('x', x)
          .attr('y', yScale(0) - 3)
          .attr('width', barWidth)
          .attr('height', 6)
          .attr('fill', 'url(#onTimeGradient)')
          .attr('stroke', colors.onTime)
          .attr('stroke-width', 1.5)
          .attr('rx', 3);

      } else { // Early or Late
        const isLate = clampedMinutes > 0;
        const yBase = yScale(0);
        const yValue = yScale(clampedMinutes);
        
        shape = g.append('rect')
          .attr('x', x)
          .attr('y', isLate ? yBase : yValue)
          .attr('width', barWidth)
          .attr('height', Math.abs(yValue - yBase))
          .attr('fill', isLate ? 'url(#lateGradient)' : 'url(#earlyGradient)')
          .attr('stroke', isLate ? colors.late : colors.present)
          .attr('stroke-width', 1.5)
          .attr('rx', 2);
      }

      // Common shape styles and animations
      shape
        .attr('opacity', 0)
        .attr('filter', 'url(#glow)')
        .style('cursor', 'pointer')
        .transition()
        .delay(i * 30)
        .duration(500)
        .attr('opacity', 0.8);

      // Add today's indicator - a subtle dot
      if (isToday) {
        g.append('circle')
          .attr('cx', x + barWidth / 2)
          .attr('y', innerHeight + 20)
          .attr('r', 3)
          .attr('fill', colors.onTime)
          .attr('filter', 'url(#glow)')
          .attr('opacity', 0)
          .transition()
          .delay(i * 30)
          .duration(500)
          .attr('opacity', 1);
      }
      
      // Add enhanced hover effects
      g.on('mouseenter', function(event) {
        // Enhance the visual feedback
        shape
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', isAbsent ? 3 : 2.5)
          .attr('transform', isAbsent ? `translate(${x + barWidth / 2}, ${yScale(0)}) scale(1.1)` : `translate(0, 0) scale(1.05)`);
        
        // Simplified Tooltip Content
        const statusText = isAbsent ? 'Absent' : 
                          isOnTime ? 'On Time' : 
                          isEarly ? `${Math.abs(clampedMinutes)} min early` : 
                          `${clampedMinutes} min late`;
        const tooltipContent = `
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #E5E7EB;">${new Date(record.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div>
            <div style="color: ${isAbsent ? '#FCA5A5' : isOnTime ? '#93C5FD' : isEarly ? '#86EFAC' : '#FCD34D'}; font-size: 11px;">${statusText}</div>
          </div>
        `;
        
        tooltip
          .style('opacity', 1)
          .html(tooltipContent)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
      })
      .on('mouseleave', function() {
        shape
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke-width', isAbsent ? 2.5 : 1.5)
          .attr('transform', isAbsent ? `translate(${x + barWidth / 2}, ${yScale(0)}) scale(1)` : 'translate(0, 0) scale(1)');
        
        tooltip.style('opacity', 0);
      });
      
      // Day label at the bottom
      g.append('text')
        .attr('x', x + barWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('fill', isToday ? colors.onTime : colors.textLight)
        .attr('font-size', '11px')
        .attr('font-weight', isToday ? 'bold' : '500')
        .style('pointer-events', 'none')
        .text(dayOfMonth)
        .attr('opacity', 0)
        .transition()
        .delay(i * 30 + 200)
        .duration(400)
        .attr('opacity', 1);

      // TimeIn label positioning based on arrival status
      if (!isAbsent) {
        let timeInY;
        let arrowSymbol;
        let arrowColor;

        if (isLate) {
          // Late: show under the box
          timeInY = Math.max(yScale(clampedMinutes) + 15, yScale(0) + 15);
          arrowSymbol = '▼';
          arrowColor = colors.late;
        } else if (isEarly) {
          // Early: show on the box
          timeInY = Math.min(yScale(clampedMinutes) - 5, yScale(0) - 5);
          arrowSymbol = '▲';
          arrowColor = colors.present;
        } else {
          // On-time: show on the box, no arrow
          timeInY = Math.min(yScale(clampedMinutes) - 5, yScale(0) - 5);
        }

        // Add minimal modern arrow indicator next to timeIn text (only for early/late)
        if (isLate || isEarly) {
          g.append('text')
            .attr('x', x + barWidth / 2 - 12)
            .attr('y', timeInY)
            .attr('text-anchor', 'middle')
            .attr('fill', arrowColor)
            .attr('font-size', '12px')
            .attr('font-weight', '400')
            .style('pointer-events', 'none')
            .style('opacity', '0.8')
            .text(arrowSymbol)
            .attr('opacity', 0)
            .transition()
            .delay(i * 30 + 150)
            .duration(400)
            .attr('opacity', 0.8);
        }

        g.append('text')
          .attr('x', x + barWidth / 2 + 6)
          .attr('y', timeInY)
          .attr('text-anchor', 'middle')
          .attr('fill', isOnTime ? colors.onTime : isEarly ? colors.present : colors.late)
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .style('pointer-events', 'none')
          .text(displayTime)
          .attr('opacity', 0)
          .transition()
          .delay(i * 30 + 200)
          .duration(400)
          .attr('opacity', 1);
      }
    });

    // Cleanup tooltip on component unmount
    return () => {
      d3.select('body').selectAll('.d3-attendance-tooltip').remove();
    };

  }, [recentRecords, studentData, chartDimensions, calculateMinutesFromStartTime, getShiftInfo, averageArrivalTime, locale, maxDaysToShow]);

  // Auto-scroll to rightmost position (latest dates) on initial load
  useEffect(() => {
    if (containerRef.current && !initialScrollSet && recentRecords.length > 0) {
      // Small delay to ensure chart is fully rendered
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = containerRef.current.scrollWidth;
          setInitialScrollSet(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [recentRecords.length, initialScrollSet]);

  const hasData = averageArrivalTime?.averageTime && 
                  averageArrivalTime.averageTime !== 'N/A' && 
                  recentRecords.length > 0;

  return (
    <div className={`w-full ${className}`}>
      {hasData ? (
        <div 
          ref={containerRef}
          className="overflow-x-auto scrollbar-hide" // Better mobile scrolling
          style={{ 
            scrollBehavior: 'smooth', 
            scrollbarWidth: 'none', // Hide scrollbar for Firefox
            msOverflowStyle: 'none', // Hide scrollbar for IE/Edge
            WebkitOverflowScrolling: 'touch', // Better iOS scrolling
            touchAction: 'pan-x', // Allow horizontal scrolling on touch
            paddingRight: '20px' // Add padding for better scrolling to average label
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none; // Hide scrollbar for Webkit browsers
            }
          `}</style>
          <style>
            {`
              .scrollbar-hide {
                -ms-overflow-style: none;  /* IE and Edge */
                scrollbar-width: none;  /* Firefox */
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none; /* Chrome, Safari and Opera */
              }
              /* Improve touch scrolling on mobile */
              @media (max-width: 768px) {
                .overflow-x-auto {
                  scroll-snap-type: x mandatory;
                  scroll-padding: 0 20px;
                }
                .attendance-bar {
                  scroll-snap-align: start;
                }
              }
            `}
          </style>
          <svg
            ref={svgRef}
            width={chartDimensions.width}
            height={chartDimensions.height}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center py-12">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-slate-400 dark:text-slate-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div className="text-center max-w-md">
            <p className={khmerFont('text-gray-700 dark:text-gray-300 font-semibold text-lg mb-1')}>
              {t('journeyBegins')}
            </p>
            <p className={khmerFont('text-gray-500 dark:text-gray-400 text-sm leading-relaxed')}>
              {t('attendToUnlock')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthArrivalChart;