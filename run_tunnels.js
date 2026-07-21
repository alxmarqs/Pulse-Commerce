const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const projectDir = __dirname;

async function startTunnel(port, subdomain, name) {
  const filePath = path.join(projectDir, `${name.toLowerCase()}_url.txt`);
  try {
    console.log(`Starting ${name} tunnel on port ${port}...`);
    const tunnel = await localtunnel({ port, subdomain });
    
    console.log(`${name} URL: ${tunnel.url}`);
    fs.writeFileSync(filePath, tunnel.url, 'utf8');
    
    tunnel.on('close', () => {
      console.log(`${name} tunnel closed. Reconnecting in 5s...`);
      try { fs.unlinkSync(filePath); } catch (e) {}
      setTimeout(() => startTunnel(port, subdomain, name), 5000);
    });
    
    tunnel.on('error', (err) => {
      console.error(`${name} tunnel error:`, err);
    });
  } catch (err) {
    console.error(`Failed to start ${name} tunnel:`, err);
    try { fs.unlinkSync(filePath); } catch (e) {}
    setTimeout(() => startTunnel(port, subdomain, name), 5000);
  }
}

// Initialize tunnels
startTunnel(3000, 'pulse-store-alx', 'Store');
startTunnel(8501, 'pulse-admin-alx', 'Admin');
