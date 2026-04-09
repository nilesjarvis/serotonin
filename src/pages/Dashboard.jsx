import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  getUserActivity, 
  getPlayActivity,
  getTopItemsByType,
  getItemsMetadata,
  getImageUrl,
  getClientBreakdown,
  logout
} from '../lib/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Activity, 
  Film, 
  Tv, 
  Users, 
  Clock, 
  PlayCircle 
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import Layout from '../components/Layout';
import ClientBreakdown from '../components/ClientBreakdown';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [users, setUsers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [activityData, setActivityData] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, moviesRes, showsRes, activityRes, clientsRes] = await Promise.all([
          getUserActivity(3650), // All-time basically
          getTopItemsByType('Movie', 10, 3650),
          getTopItemsByType('Episode', 10, 3650),
          getPlayActivity(30, 'time'),
          getClientBreakdown(null, 10, 3650)
        ]);
        
        setUsers(usersRes.filter(u => u.user_id !== 'labels_user'));
        
        if (clientsRes?.results) {
          setClients(clientsRes.results.map(row => ({
            client: row[0],
            count: parseInt(row[1], 10),
            duration: parseInt(row[2], 10)
          })));
        }

        // Map custom SQL format to simpler array for dashboard
        if (moviesRes?.results) {
          setMovies(moviesRes.results.map(row => ({
            id: row[0],
            imageId: row[0],
            name: row[1],
            count: parseInt(row[2], 10),
            time: parseInt(row[3], 10)
          })));
        }

        if (showsRes?.results) {
          let parsedShows = showsRes.results.map(row => ({
            id: row[0],
            imageId: row[0],
            name: row[1],
            count: parseInt(row[2], 10),
            time: parseInt(row[3], 10)
          }));

          const itemIds = parsedShows.map(p => p.id).slice(0, 100);
          const metadataRes = await getItemsMetadata(itemIds);
          if (metadataRes && metadataRes.Items) {
            const metadataMap = {};
            metadataRes.Items.forEach(item => {
              metadataMap[item.Id] = item;
            });

            const grouped = {};

            parsedShows.forEach(p => {
              const meta = metadataMap[p.id];
              if (meta) {
                const groupId = meta.SeriesId || p.id;
                const groupName = meta.SeriesName || meta.Name || p.name;
                const imageId = meta.SeriesId || p.id;

                if (!grouped[groupId]) {
                  grouped[groupId] = {
                    id: groupId,
                    name: groupName,
                    count: 0,
                    time: 0,
                    imageId: imageId
                  };
                }

                grouped[groupId].count += p.count;
                grouped[groupId].time += p.time;
              } else {
                 if (!grouped[p.id]) {
                   grouped[p.id] = { ...p };
                 } else {
                   grouped[p.id].count += p.count;
                   grouped[p.id].time += p.time;
                 }
              }
            });

            parsedShows = Object.values(grouped).sort((a, b) => b.time - a.time).slice(0, 10);
          }
          setShows(parsedShows);
        }
        
        // Process activity chart data
        const dates = [];
        for (let i = 29; i >= 0; i--) {
          dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
        }
        
        const datasets = activityRes
          .filter(u => u.user_id !== 'labels_user')
          .map((user, idx) => {
            const colors = [
              'rgba(59, 130, 246, 1)',   // Purple
              'rgba(59, 130, 246, 1)',   // Blue
              'rgba(16, 185, 129, 1)',   // Green
              'rgba(245, 158, 11, 1)',   // Orange
              'rgba(236, 72, 153, 1)'    // Pink
            ];
            
            const color = colors[idx % colors.length];
            
            return {
              label: user.user_name || 'Unknown',
              data: dates.map(d => {
                let hours = (user.user_usage[d] || 0) / 3600;
                // Cap to 24 hours per day to prevent rogue clients from distorting the chart
                return Math.min(hours, 24);
              }),
              borderColor: color,
              backgroundColor: color.replace('1)', '0.1)'),
              fill: true,
              tension: 0.4
            };
        });

        setActivityData({
          labels: dates.map(d => format(parseISO(d), 'MMM d')),
          datasets
        });

      } catch (err) {
        console.error(err);
        if (err.message.includes('401')) {
          logout();
          navigate('/login');
        }
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-none border border-neutral-800 flex items-center justify-center shadow-lg">
          <Activity className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-white">Dashboard Overview</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-none mb-8">
          {error}
        </div>
      )}

      {/* Global Activity Chart */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 mb-8 shadow-xl">
        <div className="flex items-center space-x-2 mb-6">
          <Activity className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">30 Day Activity (Hours)</h2>
        </div>
        <div className="h-[300px] w-full">
          {activityData && (
            <Line 
              data={activityData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { color: '#a1a1aa', usePointStyle: true, boxWidth: 6 }
                  },
                  tooltip: {
                    backgroundColor: '#18181b',
                    titleColor: '#f4f4f5',
                    bodyColor: '#a1a1aa',
                    borderColor: '#27272a',
                    borderWidth: 1,
                    padding: 12
                  }
                },
                scales: {
                  x: {
                    grid: { color: '#27272a', drawBorder: false },
                    ticks: { color: '#71717a', maxTicksLimit: 10 }
                  },
                  y: {
                    grid: { color: '#27272a', drawBorder: false },
                    ticks: { color: '#71717a' },
                    beginAtZero: true,
                    max: 24 // Capped at 24 hours per day max
                  }
                }
              }} 
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* User Leaderboard */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl xl:col-span-1">
        <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-neutral-800/50">
          <Users className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">All-Time Users</h2>
        </div>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-neutral-500 text-center py-8">No user activity recorded.</div>
            ) : users.map((user) => (
              <Link 
                to={`/user/${user.user_id}`} 
                key={user.user_id}
                className="flex items-center justify-between p-3 rounded-none hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-800 group"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-neutral-200 group-hover:text-blue-400 transition-colors">{user.user_name}</span>
                  <span className="text-xs text-neutral-500 flex items-center mt-1">
                    <PlayCircle className="w-3 h-3 mr-1 shrink-0" />
                    <span className="truncate max-w-[150px]">{user.item_name || 'Nothing watched yet'}</span>
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-neutral-300">
                    {formatDuration(user.total_time)}
                  </span>
                  <span className="text-xs text-neutral-500 flex items-center mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    {user.last_seen || 'Never'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Client Breakdown */}
        {clients.length > 0 && (
          <div className="xl:col-span-1 h-full">
            <ClientBreakdown data={clients} />
          </div>
        )}

        {/* Top Media Snippets */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Movies */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800/50">
                <div className="flex items-center space-x-2">
                  <Film className="w-5 h-5 text-pink-500" />
                  <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">Top Movies</h2>
                </div>
                <Link to="/library/Movie" className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All &rarr;</Link>
              </div>
              <div className="space-y-3">
                {movies.length === 0 ? (
                  <div className="text-neutral-500 py-4 text-sm">No movies watched.</div>
                ) : movies.map((movie, idx) => (
                  <div key={movie.id} className="flex items-center justify-between p-2 hover:bg-neutral-800/50 rounded-none transition-colors group">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      <span className="text-sm font-bold text-neutral-600 w-4 text-center shrink-0">{idx + 1}</span>
                      
                      <div className="w-8 h-12 bg-neutral-800 rounded-none flex items-center justify-center shrink-0 overflow-hidden relative">
                        <img 
                          src={getImageUrl(movie.imageId)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <Film className="w-4 h-4 text-neutral-600 absolute -z-10" />
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-neutral-300 truncate group-hover:text-blue-400 transition-colors" title={movie.name}>
                          {movie.name}
                        </span>
                        <span className="text-xs text-neutral-500">{formatDuration(movie.time)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-neutral-500 ml-4 shrink-0">
                      <span className="bg-black px-2 py-1 rounded-none text-neutral-400 border border-neutral-800 font-medium">{movie.count} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TV Shows */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800/50">
                <div className="flex items-center space-x-2">
                  <Tv className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-bold uppercase tracking-wider text-neutral-100">Top Shows</h2>
                </div>
                <Link to="/library/Episode" className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All &rarr;</Link>
              </div>
              <div className="space-y-3">
                {shows.length === 0 ? (
                  <div className="text-neutral-500 py-4 text-sm">No shows watched.</div>
                ) : shows.map((show, idx) => (
                  <div key={show.id} className="flex items-center justify-between p-2 hover:bg-neutral-800/50 rounded-none transition-colors group">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1">
                      <span className="text-sm font-bold text-neutral-600 w-4 text-center shrink-0">{idx + 1}</span>
                      
                      <div className="w-8 h-12 bg-neutral-800 rounded-none flex items-center justify-center shrink-0 overflow-hidden relative">
                        <img 
                          src={getImageUrl(show.imageId)} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <Tv className="w-4 h-4 text-neutral-600 absolute -z-10" />
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-neutral-300 truncate group-hover:text-blue-400 transition-colors" title={show.name}>
                          {show.name}
                        </span>
                        <span className="text-xs text-neutral-500">{formatDuration(show.time)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-neutral-500 ml-4 shrink-0">
                      <span className="bg-black px-2 py-1 rounded-none text-neutral-400 border border-neutral-800 font-medium">{show.count} plays</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}