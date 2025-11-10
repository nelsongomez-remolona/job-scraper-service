import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { runJobScraper } from './services/scraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Job Scraper Service Running',
    endpoints: {
      manual_trigger: '/api/scrape',
      health: '/'
    },
    schedule: 'Monday, Wednesday, Friday at 8:00 AM'
  });
});

// Manual trigger endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('Manual scrape triggered at:', new Date().toISOString());
    
    // Run async without blocking response
    runJobScraper()
      .then(result => {
        console.log('Scrape completed:', result);
      })
      .catch(error => {
        console.error('Scrape error:', error);
      });
    
    res.json({ 
      status: 'started',
      message: 'Job scraper initiated. Check logs for progress.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({ error: 'Failed to start scraper', details: error.message });
  }
});

// Schedule for Monday, Wednesday, Friday at 8:00 AM (using server timezone)
// Format: minute hour day month day-of-week
// This runs at 8:00 AM on Mon(1), Wed(3), Fri(5)
cron.schedule('0 8 * * 1,3,5', async () => {
  console.log('Scheduled scrape triggered at:', new Date().toISOString());
  try {
    const result = await runJobScraper();
    console.log('Scheduled scrape completed:', result);
  } catch (error) {
    console.error('Scheduled scrape error:', error);
  }
}, {
  timezone: process.env.TIMEZONE || "America/New_York"
});

app.listen(PORT, () => {
  console.log(`Job Scraper Service running on port ${PORT}`);
  console.log(`Scheduled runs: Monday, Wednesday, Friday at 8:00 AM (${process.env.TIMEZONE || "America/New_York"})`);
  console.log(`Manual trigger: POST to /api/scrape`);
});
