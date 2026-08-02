const fs = require('fs');
const path = require('path');

const brainDir = `C:\\Users\\hp\\.gemini\\antigravity\\brain\\e1306b7e-a6fa-46d1-bda3-7e022380ac04`;
const targetDir = path.join(__dirname, '../frontend/images');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(brainDir);

const mappings = {
  'sovereign_ring': 'sovereign-ring.jpg',
  'celestial_pendant': 'celestial-pendant.jpg',
  'aura_cuff': 'aura-cuff.jpg',
  'elysian_earrings': 'elysian-earrings.jpg',
  'custom_atelier': 'custom-atelier.jpg'
};

for (const [key, targetName] of Object.entries(mappings)) {
  const match = files.find(f => f.startsWith(key) && f.endsWith('.png'));
  if (match) {
    const srcPath = path.join(brainDir, match);
    const destPath = path.join(targetDir, targetName);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${match} -> ${targetName}`);
  }
}

// Copy sovereign-ring as heritage-ring if heritage-ring not separately generated
const heritageDest = path.join(targetDir, 'heritage-ring.jpg');
const sovereignDest = path.join(targetDir, 'sovereign-ring.jpg');
if (fs.existsSync(sovereignDest) && !fs.existsSync(heritageDest)) {
  fs.copyFileSync(sovereignDest, heritageDest);
  console.log(`Copied sovereign-ring.jpg -> heritage-ring.jpg`);
}
