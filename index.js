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

// CORS Support - allows frontend to call this API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

// ========================================
// NEW: API Search Endpoint (for comparison tool)
// ========================================
app.post('/api/search', async (req, res) => {
  try {
    console.log('=== /api/search endpoint called ===');
    console.log('Request body:', req.body);
    
    const { what, where, limit = 20 } = req.body;
    
    if (!what || !where) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: what, where'
      });
    }
    
    console.log(`Searching for: "${what}" in "${where}" (limit: ${limit})`);
    
    const { getJson } = require('serpapi');
    
    const query = `${what} (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:linkedin.com/jobs)`;
    
    const params = {
      engine: 'google',
      q: query,
      api_key: process.env.SERPAPI_KEY,
      tbs: 'qdr:m',
      num: Math.min(limit, 100),
      hl: 'en',
      gl: 'us',
      device: 'desktop'
    };
    
    console.log('Calling SerpAPI...');
    const response = await getJson(params);
    console.log(`Got ${response.organic_results?.length || 0} results from SerpAPI`);
    
    const jobs = (response.organic_results || []).map((job) => {
      const link = job.link || '';
      
      let company = 'Unknown';
      let source = 'Unknown';
      
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
        source = 'Greenhouse';
      }
      
      const leverMatch = link.match(/jobs\.lever\.co\/([^\/]+)/);
      if (leverMatch) {
        company = leverMatch[1];
        source = 'Lever';
      }
      
      const ashbyMatch = link.match(/jobs\.ashbyhq\.com\/([^\/]+)/);
      if (ashbyMatch) {
        company = ashbyMatch[1];
        source = 'Ashby';
      }
      
      const linkedInMatch = link.match(/linkedin\.com\/jobs\/view/);
      if (linkedInMatch) {
        const titleMatch = job.title.match(/at (.+?)(?:\s*\||$)/i);
        if (titleMatch) {
          company = titleMatch[1].trim();
        }
        source = 'LinkedIn';
      }
      
      return {
        id: job.position || Math.random().toString(36).substr(2, 9),
        title: job.title || 'Untitled',
        company: company,
        location: where,
        description: job.snippet || '',
        url: link,
        source: source,
        postedDate: job.date || null,
      };
    });
    
    console.log(`Processed ${jobs.length} jobs`);
    
    res.json({
      success: true,
      count: jobs.length,
      total: response.search_information?.total_results || jobs.length,
      jobs: jobs
    });
    
  } catch (error) {
    console.error('❌ Error in /api/search:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Scraper endpoints - load modules only when called
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('=== /api/scrape endpoint called ===');
    console.log('Loading scraper module...');
    const scraperModule = require('./scraper');
    console.log('Scraper module loaded successfully');
    console.log('Available exports:', Object.keys(scraperModule));
    
    if (!scraperModule.runJobScraper) {
      throw new Error('runJobScraper function not found in scraper module!');
    }
    
    console.log('Executing runJobScraper...');
    const result = await scraperModule.runJobScraper();
    console.log('Scraper completed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/scrape:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

app.post('/api/scrape/general', async (req, res) => {
  try {
    console.log('=== /api/scrape/general endpoint called ===');
    console.log('Loading scraper module...');
    const scraperModule = require('./scraper');
    console.log('Scraper module loaded successfully');
    console.log('Available exports:', Object.keys(scraperModule));
    
    if (!scraperModule.runGeneralJobScraper) {
      throw new Error('runGeneralJobScraper function not found in scraper module!');
    }
    
    console.log('Executing runGeneralJobScraper...');
    const result = await scraperModule.runGeneralJobScraper();
    console.log('General scraper completed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/scrape/general:', error.message);
    console.error('Stack trace:', error.stack);
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
  console.log('  POST /api/search ✨ NEW - Comparison Tool');
  console.log('  POST /api/scrape');
  console.log('  POST /api/scrape/general');
  console.log('========================================');
});
