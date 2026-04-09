# Jellyfin Playback Reporting API Documentation

This document serves as an internal reference for all the data that can be gathered from the Jellyfin Playback Reporting Plugin API. 

## Base Configuration

All requests must be authenticated. This requires an Admin user.
1. Send `POST /Users/AuthenticateByName` with payload `{"Username": "admin", "Pw": "password"}`.
2. Extract the `AccessToken` from the JSON response.
3. Inject the token into the `Authorization` header for all subsequent API requests:
   ```
   Authorization: MediaBrowser Token="your_access_token_here"
   ```

**Important Note on `filter` Parameter:**
Many of the time-series and histogram endpoints require a `filter` parameter with a comma-separated list of media types. If omitted, they will return empty sets. To ensure you retrieve everything, append:
`&filter=Audio,Episode,Movie,MusicVideo,Video`

---

## 1. Global Summaries & Leaderboards

### `GET /user_usage_stats/user_activity`
Returns a comprehensive leaderboard summary of all users.
**Parameters:** `days` (int)
**Example Response:**
```json
[
  {
    "latest_date": "2026-04-09T11:59:48Z",
    "user_id": "7f230e...",
    "user_name": "marcus",
    "total_count": 1608,
    "total_time": 949743,
    "item_name": "girl in red - midnight love",
    "client_name": "Firefox",
    "has_image": false,
    "last_seen": "1 minute ",
    "total_play_time": "1 week 3 days 23 hours 49 minutes "
  }
]
```

### `GET /user_usage_stats/MoviesReport` & `GET /user_usage_stats/GetTvShowsReport`
Returns the top played movies or TV shows respectively.
**Parameters:** `days` (int)
**Example Response:**
```json
[
  {
    "label": "The Matrix",
    "count": 5,
    "time": 36000
  }
]
```

### `GET /user_usage_stats/{breakdownType}/BreakdownReport`
Provides aggregate metrics grouped by a specific column. Valid breakdown types: `ClientName`, `DeviceName`, `UserId`, `PlaybackMethod`, `ItemType`.
**Parameters:** `days` (int)
**Example Request:** `GET /user_usage_stats/ClientName/BreakdownReport?days=30`
**Example Response:**
```json
[
  {"label": "Jellyfin Web", "count": 791, "time": 250442},
  {"label": "Swiftfin iPadOS", "count": 3, "time": 6309}
]
```

---

## 2. Time-Series & Graphs

### `GET /user_usage_stats/PlayActivity`
Returns daily time-series data grouped by user. Essential for Line/Bar charts showing activity trends.
**Parameters:** `days` (int), `dataType` ("time" or "count"), `filter` (string)
**Example Response:**
```json
[
  {
    "user_id": "7f230e...",
    "user_name": "marcus",
    "user_usage": {
      "2026-04-07": 0,
      "2026-04-08": 15020,
      "2026-04-09": 32519
    }
  }
]
```

### `GET /user_usage_stats/HourlyReport`
Returns a heatmap format showing total playtime for every hour of the week (0-6 represents Sunday-Saturday).
**Parameters:** `days` (int), `filter` (string)
**Example Response:**
```json
{
  "0-00": 0,
  "0-01": 3400,
  "1-18": 15000 
}
```

### `GET /user_usage_stats/DurationHistogramReport`
Buckets play durations into 5-minute intervals. The key represents `(Duration in Seconds / 300)`.
**Parameters:** `days` (int), `filter` (string)
**Example Response:**
```json
{
  "0": 1188,  // 1188 items played for 0-5 mins
  "1": 260,   // 260 items played for 5-10 mins
  "2": 44     // 44 items played for 10-15 mins
}
```

---

## 3. Drill-down & Details

### `GET /user_usage_stats/{userId}/{date}/GetItems`
Retrieves a detailed timeline of exactly what a user watched on a specific date. 
**Parameters:** `userId` (string), `date` (string format `yyyy-MM-dd`), `filter` (string)
**Example Response:**
```json
[
  {
    "Time": "12:00 AM",
    "Id": "749db...",
    "Name": "Neo-Confederate Meeting - SNL",
    "Type": "Video",
    "Client": "Jellyfin Web",
    "Method": "DirectPlay",
    "Device": "Firefox",
    "Duration": "215",
    "RowId": "435"
  }
]
```

---

## 4. System & Custom Queries

### `GET /user_usage_stats/type_filter_list`
Returns all unique `ItemType` values that exist in your database. 
**Example Response:**
```json
["Audio", "MusicVideo", "Episode", "Video", "Movie"]
```

### `GET /user_usage_stats/user_list`
Returns a list of all recognized users.
**Example Response:**
```json
[
  {
    "name": "marcus",
    "id": "7f230e...",
    "in_list": false
  }
]
```

### `POST /user_usage_stats/submit_custom_query`
The most powerful endpoint. Allows raw SQLite execution against the `PlaybackActivity` table. 

**Database Schema (`PlaybackActivity`):**
- `rowid` (INTEGER, SQLite built-in hidden row ID)
- `DateCreated` (DATETIME)
- `UserId` (TEXT)
- `ItemId` (TEXT)
- `ItemType` (TEXT)
- `ItemName` (TEXT)
- `PlaybackMethod` (TEXT)
- `ClientName` (TEXT)
- `DeviceName` (TEXT)
- `PlayDuration` (INT)

**Payload Example:**
```json
{
  "CustomQueryString": "SELECT ROWID, * FROM PlaybackActivity ORDER BY rowid DESC LIMIT 10",
  "ReplaceUserId": true
}
```
*Note: Setting `ReplaceUserId` to `true` automatically maps the raw `UserId` GUID to the readable `UserName`.*

**Example Response:**
```json
{
  "colums": [
    "rowid", "DateCreated", "UserName", "ItemId", "ItemType", "ItemName", "PlaybackMethod", "ClientName", "DeviceName", "PlayDuration"
  ],
  "results": [
    [
      "1613", 
      "2026-04-09 12:03:02.593047", 
      "marcus", 
      "60571d...", 
      "Audio", 
      "girl in red - You Stupid Bitch", 
      "DirectPlay", 
      "Jellyfin Web", 
      "Firefox", 
      "163"
    ]
  ],
  "message": ""
}
```