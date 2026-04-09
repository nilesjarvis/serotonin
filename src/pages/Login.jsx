import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticate } from '../lib/api';
import { Activity } from 'lucide-react';

export default function Login() {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authenticate(url, username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials and server URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-none p-8 shadow-2xl border border-neutral-800">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-none flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter uppercase">serotonin</h1>
          <p className="text-neutral-400 mt-2 text-sm text-center font-medium">
            Connect to Jellyfin Playback Reporting
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Server URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.100:8096"
              className="w-full bg-black border border-neutral-800 rounded-none px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Admin Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin"
              className="w-full bg-black border border-neutral-800 rounded-none px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black border border-neutral-800 rounded-none px-4 py-3 text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-900 text-red-500 p-3 rounded-none text-sm text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-sm py-4 rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]"
          >
            {loading ? 'Connecting...' : 'Connect to Jellyfin'}
          </button>
        </form>
      </div>
    </div>
  );
}