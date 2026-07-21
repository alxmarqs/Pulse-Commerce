const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function startSshTunnel(port, name, urlFile) {
  const filePath = path.join(__dirname, urlFile);
  console.log(`Starting ${name} SSH tunnel on port ${port}...`);
  
  // Clean up any old URL file
  try { fs.unlinkSync(filePath); } catch (e) {}

  const child = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-R', `80:127.0.0.1:${port}`,
    'nokey@localhost.run'
  ]);
  
  let urlSent = false;
  
  child.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Look for URL in the output, e.g. "https://xxxx.lhr.life"
    const match = output.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match && !urlSent) {
      const url = match[0];
      console.log(`${name} Tunnel URL: ${url}`);
      fs.writeFileSync(filePath, url, 'utf8');
      urlSent = true;
    }
  });
  
  child.stderr.on('data', (data) => {
    // Suppress verbose debug info, log errors if needed
    const msg = data.toString().trim();
    if (msg.includes('error') || msg.includes('Permission denied')) {
      console.error(`[${name} SSH Error]: ${msg}`);
    }
  });
  
  child.on('close', (code) => {
    console.log(`${name} SSH tunnel closed with code ${code}. Reconnecting in 5s...`);
    try { fs.unlinkSync(filePath); } catch (e) {}
    setTimeout(() => startSshTunnel(port, name, urlFile), 5000);
  });
}

// Initialize SSH tunnels
startSshTunnel(3000, 'Store', 'store_url.txt');
startSshTunnel(8501, 'Admin', 'admin_url.txt');
