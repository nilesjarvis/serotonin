import React, { useEffect, useState } from 'react';
import { getSuspiciousActivity, getItemsMetadata } from '../lib/api';
import { AlertTriangle, Clock, Activity, FileWarning, SearchX } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Layout from '../components/Layout';

export default function DataAudit() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outliers, setOutliers] = useState([]);
  
  // Total summary states
  const [totalOutlierSeconds, setTotalOutlierSeconds] = useState(0);
  const [totalRealSeconds, setTotalRealSeconds] = useState(0);

  useEffect(() => {
    const fetchAuditData = async () => {
      setLoading(true);
      try {
        // 1. Get potentially suspicious plays from PlaybackActivity DB
        const suspiciousRes = await getSuspiciousActivity(250); // Get top 250 longest plays over 20 mins
        
        if (!suspiciousRes || !suspiciousRes.results) {
          setLoading(false);
          return;
        }

        const rawEvents = suspiciousRes.results.map(row => ({
          date: row[0],
          id: row[1],
          name: row[2],
          type: row[3],
          client: row[4],
          reportedDuration: parseInt(row[5], 10),
          realDuration: null // Will be populated next
        }));

        // 2. Fetch the actual item runtimes from Jellyfin to cross-reference
        const uniqueIds = [...new Set(rawEvents.map(e => e.id))];
        const metaRes = await getItemsMetadata(uniqueIds);
        
        const metadataMap = {};
        if (metaRes && metaRes.Items) {
          metaRes.Items.forEach(item => {
            metadataMap[item.Id] = item;
          });
        }

        // 3. Compare Reported Duration against Real Duration
        let inflatedSeconds = 0;
        let actualSeconds = 0;
        const processedOutliers = [];

        for (const event of rawEvents) {
          const meta = metadataMap[event.id];
          
          if (meta && meta.RunTimeTicks) {
            // Jellyfin RunTimeTicks are in 10-nanosecond units (1 tick = 100ns)
            // 1 second = 10,000,000 ticks
            const realDurationSeconds = Math.floor(meta.RunTimeTicks / 10000000);
            event.realDuration = realDurationSeconds;

            // Define Outlier criteria: 
            // If the reported duration is more than 5 minutes (300s) longer than the actual media length
            if (event.reportedDuration > (realDurationSeconds + 300)) {
              processedOutliers.push(event);
              inflatedSeconds += event.reportedDuration;
              actualSeconds += realDurationSeconds;
            }
          } else {
             // If we can't find the media (deleted?), but it's an Audio track played for > 1.5 hours, it's highly suspect
             if (event.type === 'Audio' && event.reportedDuration > 5400) {
               processedOutliers.push(event);
               inflatedSeconds += event.reportedDuration;
             }
          }
        }

        setOutliers(processedOutliers);
        setTotalOutlierSeconds(inflatedSeconds);
        setTotalRealSeconds(actualSeconds);

      } catch (err) {
        console.error('Audit Error:', err);
        setError('Failed to run data audit query.');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditData();
  }, []);

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20 flex-col">
          <SearchX className="w-12 h-12 text-blue-600 animate-bounce mb-4" />
          <p className="text-neutral-400 font-medium">Scanning playback logs for anomalies...</p>
        </div>
      </Layout>
    );
  }

  const hoursSkewed = Math.floor((totalOutlierSeconds - totalRealSeconds) / 3600);

  return (
    <Layout>
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-none border border-neutral-800 flex items-center justify-center shadow-lg">
          <FileWarning className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-white">Data Audit Report</h1>
      </div>

      <div className="mb-8 p-6 bg-[#0a0a0a] border border-neutral-800 rounded-none shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
        <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100 mb-2">Ghost Sessions Detected</h2>
        <p className="text-neutral-400 text-sm leading-relaxed max-w-3xl">
          Certain third-party clients (especially mobile music apps) fail to close playback sessions when paused or disconnected. 
          This causes the server to log artificially massive play durations for short media files.
        </p>
        
        {outliers.length > 0 && (
          <div className="mt-6 flex items-center space-x-8">
            <div>
              <div className="text-3xl font-bold text-red-500">+{hoursSkewed} Hours</div>
              <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Artificially Inflated Watch Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-neutral-200">{outliers.length}</div>
              <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Corrupted Records Found</div>
            </div>
          </div>
        )}
      </div>

      {outliers.length === 0 ? (
        <div className="text-center py-20 bg-[#0a0a0a] border border-neutral-800 shadow-xl rounded-none">
          <Activity className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100 mb-2">No Outliers Found</h2>
          <p className="text-neutral-400 text-sm">Your playback reporting database looks clean.</p>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none shadow-xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/50 border-b border-neutral-800 text-xs uppercase tracking-wider font-bold text-neutral-400">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-emerald-500">Real Length</th>
                <th className="px-6 py-4 text-red-500">Reported Playtime</th>
                <th className="px-6 py-4">Discrepancy</th>
                <th className="px-6 py-4">Date Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {outliers.map((event, idx) => {
                let overagePercent = 0;
                if (event.realDuration) {
                  overagePercent = Math.round(((event.reportedDuration - event.realDuration) / event.realDuration) * 100);
                }

                return (
                  <tr key={`${event.id}-${idx}`} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-200 break-words max-w-xs">{event.name}</div>
                      <div className="text-xs text-neutral-500 mt-1">{event.type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-black border border-neutral-800 px-2 py-1 text-neutral-300 text-xs">{event.client}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400">
                      {formatDuration(event.realDuration)}
                    </td>
                    <td className="px-6 py-4 font-mono text-red-400 font-bold">
                      {formatDuration(event.reportedDuration)}
                    </td>
                    <td className="px-6 py-4">
                      {overagePercent > 0 ? (
                        <span className="flex items-center text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 w-max border border-red-500/20">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          +{overagePercent}%
                        </span>
                      ) : (
                        <span className="text-neutral-500 font-mono text-xs">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-xs">
                      {format(parseISO(event.date), 'MMM d, yyyy HH:mm')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}