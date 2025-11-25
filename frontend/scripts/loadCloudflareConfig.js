const fs = require('fs');
const path = require('path');

/**
 * Load Cloudflare URLs from .env.cloudflare file in project root
 * This script is used at build time to inject Cloudflare URLs into React environment
 */
function loadCloudflareConfig() {
  const env = process.env.NODE_ENV || 'local';
  
  // Local environment doesn't use Cloudflare
  if (env === 'local') {
    return {};
  }
  
  // Look for .env.cloudflare in project root (two levels up from frontend/scripts)
  const cloudflareEnvPath = path.join(__dirname, '..', '..', '.env.cloudflare');
  
  if (!fs.existsSync(cloudflareEnvPath)) {
    console.warn('⚠️  .env.cloudflare file not found. Using localhost URLs.');
    return {};
  }
  
  // Read and parse .env.cloudflare file
  const envContent = fs.readFileSync(cloudflareEnvPath, 'utf8');
  const config = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const keyName = key.trim();
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        config[keyName] = value;
      }
    }
  });
  
  // Get the appropriate URLs based on environment
  let backendUrl = null;
  let frontendUrl = null;
  
  if (env === 'development') {
    backendUrl = config.development_Backend || config.development_backend || config.DEVELOPMENT_BACKEND;
    frontendUrl = config.development_frontend || config.development_Frontend || config.DEVELOPMENT_FRONTEND;
  } else if (env === 'production') {
    backendUrl = config.production_Backend || config.production_backend || config.PRODUCTION_BACKEND;
    frontendUrl = config.production_frontend || config.production_Frontend || config.PRODUCTION_FRONTEND;
  }
  
  if (!backendUrl || !frontendUrl) {
    console.warn(`⚠️  Cloudflare URLs not found for ${env} environment in .env.cloudflare`);
    return {};
  }
  
  return {
    REACT_APP_API_URL: `${backendUrl}/api`,
    REACT_APP_SOCKET_URL: backendUrl
  };
}

module.exports = { loadCloudflareConfig };

