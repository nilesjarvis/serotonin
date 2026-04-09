import React from 'react';
import { MonitorPlay } from 'lucide-react';

export default function ClientBreakdown({ data, title = 'Client Breakdown' }) {
  if (!data || data.length === 0) return null;

  // Colors for different clients, rotating through tailwind-inspired palette
  const colors = [
    'bg-blue-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];

  const totalDuration = data.reduce((acc, curr) => acc + curr.duration, 0);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl">
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-neutral-800/50">
        <MonitorPlay className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">{title}</h2>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-3 flex rounded-none overflow-hidden mb-6 bg-neutral-800">
        {data.map((item, idx) => {
          const percent = Math.max((item.duration / totalDuration) * 100, 1);
          return (
            <div 
              key={item.client} 
              className={`${colors[idx % colors.length]} h-full transition-all duration-500`} 
              style={{ width: `${percent}%` }}
              title={`${item.client}: ${formatDuration(item.duration)}`}
            />
          );
        })}
      </div>

      {/* Legend / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
        {data.map((item, idx) => {
          const percent = ((item.duration / totalDuration) * 100).toFixed(1);
          return (
            <div key={item.client} className="flex items-center justify-between group">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className={`w-3 h-3 rounded-none shrink-0 ${colors[idx % colors.length]}`} />
                <span className="text-sm font-medium text-neutral-300 truncate" title={item.client}>
                  {item.client}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="text-sm text-neutral-400 font-mono">{percent}%</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">{formatDuration(item.duration)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}