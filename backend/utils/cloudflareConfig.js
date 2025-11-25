const fs = require('fs');
const path = require('path');

/**
 * Load Cloudflare URLs from .env.cloudflare file in project root
 * Returns null if file doesn't exist or environment is 'local'
 */
function getCloudflareConfig() {
  const env = process.env.NODE_ENV || 'local';
  
  // Local environment doesn't use Cloudflare
  if (env === 'local') {
    return null;
  }
  
  // Look for .env.cloudflare in project root (one level up from backend)
  const cloudflareEnvPath = path.join(__dirname, '..', '..', '.env.cloudflare');
  
  if (!fs.existsSync(cloudflareEnvPath)) {
    console.warn('⚠️  .env.cloudflare file not found. Cloudflare URLs will not be available.');
    return null;
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
  // Support both camelCase and lowercase variants
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
    console.warn(`   Looking for: development_Backend, development_frontend (or production_*)`);
    return null;
  }
  
  console.log(`✅ Loaded Cloudflare URLs for ${env}:`);
  console.log(`   Backend: ${backendUrl}`);
  console.log(`   Frontend: ${frontendUrl}`);
  
  return {
    backend: backendUrl.replace(/\/$/, ''), // Remove trailing slash
    frontend: frontendUrl.replace(/\/$/, '')
  };
}

module.exports = { getCloudflareConfig };

