export const JELLYFIN_CLIENT = 'serotonin';
export const JELLYFIN_DEVICE = 'Web';
export const JELLYFIN_VERSION = '1.0.0';

export function getBaseUrl() {
  return localStorage.getItem('jellyfin_url') || '';
}

export function getToken() {
  return localStorage.getItem('jellyfin_token') || '';
}

export function getDeviceId() {
  let deviceId = localStorage.getItem('jellyfin_device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('jellyfin_device_id', deviceId);
  }
  return deviceId;
}

export function getUserId() {
  try {
    const userStr = localStorage.getItem('jellyfin_user');
    if (userStr) {
      return JSON.parse(userStr).Id;
    }
  } catch (e) {
    console.error('Failed to parse user', e);
  }
  return null;
}

export function getAuthHeader() {
  const token = getToken();
  if (token) {
    return `MediaBrowser Token="${token}"`;
  }
  
  return `MediaBrowser Client="${JELLYFIN_CLIENT}", Device="${JELLYFIN_DEVICE}", DeviceId="${getDeviceId()}", Version="${JELLYFIN_VERSION}"`;
}

export async function jellyfinFetch(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('No Jellyfin URL configured');
  }

  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Auth API
export async function authenticate(url, username, password) {
  // temporarily store url to use fetch wrapper
  localStorage.setItem('jellyfin_url', url);
  
  try {
    const data = await jellyfinFetch('/Users/AuthenticateByName', {
      method: 'POST',
      body: JSON.stringify({ Username: username, Pw: password }),
    });
    
    if (data.AccessToken) {
      localStorage.setItem('jellyfin_token', data.AccessToken);
      localStorage.setItem('jellyfin_user', JSON.stringify(data.User));
      return data;
    }
    throw new Error('No access token received');
  } catch (err) {
    localStorage.removeItem('jellyfin_url');
    throw err;
  }
}

export function logout() {
  localStorage.removeItem('jellyfin_token');
  localStorage.removeItem('jellyfin_user');
  localStorage.removeItem('jellyfin_url');
}

// Playback Reporting API
export async function getUserActivity(days = 30) {
  return jellyfinFetch(`/user_usage_stats/user_activity?days=${days}`);
}

export async function getTopMovies(days = 30) {
  return jellyfinFetch(`/user_usage_stats/MoviesReport?days=${days}`);
}

export async function getTopShows(days = 30) {
  return jellyfinFetch(`/user_usage_stats/GetTvShowsReport?days=${days}`);
}

export async function getPlayActivity(days = 30, dataType = 'time') {
  // We must explicitly ask for all media types, otherwise it returns empty
  const filter = 'Movie,Episode,Audio,Video,MusicVideo';
  return jellyfinFetch(`/user_usage_stats/PlayActivity?days=${days}&dataType=${dataType}&filter=${filter}`);
}

export async function getHourlyActivity(days = 30) {
  return jellyfinFetch(`/user_usage_stats/HourlyReport?days=${days}`);
}

export async function getCustomQuery(query, replaceUserId = true) {
  return jellyfinFetch('/user_usage_stats/submit_custom_query', {
    method: 'POST',
    body: JSON.stringify({
      CustomQueryString: query,
      ReplaceUserId: replaceUserId
    })
  });
}

export async function getUserWatchHistory(userId, limit = 50) {
  const query = `SELECT DateCreated, ItemName, ItemType, ClientName, PlayDuration FROM PlaybackActivity WHERE UserId = '${userId}' ORDER BY DateCreated DESC LIMIT ${limit}`;
  return getCustomQuery(query, false);
}

export async function getTopItemsByType(itemType, limit = 20, days = 3650) {
  const dateFilter = days ? `AND DateCreated >= date('now', '-${days} days')` : '';

  // Get raw play counts by ItemId without regex. We will dynamically group by the actual SeriesId or AlbumId 
  // fetched directly from Jellyfin rather than relying on regex string manipulation on ItemName.
  const query = `
    SELECT ItemId, 
           ItemName AS GroupName, 
           COUNT(1) AS play_count, 
           SUM(PlayDuration) AS total_duration 
    FROM PlaybackActivity 
    WHERE ItemType = '${itemType}' ${dateFilter}
    GROUP BY ItemId 
    ORDER BY total_duration DESC 
  `;

  return getCustomQuery(query.replace(/\n\s+/g, ' ').trim(), false);
}

export async function getLibraryStats(itemType, days = 3650) {
  const dateFilter = days ? `AND DateCreated >= date('now', '-${days} days')` : '';
  const query = `
    SELECT COUNT(1) AS play_count, SUM(PlayDuration) AS total_duration 
    FROM PlaybackActivity 
    WHERE ItemType = '${itemType}' ${dateFilter}
  `;

  return getCustomQuery(query.replace(/\n\s+/g, ' ').trim(), false);
}

export async function getClientBreakdown(itemType = null, limit = 10, days = 3650) {
  const dateFilter = days ? `DateCreated >= date('now', '-${days} days')` : '1=1';
  const typeFilter = itemType ? `AND ItemType = '${itemType}'` : '';
  
  const query = `
    SELECT ClientName, COUNT(1) AS play_count, SUM(PlayDuration) AS total_duration 
    FROM PlaybackActivity 
    WHERE ${dateFilter} ${typeFilter} 
    GROUP BY ClientName 
    ORDER BY total_duration DESC 
    LIMIT ${limit}
  `;

  return getCustomQuery(query.replace(/\n\s+/g, ' ').trim(), false);
}

export async function getTopArtists(limit = 20, days = 3650) {
  const dateFilter = days ? `AND DateCreated >= date('now', '-${days} days')` : '';

  const query = `
    SELECT MAX(ItemId) AS ItemId, 
           CASE 
             WHEN instr(ItemName, ' - ') > 0 
             THEN substr(ItemName, 1, instr(ItemName, ' - ') - 1) 
             ELSE ItemName 
           END AS ArtistName, 
           COUNT(1) AS play_count, 
           SUM(PlayDuration) AS total_duration 
    FROM PlaybackActivity 
    WHERE ItemType = 'Audio' ${dateFilter}
    GROUP BY ArtistName 
    ORDER BY total_duration DESC 
    LIMIT ${limit}
  `;

  return getCustomQuery(query.replace(/\n\s+/g, ' ').trim(), false);
}

export async function getItemsMetadata(itemIds) {
  const userId = getUserId();
  if (!userId || !itemIds || itemIds.length === 0) return { Items: [] };
  
  // Jellyfin limits the length of URLs, so we batch the IDs if there are too many.
  // Generally, ~100 IDs is safe for a single GET query string.
  const batchSize = 100;
  let allItems = [];
  
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    try {
      const res = await jellyfinFetch(`/Users/${userId}/Items?Ids=${idsParam}&Fields=PrimaryImageAspectRatio,SeriesPrimaryImageTag,ArtistItems`);
      if (res && res.Items) {
        allItems = allItems.concat(res.Items);
      }
    } catch (err) {
      console.error('Batch fetch failed for some items', err);
    }
  }

  return { Items: allItems };
}

export function getImageUrl(itemId) {
  const baseUrl = getBaseUrl();
  if (!baseUrl || !itemId) return null;
  return `${baseUrl.replace(/\/$/, '')}/Items/${itemId}/Images/Primary`;
}
