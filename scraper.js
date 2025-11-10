const { getJson } = require('serpapi');
const { getExistingJobs, appendNewJobs } = require('./sheets');

// Delay helper function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Filter out "no AI" jobs
function containsNoAI(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const noAIPatterns = [
    'no ai',
    'no a.i',
    'no-ai',
    'no artificial intelligence',
    'without ai',
    'ai-free'
  ];
  return noAIPatterns.some(pattern => text.includes(pattern));
}

// Main scraper function
async function runJobScraper() {
  console.log('Starting job scraper...');
  
  try {
    // Step 1: Get existing jobs from spreadsheet
    console.log('Fetching existing jobs from Google Sheet...');
    const existingJobs = await getExistingJobs();
    console.log(`Found ${existingJobs.length} existing jobs in spreadsheet`);
    
    // Create lookup sets for duplicate detection
    const existingUrls = new Set(existingJobs.map(job => job.url));
    const existingCompanyTitles = new Set(
      existingJobs.map(job => `${job.company}||${job.title}`.toLowerCase())
    );
    
    // Step 2: Scrape jobs from SerpAPI
    const allJobs = [];
    const RESULTS_PER_PAGE = 50; // SerpAPI max per request
    const TOTAL_RESULTS = 80;
    const DELAY_MS = 2000; // 2 second delay between requests
    
    for (let start = 0; start < TOTAL_RESULTS; start += RESULTS_PER_PAGE) {
      console.log(`Fetching batch starting at ${start}...`);
      
      try {
        const response = await getJson({
          engine: 'google_jobs',
          q: 'product designer design system remote',
          api_key: process.env.SERPAPI_KEY,
          start: start,
          num: Math.min(RESULTS_PER_PAGE, TOTAL_RESULTS - start)
        });
        
        if (response.jobs_results && response.jobs_results.length > 0) {
          allJobs.push(...response.jobs_results);
          console.log(`Fetched ${response.jobs_results.length} jobs`);
        }
        
        // Add delay between requests (except for the last one)
        if (start + RESULTS_PER_PAGE < TOTAL_RESULTS) {
          console.log(`Waiting ${DELAY_MS}ms before next request...`);
          await delay(DELAY_MS);
        }
      } catch (error) {
        console.error(`Error fetching batch at ${start}:`, error.message);
        // Continue with next batch even if one fails
      }
    }
    
    console.log(`Total jobs fetched: ${allJobs.length}`);
    
    // Step 3: Filter and deduplicate
    const newJobs = [];
    
    for (const job of allJobs) {
      const title = job.title || '';
      const company = job.company_name || '';
      const description = job.description || '';
      const url = job.share_url || job.apply_link || '';
      const location = job.location || '';
      const detectedExtensions = job.detected_extensions || {};
      const postedAt = detectedExtensions.posted_at || '';
      const scheduleType = detectedExtensions.schedule_type || '';
      
      // Skip if no URL
      if (!url) {
        continue;
      }
      
      // Skip if contains "no AI"
      if (containsNoAI(title, description)) {
        console.log(`Filtered out (no AI): ${title} at ${company}`);
        continue;
      }
      
      // Skip if duplicate URL
      if (existingUrls.has(url)) {
        continue;
      }
      
      // Skip if duplicate company+title combination
      const companyTitleKey = `${company}||${title}`.toLowerCase();
      if (existingCompanyTitles.has(companyTitleKey)) {
        continue;
      }
      
      // Add to new jobs
      newJobs.push({
        title,
        company,
        location,
        url,
        postedAt,
        scheduleType,
        scrapedAt: new Date().toISOString()
      });
      
      // Update lookup sets
      existingUrls.add(url);
      existingCompanyTitles.add(companyTitleKey);
    }
    
    console.log(`New unique jobs found: ${newJobs.length}`);
    
    // Step 4: Append new jobs to spreadsheet
    if (newJobs.length > 0) {
      console.log('Appending new jobs to spreadsheet...');
      await appendNewJobs(newJobs);
      console.log('Successfully added new jobs to spreadsheet');
    } else {
      console.log('No new jobs to add');
    }
    
    console.log('Job scraper completed successfully');
    return {
      totalFetched: allJobs.length,
      newJobsAdded: newJobs.length
    };
    
  } catch (error) {
    console.error('Error in job scraper:', error);
    throw error;
  }
}

module.exports = { runJobScraper };
