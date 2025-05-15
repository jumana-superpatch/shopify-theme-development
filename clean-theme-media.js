const fs = require('fs');
const path = require('path');

const THEME_DIR = './'; // or your theme root

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

  // Replace shopify hosted links or empty "shopify:" with ""
  content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Cleaned: ${file}`);
  }
}

walk(THEME_DIR, cleanMediaLinks);
