import React from 'react';
import { format, subDays, addDays, getDay } from 'date-fns';

export default function Heatmap({ data, days = 365 }) {
  const today = new Date();
  const startDate = subDays(today, days - 1);
  
  const allDays = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(startDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    
    // The bug: Some third-party music apps (like Manet) track media length rather than listen time, 
    // or keep a session paused indefinitely. Capping it at 24 hours prevents charts from breaking!
    let rawSeconds = data[dateStr] || 0;
    let hours = rawSeconds / 3600;
    const isCapped = hours > 24;
    hours = Math.min(hours, 24);
    
    allDays.push({
      date: d,
      dateStr,
      hours,
      isCapped
    });
  }

  const getColorClass = (hours) => {
    if (hours === 0) return 'bg-neutral-800/40';
    if (hours < 1) return 'bg-emerald-900/60';
    if (hours < 3) return 'bg-emerald-700/80';
    if (hours < 6) return 'bg-emerald-500';
    return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] z-10'; // intense
  };

  const startPadding = getDay(startDate); // 0 = Sunday
  const paddedDays = Array(startPadding).fill(null).concat(allDays);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
      <div className="min-w-max flex">
        {/* Days of week labels */}
        <div className="flex flex-col justify-between text-[10px] text-neutral-500 font-medium h-[104px] pr-2 shrink-0 pt-1 pb-1">
          <span>Sun</span>
          <span>Tue</span>
          <span>Thu</span>
          <span>Sat</span>
        </div>

        <div className="flex flex-col">
          {/* Grid */}
          <div 
            className="grid grid-rows-7 gap-[3px]"
            style={{ gridAutoFlow: 'column' }}
          >
            {paddedDays.map((day, idx) => {
              if (!day) return <div key={`pad-${idx}`} className="w-[11px] h-[11px]" />;
              
              const tooltipText = `${day.hours.toFixed(1)} hours on ${format(day.date, 'MMM d, yyyy')}${day.isCapped ? ' (Capped at 24h)' : ''}`;
              
              return (
                <div
                  key={day.dateStr}
                  title={tooltipText}
                  className={`w-[11px] h-[11px] rounded-none transition-colors cursor-pointer hover:ring-1 hover:ring-neutral-400 ${getColorClass(day.hours)}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end mt-4 space-x-2 text-xs text-neutral-500 font-medium">
        <span>Less</span>
        <div className="flex space-x-[3px]">
          <div className="w-[11px] h-[11px] rounded-none bg-neutral-800/40" />
          <div className="w-[11px] h-[11px] rounded-none bg-emerald-900/60" />
          <div className="w-[11px] h-[11px] rounded-none bg-emerald-700/80" />
          <div className="w-[11px] h-[11px] rounded-none bg-emerald-500" />
          <div className="w-[11px] h-[11px] rounded-none bg-emerald-400" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}