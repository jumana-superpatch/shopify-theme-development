const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const THEME_DIR = './'; // root of the theme directory
const LOG_FILE = path.join(__dirname, 'deploy-log.txt');

function log(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, fullMessage);
  console.log(message);
}

function walk(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

function cleanMediaLinks(file) {
  if (!file.endsWith('.json') && !file.endsWith('.liquid')) return;

  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Replace Shopify-hosted media and shopify: references with empty string
  content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
  }
}

// 1. Run cleanup
walk(THEME_DIR, cleanMediaLinks);

// 2. Get Git-changed files and log them
try {
  const output = execSync('git status --porcelain', { encoding: 'utf-8' });
  const changedFiles = output
    .split('\n')
    .filter(Boolean)
    .map(line => line.trim().slice(3)); // skip status prefix like " M", "A ", etc.

  if (changedFiles.length > 0) {
    log(`Changed files before push:\n${changedFiles.map(f => `  - ${f}`).join('\n')}`);
  } else {
    log('No changed files to log.');
  }
} catch (err) {
  log(`Error detecting changed files: ${err.message}`);
}
