const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const THEME_DIR = './'; // Root of the theme directory
const LOG_FILE = path.join(__dirname, 'deploy-log.txt');
const updatedFiles = [];

// Log utility
function log(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, fullMessage);
  console.log(fullMessage);
}

// Recursive walk function
function walk(dir, callback) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

// Clean media links in a file
function cleanMediaLinks(file) {
  if (!file.endsWith('.json') && !file.endsWith('.liquid')) return;

  try {
    let content = fs.readFileSync(file, 'utf-8');
    const original = content;

    // Replace hosted media URLs or `shopify:` references with empty string
    content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf-8');
      updatedFiles.push(file);
      log(`Cleaned media in: ${file}`);
    }
  } catch (err) {
    log(`Error processing file ${file}: ${err.message}`);
  }
}

// Log Git-changed files before push
function logGitChanges() {
  try {
    const output = execSync('git status --porcelain', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    });

    const changedFiles = output
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const match = line.match(/^[A-Z\?\s]{2}\s+(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (changedFiles.length > 0) {
      log(`Changed files before push:\n${changedFiles.map(f => `  - ${f}`).join('\n')}`);
    } else {
      log('No changed files to log.');
    }
  } catch (err) {
    log(`Error detecting changed files: ${err.message}`);
  }
}

// Main execution
(function main() {
  try {
    log('--- Starting theme media cleanup ---');
    walk(THEME_DIR, cleanMediaLinks);

    if (updatedFiles.length > 0) {
      log(`\nSummary of updated files:\n${updatedFiles.map(f => `  - ${f}`).join('\n')}\n`);
    } else {
      log('No files were updated during cleanup.\n');
    }

    logGitChanges();
    log('--- Cleanup complete ---\n');
  } catch (err) {
    log(`Fatal error: ${err.message}`);
  }
})();
