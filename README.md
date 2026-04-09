# serotonin

serotonin is a fast, sleek, dark-mode dashboard for the [Jellyfin Playback Reporting](https://github.com/jellyfin/jellyfin-plugin-playbackreporting) plugin. 

Built with React, Vite, and Tailwind CSS, it visualizes your Jellyfin server's raw playback logs into gorgeous graphs, deep user profiles, and comprehensive lifetime leaderboards. 

![serotonin preview placeholder](https://raw.githubusercontent.com/jellyfin/jellyfin-plugin-playbackreporting/master/images/preview.png)

## Features

- **Global Dashboard**: Track a 30-day rolling activity graph alongside an all-time user leaderboard and quick snippets of your most popular movies and shows.
- **Library Drilldowns**: Dedicated views for Movies, Shows, Music, and Music Videos. 
- **Intelligent Grouping**: Automatically groups individual song streams into parent Albums, and individual episodes into TV Shows, seamlessly pulling the correct parent cover art.
- **Top Artists**: Specifically parses music listening habits to extract and rank your absolute top Artists.
- **Client Breakdown**: See exactly what devices (Jellyfin Web, iOS, Feishin, Manet, Roku, etc.) are being used globally and per library type.
- **Deep User Profiles**: Click on any user to view their lifetime stats, their personal 30-day watch graph, a GitHub-style 365-day activity heatmap, and a timeline of their last 50 watched items.
- **Data Hardening**: Automatically detects and caps bugged third-party clients (like some music players that track paused playback time infinitely) to 24-hours per day, keeping your charts accurate.

---

## Prerequisites

1. You must have a **Jellyfin Server** running.
2. You must have the [**Playback Reporting** plugin installed](https://github.com/jellyfin/jellyfin-plugin-playbackreporting) and enabled on your Jellyfin server.
3. You need a Jellyfin **Admin Account** username and password to authenticate.
4. **CORS must be enabled** in your Jellyfin networking settings. (Dashboard > Networking > Enable cross-origin resource sharing).

## Running Locally

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.
5. Enter your Jellyfin server URL (e.g., `http://192.168.1.100:8096`), your admin username, and your password.

## Hosting on your Server (Automated Script)

If you are running serotonin directly on your Linux machine alongside Jellyfin (e.g. Debian, Ubuntu, Proxmox, Raspberry Pi), you can use the automated deployment script! 

This script will securely build the application, install the Nginx web server, properly handle React Router static file configuration, and launch it over your local network automatically on port 80.

```bash
# Navigate to the serotonin directory
cd serotonin

# Run the deployment script with sudo privileges
sudo ./install.sh
```

You can then view the dashboard from any device on your Wi-Fi by typing your server's local IP address into your browser (e.g., `http://192.168.1.100`).

## Building for Production (Manual)

If you want to host serotonin yourself statically (e.g., on Vercel, Netlify, or via Nginx):

```bash
npm run build
```
This will compile the application into a highly optimized bundle inside the `dist` directory. You can host this folder anywhere.

## How it works

Jellyfin's Playback Reporting plugin exposes a hidden API endpoint (`/user_usage_stats/submit_custom_query`) that allows for raw SQLite queries against its `PlaybackActivity` tracking database. 

serotonin bypasses the standard, limited plugin endpoints and directly executes highly optimized SQL queries to aggregate, rank, and group millions of seconds of raw watch-time data. It then cross-references the Item IDs it finds against Jellyfin's core Item Metadata API to fetch high-resolution cover art for Albums, Artists, and Series.

## Troubleshooting

- **"Authentication Failed / Network Error"**: Ensure you typed your server URL correctly (including the port `http://YOUR_IP:8096`).
- **"CORS Error" in browser console**: Your Jellyfin server is rejecting the connection from your browser. Go into your Jellyfin Admin Dashboard -> Networking -> check "Enable cross-origin resource sharing (CORS)" and restart the Jellyfin server.
- **"Cannot find native binding" during build**: This is a known npm bug with Tailwind CSS v4's Rust engine. Run `rm -rf node_modules package-lock.json && npm install` to force npm to download the correct native dependencies for your specific server's CPU architecture.
- **No data is showing up**: Make sure the Playback Reporting plugin is installed and that you have actually watched media since it was installed.

## Tech Stack
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Dark mode exclusively)
- **Charts**: [Chart.js](https://www.chartjs.org/) (`react-chartjs-2`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Parsing**: [date-fns](https://date-fns.org/)
