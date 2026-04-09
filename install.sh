#!/bin/bash
set -e

echo "==============================================="
echo "  serotonin - automated deployment script"
echo "==============================================="

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root or with sudo."
  echo "Usage: sudo ./install.sh"
  exit 1
fi

# Check for npm and node
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm could not be found. Please install Node.js and npm first."
    exit 1
fi

echo "=> Installing project dependencies..."
# Clean install to prevent native binding issues across different architectures
rm -rf node_modules package-lock.json
npm cache clean --force || true
npm install

echo "=> Building the application..."
npm run build

echo "=> Installing Nginx..."
if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y nginx
else
    echo "⚠️  Warning: apt-get not found. Ensure Nginx is installed via your package manager."
fi

echo "=> Moving built files to /var/www/serotonin..."
mkdir -p /var/www/serotonin
# Remove old dist if it exists
rm -rf /var/www/serotonin/dist
cp -r dist /var/www/serotonin/
chown -R www-data:www-data /var/www/serotonin

echo "=> Configuring Nginx..."
cat > /etc/nginx/sites-available/serotonin << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/serotonin/dist;
    index index.html;

    # Gzip compression for faster loading
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        # This is strictly required for React Router to handle dynamic paths on a static server
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/serotonin /etc/nginx/sites-enabled/

# Remove default site if it exists to avoid port 80 conflicts
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

echo "=> Testing Nginx configuration..."
nginx -t

echo "=> Restarting Nginx service..."
systemctl restart nginx
systemctl enable nginx

# Attempt to grab the primary local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "==============================================="
echo "  🚀 Deployment Successful! "
echo "  serotonin is now live on your local network."
echo "  Access it at: http://$LOCAL_IP"
echo "==============================================="
