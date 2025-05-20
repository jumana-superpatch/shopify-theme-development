const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const THEME_DIR = './';
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

    content = content.replace(/"(https:\/\/cdn\.shopify\.com[^"]+|shopify:[^"]+|shopify:)"/g, '""');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf-8');
      updatedFiles.push(file);
      log(`Cleaned media in: ${file}`);
    }
  } catch (err) {
    log(`Error processing file ${file}: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
}

// Enhanced Git changes logger
function logGitChanges() {
  try {
    // Get staged changes
    const staged = execSync('git diff --staged --name-status', { 
      cwd: process.cwd(), 
      encoding: 'utf-8' 
    }).split('\n').filter(Boolean);

    // Get unstaged changes
    const unstaged = execSync('git diff --name-status', { 
      cwd: process.cwd(), 
      encoding: 'utf-8' 
    }).split('\n').filter(Boolean);

    // Format output
    let output = [];
    
    if (staged.length > 0) {
      output.push('# Staged changes (to be committed):');
      output.push(...staged.map(line => `  ${line.replace(/\t/g, ' → ')}`));
    }

    if (unstaged.length > 0) {
      output.push('# Unstaged changes (not committed yet):');
      output.push(...unstaged.map(line => `  ${line.replace(/\t/g, ' → ')}`));
    }

    if (output.length > 0) {
      log('Current Git Changes:\n' + output.join('\n'));
    } else {
      log('No uncommitted changes detected.');
    }

  } catch (err) {
    log(`Error detecting Git changes: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
}

// Main execution
(function main() {
  try {
    log('--- Starting theme media cleanup ---');
    
    // 1. Show existing changes BEFORE cleanup
    logGitChanges();
    
    // 2. Perform cleanup
    walk(THEME_DIR, cleanMediaLinks);

    // 3. Show changes AFTER cleanup
    if (updatedFiles.length > 0) {
      log(`\nSummary of updated files:\n${updatedFiles.map(f => `  - ${f}`).join('\n')}\n`);
      logGitChanges(); // Show new changes from cleanup
    } else {
      log('No files were updated during cleanup.\n');
    }

    log('--- Cleanup complete ---\n');
  } catch (err) {
    log(`Fatal error: ${err.message}\nError code: ${err.code}\nStack trace:\n${err.stack}`);
  }
})();
