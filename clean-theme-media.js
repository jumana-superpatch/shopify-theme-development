const fs = require('fs');
const path = require('path');

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

  // Replace Shopify-hosted media URLs and shopify: links with empty string
  content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    log(`Cleaned: ${file}`);
  }
}

// Walk the theme directory and clean media links
walk(THEME_DIR, cleanMediaLinks);
