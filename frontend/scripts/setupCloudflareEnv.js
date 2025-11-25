const fs = require('fs');
const path = require('path');

/**
 * Read .env.cloudflare and create temporary .env file with Cloudflare URLs
 * This runs before React starts to inject Cloudflare URLs
 */
function setupCloudflareEnv() {
  // Get environment from command line or default to local
  const env = process.env.NODE_ENV || 'local';
  
  console.log(`🔧 Setting up environment: ${env}`);
  
  // Local environment doesn't use Cloudflare - use localhost
  if (env === 'local') {
    const localEnv = {
      REACT_APP_API_URL: 'http://localhost:5010/api',
      REACT_APP_SOCKET_URL: 'http://localhost:5010',
      PORT: '3010'
    };
    writeEnvFile(localEnv);
    return;
  }
  
  // Look for .env.cloudflare in project root
  const cloudflareEnvPath = path.join(__dirname, '..', '..', '.env.cloudflare');
  
  if (!fs.existsSync(cloudflareEnvPath)) {
    console.warn('⚠️  .env.cloudflare file not found. Using localhost URLs.');
    const defaultEnv = env === 'development' 
      ? { REACT_APP_API_URL: 'http://localhost:5020/api', REACT_APP_SOCKET_URL: 'http://localhost:5020', PORT: '3020' }
      : { REACT_APP_API_URL: 'http://localhost:5030/api', REACT_APP_SOCKET_URL: 'http://localhost:5030', PORT: '3030' };
    writeEnvFile(defaultEnv);
    return;
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
    console.warn(`   Using localhost URLs as fallback`);
    const fallbackEnv = env === 'development'
      ? { REACT_APP_API_URL: 'http://localhost:5020/api', REACT_APP_SOCKET_URL: 'http://localhost:5020', PORT: '3020' }
      : { REACT_APP_API_URL: 'http://localhost:5030/api', REACT_APP_SOCKET_URL: 'http://localhost:5030', PORT: '3030' };
    writeEnvFile(fallbackEnv);
    return;
  }
  
  console.log(`✅ Loaded Cloudflare URLs for ${env}:`);
  console.log(`   Backend: ${backendUrl}`);
  console.log(`   Frontend: ${frontendUrl}`);
  
  // Write to temporary .env file for React to read
  const envVars = {
    REACT_APP_API_URL: `${backendUrl}/api`,
    REACT_APP_SOCKET_URL: backendUrl,
    PORT: env === 'development' ? '3020' : '3030'
  };
  
  writeEnvFile(envVars);
}

function writeEnvFile(envVars) {
  const envPath = path.join(__dirname, '..', '.env.cloudflare.tmp');
  let content = '# Auto-generated from .env.cloudflare - DO NOT EDIT MANUALLY\n';
  content += '# This file is regenerated on each start\n\n';
  
  Object.entries(envVars).forEach(([key, value]) => {
    content += `${key}=${value}\n`;
  });
  
  fs.writeFileSync(envPath, content);
  console.log(`📝 Created ${envPath}`);
}

// Run if called directly
if (require.main === module) {
  setupCloudflareEnv();
}

module.exports = { setupCloudflareEnv };

