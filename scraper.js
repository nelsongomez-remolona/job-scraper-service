const { getJson } = require('serpapi');
const { getExistingJobs, appendNewJobs } = require('./sheets');

// Utility function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runJobScraper() {
  try {
    console.log('Starting job scraper...');
    
    // Step 1: Get existing jobs from Google Sheets
    console.log('Fetching existing jobs from Google Sheet...');
    const existingJobs = await getExistingJobs();
    console.log(`Found ${existingJobs.length} existing jobs in spreadsheet`);
    
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
    
    // Step 3: Filter out jobs with "no AI" policy and duplicates
    const filteredJobs = allJobs.filter(job => {
      const description = (job.description || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      
      // Check for "no AI" mentions
      const hasNoAIPolicy = description.includes('no ai') || 
                           description.includes('no artificial intelligence') ||
                           title.includes('no ai');
      
      return !hasNoAIPolicy;
    });
    
    // Step 4: Compare against existing jobs and find unique ones
    const newJobs = filteredJobs.filter(scrapedJob => {
      const companyTitle = `${scrapedJob.company_name}|${scrapedJob.title}`.toLowerCase();
      const jobUrl = scrapedJob.share_url || scrapedJob.related_links?.[0]?.link || '';
      
      // Check if this job already exists (by company+title or URL)
      const isDuplicate = existingJobs.some(existingJob => {
        const existingCompanyTitle = `${existingJob.company}|${existingJob.title}`.toLowerCase();
        const existingUrl = existingJob.url;
        
        return (companyTitle === existingCompanyTitle) || 
               (jobUrl && existingUrl && jobUrl === existingUrl);
      });
      
      return !isDuplicate;
    });
    
    console.log(`New unique jobs found: ${newJobs.length}`);
    
    // Step 5: Format jobs with timestamp and prepare for insertion
    const formattedJobs = newJobs.map(job => ({
      timestamp: new Date().toISOString(),
      title: job.title,
      company: job.company_name,
      location: job.location,
      url: job.apply_options?.[0]?.link || job.share_url || job.related_links?.[0]?.link || '',
      source: job.via || 'Unknown',
      postedAt: job.detected_extensions?.posted_at || '',
      status: 'review_required'
    }));
    
    // Step 6: Append new jobs to Google Sheets
    if (formattedJobs.length > 0) {
      console.log(`Adding ${formattedJobs.length} new jobs to spreadsheet...`);
      await appendNewJobs(formattedJobs);
      console.log('Jobs added successfully!');
    } else {
      console.log('No new jobs to add');
    }
    
    console.log('Job scraper completed successfully');
    
    return {
      success: true,
      totalScraped: allJobs.length,
      newJobsAdded: formattedJobs.length
    };
    
  } catch (error) {
    console.error('Error running job scraper:', error);
    throw error;
  }
}

module.exports = { runJobScraper };
