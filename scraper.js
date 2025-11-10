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
    const TOTAL_RESULTS = 80;
    const DELAY_MS = 2000; // 2 second delay between requests
    
    let nextPageToken = null;
    let totalFetched = 0;
    let pageCount = 0;
    
    while (totalFetched < TOTAL_RESULTS) {
      pageCount++;
      console.log(`Fetching page ${pageCount}...`);
      
      try {
        const params = {
          engine: 'google_jobs',
          q: 'product designer design system remote',
          api_key: process.env.SERPAPI_KEY
        };
        
        // Add next_page_token if we have one (for pagination)
        if (nextPageToken) {
          params.next_page_token = nextPageToken;
        }
        
        const response = await getJson(params);
        
        if (response.jobs_results && response.jobs_results.length > 0) {
          const jobsToAdd = response.jobs_results.slice(0, TOTAL_RESULTS - totalFetched);
          allJobs.push(...jobsToAdd);
          totalFetched += jobsToAdd.length;
          console.log(`Fetched ${jobsToAdd.length} jobs (total: ${totalFetched})`);
        }
        
        // Check if there's a next page
        if (response.serpapi_pagination && response.serpapi_pagination.next_page_token) {
          nextPageToken = response.serpapi_pagination.next_page_token;
          
          // Add delay before next request if we're continuing
          if (totalFetched < TOTAL_RESULTS) {
            console.log(`Waiting ${DELAY_MS}ms before next request...`);
            await delay(DELAY_MS);
          }
        } else {
          // No more pages available
          console.log('No more pages available');
          break;
        }
        
      } catch (error) {
        console.error(`Error fetching page ${pageCount}:`, error.message);
        console.error('Full error:', error);
        // Break on error since we can't continue pagination
        break;
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
