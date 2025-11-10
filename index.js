// ULTRA-MINIMAL test version - if this doesn't log, Railway has a bigger problem
console.log('========================================');
console.log('🚀 STARTUP: Node is running!');
console.log('========================================');

// Force flush stdout
process.stdout.write('STDOUT: Process starting...\n');
process.stderr.write('STDERR: Process starting...\n');

// Add error handling FIRST
process.on('uncaughtException', (error) => {
  console.error('========================================');
  console.error('❌ UNCAUGHT EXCEPTION:');
  console.error(error);
  console.error('========================================');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('========================================');
  console.error('❌ UNHANDLED REJECTION:');
  console.error(reason);
  console.error('========================================');
  process.exit(1);
});

console.log('Loading express...');
const express = require('express');
console.log('✅ Express loaded');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check called');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({ 
    message: 'Server is working!',
    env: {
      hasSerpApi: !!process.env.SERPAPI_KEY,
      hasSpreadsheetId: !!process.env.SPREADSHEET_ID,
      hasGoogleCreds: !!process.env.GOOGLE_CREDENTIALS
    }
  });
});

// Test scraper module loading
app.get('/test-scraper', (req, res) => {
  try {
    console.log('Testing scraper module load...');
    const scraperModule = require('./scraper');
    console.log('✅ Scraper module loaded!');
    console.log('Available exports:', Object.keys(scraperModule));
    res.json({
      success: true,
      exports: Object.keys(scraperModule),
      hasRunJobScraper: !!scraperModule.runJobScraper,
      hasRunGeneralJobScraper: !!scraperModule.runGeneralJobScraper
    });
  } catch (error) {
    console.error('❌ Failed to load scraper module:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

console.log('Starting server...');
app.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /test');
  console.log('  GET  /test-scraper');
  console.log('  POST /api/scrape');
  console.log('  POST /api/scrape/general');
  console.log('========================================');
});
