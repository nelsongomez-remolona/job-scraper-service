const express = require('express');
const cron = require('node-cron');
const { runJobScraper } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TIMEZONE || 'America/Los_Angeles';

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'job-scraper-service',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Manual trigger endpoint
app.post('/api/scrape', async (req, res) => {
  // Immediately respond to avoid timeout
  res.json({
    status: 'started',
    message: 'Job scraper initiated. Check logs for progress.',
    timestamp: new Date().toISOString()
  });

  // Run scraper asynchronously
  try {
    await runJobScraper();
  } catch (error) {
    console.error('Error in manual scrape:', error);
  }
});

// Schedule cron job for Monday, Wednesday, Friday at 8am
// Cron format: minute hour day month day-of-week
// 0 8 * * 1,3,5 = 8:00 AM on Mon, Wed, Fri
const cronSchedule = '0 8 * * 1,3,5';

cron.schedule(cronSchedule, async () => {
  console.log('Cron job triggered:', new Date().toISOString());
  try {
    await runJobScraper();
  } catch (error) {
    console.error('Error in scheduled scrape:', error);
  }
}, {
  timezone: TIMEZONE
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Cron job scheduled for: ${cronSchedule} (${TIMEZONE})`);
  console.log(`Next scheduled runs: Monday, Wednesday, Friday at 8:00 AM`);
  console.log(`Manual trigger available at: POST /api/scrape`);
});
