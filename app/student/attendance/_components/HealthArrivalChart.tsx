'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useLocale, useTranslations } from 'next-intl';
import { calculateAverageArrivalTime, isSchoolDay } from '@/app/dashboard/_lib/attendanceLogic';
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
  
  // Drag scrolling state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate average arrival time using the correct logic
  const { averageTime, averageDifference } = React.useMemo(() => {
    if (!studentData || !recentRecords || recentRecords.length === 0) {
      return { averageTime: t('chart.notAvailable'), details: t('chart.noData'), averageDifference: null };
    }
    
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
      startTime: record.startTime // Only use startTime if it exists in the record
    })).filter(record => record.startTime); // Filter out records without startTime
    
    return calculateAverageArrivalTime(
      studentData as any, // Cast to match the Student interface from attendanceLogic
      transformedRecords,
      currentMonth
    );
  }, [studentData, recentRecords, classConfigs]);

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
    pending: '#6b7280', // gray-500
    permission: '#8b5cf6', // purple-500
    startLine: '#475569', // slate-600
    text: '#1e293b', // slate-800
    textLight: '#64748b', // slate-500
    background: 'rgba(241, 245, 249, 0.6)', // slate-100
    backgroundDark: 'rgba(30, 41, 59, 0.6)' // slate-800
  };

  // Chart configuration - reduced margins for bigger graph
  const margin = { top: 20, right: 120, bottom: 60, left: 20 };
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
                
        setMaxDaysToShow(maxDays);
        
        // Calculate width based on all current month school day records for scrolling
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const currentMonthSchoolDayRecords = recentRecords.filter(record => {
          const recordDate = new Date(record.date);
          const isCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
          
          if (isCurrentMonth) {
            // Get student's class config for study days
            const classId = studentData?.class?.replace(/^Class\s+/i, '') || '';
            const classConfig = classConfigs[classId];
            const studyDays = classConfig?.studyDays;
            
            return isSchoolDay(recordDate, studyDays);
          }
          
          return false;
        });
        
        // Add extra space for the average label on the right with padding for scrolling
        const avgLabelSpace = 450; // Increased space for average label
        const requiredWidth = (currentMonthSchoolDayRecords.length * 40) + avgLabelSpace; // 40px per record + space for label
        
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
  }, [recentRecords.length, studentData, classConfigs]);

  // Mouse drag scrolling functionality for desktop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only enable drag scrolling on desktop (screen width > 768px)
      if (window.innerWidth <= 768) return;
      
      setIsDragging(true);
      setStartX(e.pageX - container.offsetLeft);
      setScrollLeft(container.scrollLeft);
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      container.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (container) {
        container.style.cursor = 'grab';
        container.style.userSelect = 'auto';
      }
    };

    const handleMouseLeave = () => {
      if (isDragging) {
        setIsDragging(false);
        container.style.cursor = 'grab';
        container.style.userSelect = 'auto';
      }
    };

    // Add event listeners
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Set initial cursor style for desktop
    if (window.innerWidth > 768) {
      container.style.cursor = 'grab';
    }

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDragging, startX, scrollLeft]);

  useEffect(() => {
    if (!svgRef.current || !studentData?.shift || !recentRecords.length) {
      console.log('Chart render skipped:', {
        hasSvgRef: !!svgRef.current,
        hasStudentData: !!studentData,
        hasShift: !!studentData?.shift,
        recordsLength: recentRecords.length
      });
      return;
    }

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
        const isCurrentMonth = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        
        // Only include dates that are school days
        if (isCurrentMonth) {
          // Get student's class config for study days
          const classId = studentData?.class?.replace(/^Class\s+/i, '') || '';
          const classConfig = classConfigs[classId];
          const studyDays = classConfig?.studyDays;
          
          return isSchoolDay(recordDate, studyDays);
        }
        
        return false;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending: oldest first (left), newest last (right)

    if (currentMonthRecords.length === 0) {
      console.log('No current month records found, chart will be empty');
      return;
    }

    const shiftStartTime = getShiftInfo(studentData.shift).startTime;

    // Create scales
    const avgLabelWidth = 35; // Reserve 30px for the average label
    const xScale = d3.scaleBand()
      .domain(currentMonthRecords.map((_, i) => i.toString()))
      .range([0, innerWidth - avgLabelWidth]) // Leave space on the right for the label
      .padding(0.2);

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

    // Pending gradient - gray
    const pendingGradient = defs.append('linearGradient')
      .attr('id', 'pendingGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    pendingGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.pending).attr('stop-opacity', 0.8);
    pendingGradient.append('stop').attr('offset', '100%').attr('stop-color', colors.pending).attr('stop-opacity', 0.4);

    // Permission gradient - purple
    const permissionGradient = defs.append('linearGradient')
      .attr('id', 'permissionGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    permissionGradient.append('stop').attr('offset', '0%').attr('stop-color', colors.permission).attr('stop-opacity', 0.7);
    permissionGradient.append('stop').attr('offset', '100%').attr('stop-color', d3.color(colors.permission)?.darker(0.5).toString()).attr('stop-opacity', 0.3);


    // Add enhanced start time line (center line)
    g.append('line')
      .attr('class', 'start-line')
      .attr('x1', 0)
      .attr('x2', innerWidth - avgLabelWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', colors.startLine)
      .attr('stroke-width', 2)
      .attr('opacity', 0.8);

    // Draw average arrival time line if available
    if (averageDifference !== null) {
      // Cap the visual representation at 30 minutes but keep actual value for tooltip
      const cappedDifference = Math.max(-30, Math.min(30, averageDifference));
      const avgY = yScale(cappedDifference);
      const isLate = averageDifference > 0;

      const avgLine = g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth - avgLabelWidth + 15) // Reduced extension to connect cleanly to badge
        .attr('y1', avgY)
        .attr('y2', avgY)
        .attr('stroke', isLate ? colors.late : colors.present)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,4') // Dashed line for average
        .style('cursor', 'pointer');

      // Add a creative label for the average line
      const avgLabelGroup = g.append('g')
        .attr('transform', `translate(${innerWidth - avgLabelWidth + 15}, ${avgY})`) // Position inside the reserved space
        .style('cursor', 'pointer');

      // Add hover and click effects for average line and badge
      const showAvgTooltip = function(event?: any) {
        // Format the average time to replace 'm' with ' min' for better readability
        const formattedAverageTime = averageTime.replace(/(\d+)m/g, '$1 min');
        
        const avgTooltipContent = `
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #E5E7EB;">${t('shiftInfo.avgArrival')}</div>
            <div style="color: ${isLate ? '#FCD34D' : '#86EFAC'}; font-size: 11px;">${formattedAverageTime}</div>

          </div>
        `;
        
        // Position tooltip below the average badge
        const svgRect = svgRef.current!.getBoundingClientRect();
        const tooltipX = svgRect.left + (innerWidth - avgLabelWidth + 30); // Position below the badge
        const tooltipY = svgRect.top + avgY + 40;
        
        tooltip
          .style('opacity', 1)
          .html(avgTooltipContent)
          .style('left', tooltipX + 'px')
          .style('top', tooltipY + 'px');
      };

      const hideAvgTooltip = function() {
        tooltip.style('opacity', 0);
      };

      // Add hover effects to average line
      avgLine
        .on('mouseenter', function() {
          avgLine
            .transition()
            .duration(200)
            .attr('stroke-width', 3);
          showAvgTooltip();
        })
        .on('mouseleave', function() {
          avgLine
            .transition()
            .duration(200)
            .attr('stroke-width', 2);
          hideAvgTooltip();
        })
        .on('click', function(event) {
          showAvgTooltip(event);
          // Auto-hide after 3 seconds
          setTimeout(hideAvgTooltip, 3000);
        });

      // Add hover effects to average badge
      avgLabelGroup
        .on('mouseenter', function() {
          avgLabelGroup
            .transition()
            .duration(200)
            .attr('transform', `translate(${innerWidth - avgLabelWidth + 15}, ${avgY}) scale(1.05)`);
          showAvgTooltip();
        })
        .on('mouseleave', function() {
          avgLabelGroup
            .transition()
            .duration(200)
            .attr('transform', `translate(${innerWidth - avgLabelWidth + 15}, ${avgY}) scale(1)`);
          hideAvgTooltip();
        })
        .on('click', function(event) {
          showAvgTooltip(event);
          // Auto-hide after 3 seconds
          setTimeout(hideAvgTooltip, 3000);
        });

      // Label background with gradient
      const labelText = `Avg: ${averageTime}`;
      const labelWidth = labelText.length * 6.5 + 40; // Increased padding for better visibility
      
      const avgGradientId = `avg-gradient-${isLate ? 'late' : 'early'}`;
      
      const avgGradient = defs.append('linearGradient')
        .attr('id', avgGradientId)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
      
      avgGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', isLate ? d3.color(colors.late)?.brighter(1.5).toString() : d3.color(colors.present)?.brighter(1.5).toString())
        .attr('stop-opacity', 0.3);
      avgGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', isLate ? colors.late : colors.present)
        .attr('stop-opacity', 0.1);

      avgLabelGroup.append('rect')
        .attr('x', 0)
        .attr('y', -16)
        .attr('width', labelWidth)
        .attr('height', 32)
        .attr('rx', 16)
        .attr('ry', 16)
        .attr('fill', `url(#${avgGradientId})`)
        .attr('stroke', isLate ? colors.late : colors.present)
        .attr('stroke-width', 1);
        
      // Icon
      const iconPath = isLate 
        ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" // Clock outline
        : "M7 2v11h3v9l7-12h-4l4-8z"; // Lightning bolt
      
      avgLabelGroup.append('path')
        .attr('d', iconPath)
        .attr('stroke', isLate ? colors.late : colors.present)
        .attr('stroke-width', isLate ? '0' : '1.5') // No stroke for filled clock, stroke for lightning
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('fill', isLate ? colors.late : 'none') // Fill clock, no fill for lightning
        .attr('transform', `translate(10, -8) scale(0.7)`);

      // Label text
      avgLabelGroup.append('text')
        .attr('x', 30)
        .attr('y', 0) // Centered vertically
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'middle') // Ensure vertical centering
        .attr('fill', isLate ? colors.late : colors.present)
        .style('font-size', '13px')
        .style('font-weight', '600')
        .style('font-family', locale === 'kh' ? 'var(--font-khmer), sans-serif' : 'inherit')
        .text(labelText);
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
      .style('font-family', locale === 'kh' ? 'var(--font-khmer), sans-serif' : 'inherit')
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
      const isPermission = record.status === 'permission';
      const isPending = record.status === 'pending' || record.status === 'requested';
      const isToday = record.date === todayString;
      
      const dayOfMonth = new Date(record.date).getDate();
      const displayTime = isPending ? t('pending').toUpperCase().substring(0, 6) :
                         isPermission ? t('permission').toUpperCase().substring(0, 4) :
                         isAbsent ? t('absent').toUpperCase().substring(0, 3) : 
                         (arrivalTime ? arrivalTime.substring(0, 5) : t('chart.notAvailable'));
      
      // --- NEW SOPHISTICATED RENDER LOGIC ---
      const movableGroup = g.append('g').attr('class', 'movable-group');
      let shape;

      if (isPending || isPermission) {
        // Pending or Permission status - gray circle for pending, purple for permission
        shape = movableGroup.append('circle')
          .attr('cx', x + barWidth / 2)
          .attr('cy', yScale(0))
          .attr('r', barWidth / 4)
          .attr('fill', `url(#${isPermission ? 'permissionGradient' : 'pendingGradient'})`)
          .attr('stroke', isPermission ? colors.permission : colors.pending)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,2'); // Dashed border for pending/permission

      } else if (isAbsent) {
        const centerX = x + barWidth / 2;
        const centerY = yScale(0);
        const size = barWidth / 8; // Control the size of the 'X'
        
        // Draw an 'X' mark
        shape = movableGroup.append('g')
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
        shape = movableGroup.append('rect')
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
        
        shape = movableGroup.append('rect')
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

      // Add click event to the shape (bar) to show tooltip
      shape.on('click', function(event) {
        // Show tooltip for this bar
        const statusText = isPending ? t('pending') :
                          isPermission ? t('permission') :
                          isAbsent ? t('absent') : 
                          isOnTime ? t('shiftInfo.onTime') : 
                          isEarly ? `${Math.abs(clampedMinutes)} min ${t('shiftInfo.early').toLowerCase()}` : 
                          `${clampedMinutes} min ${t('shiftInfo.late').toLowerCase()}`;
        const tooltipContent = `
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #E5E7EB;">${new Date(record.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div>
            <div style="color: ${isPending ? '#9CA3AF' : isPermission ? '#A78BFA' : isAbsent ? '#FCA5A5' : isOnTime ? '#93C5FD' : isEarly ? '#86EFAC' : '#FCD34D'}; font-size: 11px;">${statusText}</div>
          </div>
        `;
        
        // Position tooltip next to the bar
        const barCenterX = x + barWidth / 2;
        const barCenterY = yScale(0);
        const svgRect = svgRef.current!.getBoundingClientRect();
        const tooltipX = svgRect.left + barCenterX + 15;
        const tooltipY = svgRect.top + barCenterY - 15;
        
        tooltip
          .style('opacity', 1)
          .html(tooltipContent)
          .style('left', tooltipX + 'px')
          .style('top', tooltipY + 'px');
        
        // Subtle highlight for the bar
        movableGroup
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.02)')
          .style('filter', 'brightness(1.1)');
          
        // Auto-hide tooltip after 3 seconds
        setTimeout(() => {
          tooltip.style('opacity', 0);
          movableGroup
            .transition()
            .duration(200)
            .attr('transform', 'scale(1)')
            .style('filter', 'brightness(1)');
        }, 3000);
      });

      // Add today's indicator - circle background for the date
      if (isToday) {
        // Circle background for today's date
        g.append('circle')
          .attr('cx', x + barWidth / 2)
          .attr('cy', innerHeight + 40)
          .attr('r', 14)
          .attr('fill', colors.onTime)
          .attr('fill-opacity', 0.15)
          .attr('stroke', colors.onTime)
          .attr('stroke-width', 2)
          .attr('opacity', 0)
          .transition()
          .delay(i * 30)
          .duration(500)
          .attr('opacity', 1);
      }
      
      // Add hover effects to the shape (bar) only
      shape.on('mouseenter', function(event) {
        // Enhance the visual feedback
        movableGroup
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.05)');
        
        shape
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('stroke-width', isAbsent ? 3 : 2.5);
        
        // Show tooltip next to the bar
        const statusText = isPending ? t('pending') :
                          isPermission ? t('permission') :
                          isAbsent ? t('absent') : 
                          isOnTime ? t('shiftInfo.onTime') : 
                          isEarly ? `${Math.abs(clampedMinutes)} min ${t('shiftInfo.early').toLowerCase()}` : 
                          `${clampedMinutes} min ${t('shiftInfo.late').toLowerCase()}`;
        const tooltipContent = `
          <div style="text-align: center;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #E5E7EB;">${new Date(record.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div>
            <div style="color: ${isPending ? '#9CA3AF' : isPermission ? '#A78BFA' : isAbsent ? '#FCA5A5' : isOnTime ? '#93C5FD' : isEarly ? '#86EFAC' : '#FCD34D'}; font-size: 11px;">${statusText}</div>
          </div>
        `;
        
        // Position tooltip next to the bar
        const barCenterX = x + barWidth / 2;
        const barCenterY = yScale(0);
        const svgRect = svgRef.current!.getBoundingClientRect();
        const tooltipX = svgRect.left + barCenterX + 15;
        const tooltipY = svgRect.top + barCenterY - 15;
        
        tooltip
          .style('opacity', 1)
          .html(tooltipContent)
          .style('left', tooltipX + 'px')
          .style('top', tooltipY + 'px');
      })
      .on('mouseleave', function() {
        movableGroup
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)');

        shape
          .transition()
          .duration(200)
          .attr('opacity', 0.8)
          .attr('stroke-width', isAbsent ? 2.5 : 1.5);
        
        tooltip.style('opacity', 0);
      });
      
      // Day label at the bottom
      const dayLabel = g.append('text')
        .attr('x', x + barWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', isToday ? 'white' : colors.textLight)
        .attr('font-size', '11px')
        .attr('font-weight', isToday ? 'bold' : '500')
        .style('font-family', locale === 'kh' ? 'var(--font-khmer), sans-serif' : 'inherit')
        .style('pointer-events', 'none')
        .text(dayOfMonth)
        .attr('opacity', 0);
      
      // Animate the label
      dayLabel.transition()
        .delay(i * 30 + 200)
        .duration(400)
        .attr('opacity', 1);
      
      // Ensure today's text appears above the circle
      if (isToday) {
        dayLabel.raise();
      }

      // Add clickable area for date labels
      const dateClickArea = g.append('rect')
        .attr('x', x)
        .attr('y', innerHeight + 25)
        .attr('width', barWidth)
        .attr('height', 30)
        .attr('fill', 'transparent')
        .attr('cursor', 'pointer')
        .attr('opacity', 0)
        .on('mouseenter', function() {
          // Highlight the date label on hover
          dayLabel
            .transition()
            .duration(150)
            .style('font-weight', '600')
            .attr('fill', isToday ? '#ffffff' : colors.onTime);
        })
        .on('mouseleave', function() {
          // Reset the date label
          dayLabel
            .transition()
            .duration(150)
            .style('font-weight', isToday ? 'bold' : '500')
            .attr('fill', isToday ? 'white' : colors.textLight);
        })
        .on('click', function(event) {
          // Show tooltip for this date
          const statusText = isPending ? t('pending') :
                            isPermission ? t('permission') :
                            isAbsent ? t('absent') : 
                            isOnTime ? t('shiftInfo.onTime') : 
                            isEarly ? `${Math.abs(clampedMinutes)} min ${t('shiftInfo.early').toLowerCase()}` : 
                            `${clampedMinutes} min ${t('shiftInfo.late').toLowerCase()}`;
          const tooltipContent = `
            <div style="text-align: center;">
              <div style="font-weight: bold; margin-bottom: 4px; color: #E5E7EB;">${new Date(record.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</div>
              <div style="color: ${isPending ? '#9CA3AF' : isPermission ? '#A78BFA' : isAbsent ? '#FCA5A5' : isOnTime ? '#93C5FD' : isEarly ? '#86EFAC' : '#FCD34D'}; font-size: 11px;">${statusText}</div>
            </div>
          `;
          
          // Position tooltip next to the bar
          const barCenterX = x + barWidth / 2;
          const barCenterY = yScale(0);
          const svgRect = svgRef.current!.getBoundingClientRect();
          const tooltipX = svgRect.left + barCenterX + 15;
          const tooltipY = svgRect.top + barCenterY - 15;
          
          tooltip
            .style('opacity', 1)
            .html(tooltipContent)
            .style('left', tooltipX + 'px')
            .style('top', tooltipY + 'px');
          
          // Subtle highlight for the corresponding attendance bar
          movableGroup
            .transition()
            .duration(200)
            .attr('transform', 'scale(1.02)')
            .style('filter', 'brightness(1.1)');
            
          // Auto-hide tooltip after 3 seconds
          setTimeout(() => {
            tooltip.style('opacity', 0);
            movableGroup
              .transition()
              .duration(200)
              .attr('transform', 'scale(1)')
              .style('filter', 'brightness(1)');
          }, 3000);
        });

      // TimeIn label positioning based on arrival status
      if (!isAbsent && !isPending && !isPermission) {
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
          movableGroup.append('text')
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

        movableGroup.append('text')
          .attr('x', x + barWidth / 2 + 6)
          .attr('y', timeInY)
          .attr('text-anchor', 'middle')
          .attr('fill', isOnTime ? colors.onTime : isEarly ? colors.present : colors.late)
          .attr('font-size', '10px')
          .attr('font-weight', '500')
          .style('font-family', locale === 'kh' ? 'var(--font-khmer), sans-serif' : 'inherit')
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

  }, [recentRecords, studentData, chartDimensions, calculateMinutesFromStartTime, getShiftInfo, averageTime, averageDifference, locale, maxDaysToShow, classConfigs]);

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

  const hasData = averageTime && 
                  averageTime !== t('chart.notAvailable') && 
                  recentRecords.length > 0 &&
                  studentData?.shift &&
                  classConfigs;

  return (
    <div className={`w-full ${className}`}>
      {hasData ? (
        <div 
          ref={containerRef}
          className="overflow-x-auto scrollbar-hide chart-container" // Better mobile scrolling
          style={{ 
            scrollBehavior: 'smooth', 
            scrollbarWidth: 'none', // Hide scrollbar for Firefox
            msOverflowStyle: 'none', // Hide scrollbar for IE/Edge
            WebkitOverflowScrolling: 'touch', // Better iOS scrolling
            touchAction: 'pan-x pan-y', // Allow horizontal and vertical scrolling on touch
            paddingRight: '20' // Add padding for better scrolling to average label
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none; // Hide scrollbar for Webkit browsers
            }
          `}</style>
          <style>
            {`
              /* Show scrollbars on desktop/laptop, hide on mobile */
              @media (min-width: 769px) {
                .scrollbar-hide {
                  -ms-overflow-style: auto;  /* IE and Edge */
                  scrollbar-width: auto;  /* Firefox */
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: block; /* Chrome, Safari and Opera */
                  height: 8px;
                }
                .scrollbar-hide::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.1);
                  border-radius: 4px;
                }
                .scrollbar-hide::-webkit-scrollbar-thumb {
                  background: rgba(0, 0, 0, 0.3);
                  border-radius: 4px;
                }
                .scrollbar-hide::-webkit-scrollbar-thumb:hover {
                  background: rgba(0, 0, 0, 0.5);
                }
              }
              
              /* Hide scrollbars on mobile */
              @media (max-width: 768px) {
                .scrollbar-hide {
                  -ms-overflow-style: none;  /* IE and Edge */
                  scrollbar-width: none;  /* Firefox */
                }
                .scrollbar-hide::-webkit-scrollbar {
                  display: none; /* Chrome, Safari and Opera */
                }
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
              
              /* Drag cursor for desktop */
              @media (min-width: 769px) {
                .chart-container {
                  cursor: grab;
                }
                .chart-container:active {
                  cursor: grabbing;
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
      ) : !studentData || !classConfigs ? (
        // Loading state when data dependencies are missing
        <div className="flex flex-col items-center py-12">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 dark:border-slate-500"></div>
            </div>
          </div>
          <div className="text-center max-w-md">
            <p className={khmerFont('text-gray-700 dark:text-gray-300 font-semibold text-lg mb-1')}>
              {t('chart.loadingData')}
            </p>
            <p className={khmerFont('text-gray-500 dark:text-gray-400 text-sm leading-relaxed')}>
              {t('chart.loadingDescription')}
            </p>
          </div>
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