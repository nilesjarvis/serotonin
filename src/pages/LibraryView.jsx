import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTopItemsByType, getImageUrl, getItemsMetadata, getClientBreakdown, getTopArtists, getLibraryStats } from '../lib/api';
import { Activity, Clock, PlayCircle, Film, Tv, Music, Video, PlaySquare, Mic2 } from 'lucide-react';
import Layout from '../components/Layout';
import ClientBreakdown from '../components/ClientBreakdown';

const TYPE_CONFIG = {
  Movie: { title: 'Top Movies', icon: <Film className="w-6 h-6 text-pink-500" /> },
  Episode: { title: 'Top Shows', icon: <Tv className="w-6 h-6 text-emerald-500" /> },
  Audio: { title: 'Top Music', icon: <Music className="w-6 h-6 text-blue-500" /> },
  Video: { title: 'Top Home Videos', icon: <Video className="w-6 h-6 text-orange-500" /> },
  MusicVideo: { title: 'Top Music Videos', icon: <PlaySquare className="w-6 h-6 text-blue-500" /> },
};

export default function LibraryView() {
  const { type } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [artists, setArtists] = useState([]);
  const [stats, setStats] = useState({ count: 0, duration: 0 });
  
  const config = TYPE_CONFIG[type] || { title: 'Library', icon: <Activity className="w-6 h-6" /> };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const promises = [
          getTopItemsByType(type, 30, 3650),
          getClientBreakdown(type, 10, 3650),
          getLibraryStats(type, 3650)
        ];

        // If Audio, also fetch Top Artists
        if (type === 'Audio') {
          promises.push(getTopArtists(20, 3650));
        }

        const [res, clientsRes, statsRes, artistsRes] = await Promise.all(promises);

        if (statsRes && statsRes.results && statsRes.results.length > 0) {
          setStats({
            count: parseInt(statsRes.results[0][0] || 0, 10),
            duration: parseInt(statsRes.results[0][1] || 0, 10)
          });
        }

        if (clientsRes && clientsRes.results) {
          setClients(clientsRes.results.map(row => ({
            client: row[0],
            count: parseInt(row[1], 10),
            duration: parseInt(row[2], 10)
          })));
        }

        if (artistsRes && artistsRes.results) {
          let parsedArtists = artistsRes.results.map(row => ({
            id: row[0],
            name: row[1],
            playCount: parseInt(row[2], 10),
            duration: parseInt(row[3], 10),
            imageId: null
          }));

          // Try to get artist images
          const itemIds = parsedArtists.map(p => p.id);
          const metadataRes = await getItemsMetadata(itemIds);
          if (metadataRes && metadataRes.Items) {
            const metadataMap = {};
            metadataRes.Items.forEach(item => {
              metadataMap[item.Id] = item;
            });
            parsedArtists = parsedArtists.map(p => {
              const meta = metadataMap[p.id];
              if (meta && meta.ArtistItems && meta.ArtistItems.length > 0) {
                p.imageId = meta.ArtistItems[0].Id;
              }
              return p;
            });
          }
          setArtists(parsedArtists);
        }

        if (res && res.results) {
          let parsed = res.results.map(row => ({
            id: row[0],          
            name: row[1],
            playCount: parseInt(row[2], 10),
            duration: parseInt(row[3], 10),
            imageId: row[0]      
          }));

          // Because we now pull the raw individual track/episode playbacks, we need to group them 
          // manually using Jellyfin's actual metadata rather than relying on regex string manipulation.
          if ((type === 'Audio' || type === 'Episode') && parsed.length > 0) {
            // Jellyfin limits bulk metadata requests. Process in chunks of 100 if necessary
            // For typical top 30 views, this is fine, but the raw query pulled ALL un-grouped items
            const itemIds = parsed.map(p => p.id).slice(0, 500); 
            const metadataRes = await getItemsMetadata(itemIds);
            
            if (metadataRes && metadataRes.Items) {
              const metadataMap = {};
              metadataRes.Items.forEach(item => {
                metadataMap[item.Id] = item;
              });

              // Group the parsed items by their parent
              const grouped = {};
              
              parsed.forEach(p => {
                const meta = metadataMap[p.id];
                if (meta) {
                  let groupId = p.id;
                  let groupName = p.name;
                  let imageId = p.id;

                  if (type === 'Audio' && meta.AlbumId) {
                    groupId = meta.AlbumId;
                    groupName = meta.AlbumArtist ? `${meta.AlbumArtist} - ${meta.Album}` : meta.Album;
                    imageId = meta.AlbumId;
                  } else if (type === 'Episode' && meta.SeriesId) {
                    groupId = meta.SeriesId;
                    groupName = meta.SeriesName || meta.Name;
                    imageId = meta.SeriesId;
                  }

                  if (!grouped[groupId]) {
                    grouped[groupId] = {
                      id: groupId,
                      name: groupName,
                      playCount: 0,
                      duration: 0,
                      imageId: imageId
                    };
                  }

                  grouped[groupId].playCount += p.playCount;
                  grouped[groupId].duration += p.duration;
                } else {
                   // Fallback if metadata missing
                   if (!grouped[p.id]) {
                     grouped[p.id] = { ...p };
                   } else {
                     grouped[p.id].playCount += p.playCount;
                     grouped[p.id].duration += p.duration;
                   }
                }
              });

              // Convert back to array, sort by duration, and limit
              parsed = Object.values(grouped).sort((a, b) => b.duration - a.duration).slice(0, 30);
            }
          } else {
            // Just apply the limit for non-grouped types like Movies
            parsed = parsed.slice(0, 30);
          }
          
          setItems(parsed);
        }
      } catch (err) {
        console.error(err);
        setError(`Failed to load ${type} library data`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isSquareImage = type === 'Audio';
  const isLandscapeImage = type === 'Video' || type === 'MusicVideo';
  const isPortraitImage = type === 'Movie' || type === 'Episode';

  return (
    <Layout>
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 bg-[#0a0a0a] rounded-none border border-neutral-800 flex items-center justify-center shadow-lg">
          {config.icon}
        </div>
        <h1 className="text-4xl font-bold tracking-tighter uppercase text-white">{config.title}</h1>
      </div>

      {/* Global Library Stats Row */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <Clock className="w-8 h-8 text-blue-500 mb-3" />
            <div className="text-2xl font-bold text-neutral-100">{formatDuration(stats.duration)}</div>
            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Total Watch Time</div>
          </div>
          
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-none p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <PlayCircle className="w-8 h-8 text-blue-500 mb-3" />
            <div className="text-2xl font-bold text-neutral-100">{stats.count.toLocaleString()}</div>
            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Total Plays</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-none mb-8">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Activity className="w-12 h-12 text-blue-600 animate-pulse" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#0a0a0a]/50 border border-neutral-800 rounded-none">
          <div className="text-neutral-500 mb-2">No activity found for {type} yet.</div>
          <div className="text-sm text-neutral-600">Start watching to populate this list!</div>
        </div>
      ) : (
        <div className="space-y-8">
          {clients.length > 0 && (
            <ClientBreakdown data={clients} title={`Clients Used (${config.title.replace('Top ', '')})`} />
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item, idx) => (
              <div key={item.id} className="group flex flex-col">
                <div className={`relative overflow-hidden bg-[#0a0a0a] border border-neutral-800 rounded-none shadow-lg mb-3
                  ${isSquareImage ? 'aspect-square' : isLandscapeImage ? 'aspect-video' : 'aspect-[2/3]'}
                `}>
                  <img 
                    src={getImageUrl(item.imageId)} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  {/* Fallback placeholder if image fails/missing */}
                  <div className="absolute inset-0 bg-[#0a0a0a] flex-col items-center justify-center hidden p-4 text-center">
                    <span className="text-neutral-600 text-xs break-words line-clamp-3 font-medium">{item.name}</span>
                  </div>
                  
                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white font-bold text-xs w-6 h-6 rounded-none flex items-center justify-center border border-white/10 shadow-lg">
                    {idx + 1}
                  </div>
                </div>

                <h3 className="font-semibold text-neutral-200 line-clamp-2 text-sm leading-snug group-hover:text-blue-400 transition-colors" title={item.name}>
                  {item.name}
                </h3>
                
                <div className="flex items-center space-x-3 mt-1.5 text-xs text-neutral-500 font-medium">
                  <span className="flex items-center">
                    <PlayCircle className="w-3 h-3 mr-1 text-blue-500" />
                    {item.playCount}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-blue-500" />
                    {formatDuration(item.duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {type === 'Audio' && artists.length > 0 && (
            <div className="mt-16 pt-12 border-t border-neutral-800">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-[#0a0a0a] border border-neutral-800 shadow-lg flex items-center justify-center">
                  <Mic2 className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-wider text-neutral-100">Top Artists</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {artists.map((artist, idx) => (
                  <div key={artist.id} className="group flex flex-col relative">
                    <div className="relative overflow-hidden bg-[#0a0a0a] border border-neutral-800 rounded-none shadow-lg mb-3 aspect-square z-10">
                      <img 
                        src={getImageUrl(artist.imageId)} 
                        alt={artist.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 z-20 relative"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      {/* Fallback placeholder if image fails/missing */}
                      <div className="absolute inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center p-4 text-center z-10">
                        <Mic2 className="w-8 h-8 text-neutral-800 mb-2" />
                        <span className="text-neutral-500 text-xs break-words line-clamp-2 font-medium">{artist.name}</span>
                      </div>
                      
                      {/* Rank Badge */}
                      <div className="absolute top-2 left-2 z-30 bg-black/80 backdrop-blur-sm text-white font-bold text-xs w-6 h-6 rounded-none flex items-center justify-center border border-white/10 shadow-lg">
                        {idx + 1}
                      </div>
                    </div>

                    <h3 className="font-semibold text-neutral-200 line-clamp-2 text-sm leading-snug group-hover:text-blue-400 transition-colors" title={artist.name}>
                      {artist.name}
                    </h3>
                    
                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-neutral-500 font-medium">
                      <span className="flex items-center">
                        <PlayCircle className="w-3 h-3 mr-1 text-blue-500" />
                        {artist.playCount}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-blue-500" />
                        {formatDuration(artist.duration)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}