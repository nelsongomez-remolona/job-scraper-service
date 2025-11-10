// Server entry point for Railway deployment
// Copy this entire file to your Railway deployment as index.js

// Add error handling for uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting job scraper service...');
console.log('📝 Node version:', process.version);
console.log('📁 Current directory:', __dirname);

const express = require('express');

console.log('✅ Express loaded');

// Try to load scraper
let runJobScraper, runGeneralJobScraper;
try {
  const scraperModule = require('./scraper');
  runJobScraper = scraperModule.runJobScraper;
  runGeneralJobScraper = scraperModule.runGeneralJobScraper;
  console.log('✅ Scraper module loaded');
} catch (error) {
  console.error('❌ Failed to load scraper module:', error.message);
  console.error(error.stack);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

console.log('✅ Express app created');

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Existing endpoint: Filtered scraper (Greenhouse, Lever, Ashby, LinkedIn only)
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('Starting filtered job scraper...');
    const result = await runJobScraper();
    res.json(result);
  } catch (error) {
    console.error('Error in /api/scrape:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// NEW endpoint: General scraper (all job sources - wider pool)
app.post('/api/scrape/general', async (req, res) => {
  try {
    console.log('Starting GENERAL job scraper (no job board restrictions)...');
    const result = await runGeneralJobScraper();
    res.json(result);
  } catch (error) {
    console.error('Error in /api/scrape/general:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Job scraper service running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(`  POST /api/scrape - Filtered scraper (Greenhouse, Lever, Ashby, LinkedIn)`);
  console.log(`  POST /api/scrape/general - General scraper (all sources, wider pool)`);
  console.log(`  GET /health - Health check`);
});
