import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getUserWatchHistory, 
  getUserActivity, 
  getPlayActivity 
} from '../lib/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  Activity, 
  History, 
  Clock, 
  PlayCircle,
  MonitorPlay,
  Calendar,
  Film,
  Tv
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import Layout from '../components/Layout';
import Heatmap from '../components/Heatmap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [userStats, setUserStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [activityData, setActivityData] = useState(null);
  const [heatmapData, setHeatmapData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, historyRes, activityRes] = await Promise.all([
          getUserActivity(3650), // Get all-time stats roughly
          getUserWatchHistory(id, 50),
          getPlayActivity(365, 'time') // Get 365 days for the heatmap!
        ]);
        
        const user = usersRes.find(u => u.user_id === id);
        if (!user) throw new Error('User not found');
        
        setUserStats(user);
        
        if (historyRes && historyRes.results) {
          const parsedHistory = historyRes.results.map(row => ({
            date: row[0],
            name: row[1],
            type: row[2],
            client: row[3],
            duration: parseInt(row[4], 10)
          }));
          setHistory(parsedHistory);
        }
        
        const userActivity = activityRes.find(u => u.user_id === id);
        
        if (userActivity) {
          // Heatmap expects an object of { "YYYY-MM-DD": seconds }
          setHeatmapData(userActivity.user_usage);
          
          // Process 30-Day Activity Chart for just this user
          const dates = [];
          for (let i = 29; i >= 0; i--) {
            dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
          }
          
          setActivityData({
            labels: dates.map(d => format(parseISO(d), 'MMM d')),
            datasets: [{
              label: 'Hours Watched',
              data: dates.map(d => {
                const hours = (userActivity.user_usage[d] || 0) / 3600;
                return Math.min(hours, 24); // Cap bugged clients to 24h
              }),
              backgroundColor: 'rgba(59, 130, 246, 0.8)', // Purple
              borderRadius: 4
            }]
          });
        }

      } catch (err) {
        console.error(err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getIconForType = (type) => {
    switch (type.toLowerCase()) {
      case 'movie': return <Film className="w-4 h-4 text-pink-500" />;
      case 'episode': return <Tv className="w-4 h-4 text-emerald-500" />;
      default: return <PlayCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center text-neutral-100 py-20">
          <div className="text-red-400 mb-4">{error}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header & Navigation */}
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tighter uppercase text-white flex items-center">
            {userStats?.user_name}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">User Profile & Watch History</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl flex flex-col items-center justify-center text-center">
          <Clock className="w-8 h-8 text-blue-500 mb-3" />
          <div className="text-2xl font-bold text-neutral-100">{formatDuration(userStats?.total_time)}</div>
          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mt-1">Total Watch Time</div>
        </div>
        
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl flex flex-col items-center justify-center text-center">
          <PlayCircle className="w-8 h-8 text-blue-500 mb-3" />
          <div className="text-2xl font-bold text-neutral-100">{userStats?.total_count}</div>
          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mt-1">Items Played</div>
        </div>
        
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl flex flex-col items-center justify-center text-center">
          <Calendar className="w-8 h-8 text-emerald-500 mb-3" />
          <div className="text-2xl font-bold text-neutral-100">{userStats?.last_seen || 'Never'}</div>
          <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mt-1">Last Active</div>
        </div>
      </div>

      {/* User Activity Graph & Heatmap */}
      {activityData && (
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold uppercase tracking-wider">Activity Overview</h2>
            </div>
          </div>
          
          {/* Heatmap (Full Year) */}
          <div className="mb-10">
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Last 365 Days</h3>
            <Heatmap data={heatmapData} days={365} />
          </div>

          {/* Bar Chart (30 Days) */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-4">Last 30 Days (Hours)</h3>
            <div className="h-[200px] w-full">
              <Bar 
                data={activityData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#18181b',
                      titleColor: '#f4f4f5',
                      bodyColor: '#a1a1aa',
                      borderColor: '#27272a',
                      borderWidth: 1,
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `${context.parsed.y.toFixed(1)} hours`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#71717a', maxTicksLimit: 15 }
                    },
                    y: {
                      grid: { color: '#27272a', drawBorder: false },
                      ticks: { color: '#71717a' },
                      max: 24 // Cap graph rendering to 24 hours max
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Watch History Timeline */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl">
        <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-neutral-800/50">
          <History className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold uppercase tracking-wider">Recent History</h2>
          <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-1 rounded-none ml-auto">Last 50 items</span>
        </div>
        
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">No watch history found for this user.</div>
          ) : (
            history.map((item, idx) => (
              <div 
                key={idx} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/50 rounded-none border border-neutral-800/50 hover:border-neutral-700/50 transition-colors gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="mt-1 p-2 bg-[#0a0a0a] rounded-none">
                    {getIconForType(item.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-200 text-base">{item.name}</div>
                    <div className="flex items-center space-x-3 text-xs text-neutral-500 mt-1">
                      <span className="flex items-center">
                        <MonitorPlay className="w-3 h-3 mr-1" />
                        {item.client}
                      </span>
                      <span className="bg-neutral-800 px-2 py-0.5 rounded-none text-neutral-400 font-medium">
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end justify-between text-sm sm:text-right w-full sm:w-auto pl-12 sm:pl-0 border-t sm:border-t-0 border-neutral-800/50 pt-3 sm:pt-0">
                  <div className="text-neutral-400 flex items-center font-mono text-xs">
                    {formatDuration(item.duration)} played
                  </div>
                  <div className="text-neutral-500 text-xs mt-1">
                    {format(new Date(item.date), 'MMM d, yyyy • h:mm a')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}