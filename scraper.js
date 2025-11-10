const { getJson } = require('serpapi');
const { getExistingJobs, appendNewJobs } = require('./sheets');

// Utility function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runJobScraper() {
  try {
    console.log('Starting job scraper (design system)...');
    
    // Step 1: Get existing jobs from Google Sheets
    console.log('Fetching existing jobs from Google Sheet...');
    const existingJobs = await getExistingJobs('company_boards');
    console.log(`Found ${existingJobs.length} existing jobs in spreadsheet`);
    
    // Step 2: Scrape jobs from SerpAPI using regular Google search
    const allJobs = [];
    const TOTAL_RESULTS = 150;
    const RESULTS_PER_PAGE = 50; // Max results per page
    const DELAY_MS = 2000; // 2 second delay between requests
    
    let startIndex = 0;
    let totalFetched = 0;
    let pageCount = 0;
    
    while (totalFetched < TOTAL_RESULTS) {
      pageCount++;
      console.log(`Fetching page ${pageCount} (starting at ${startIndex})...`);
      
      try {
        const params = {
          engine: 'google',
          q: 'product designer design system remote site:boards.greenhouse.io',
          api_key: process.env.SERPAPI_KEY,
          tbs: 'qdr:m', // Last month (will filter to 14 days in code)
          num: Math.min(RESULTS_PER_PAGE, TOTAL_RESULTS - totalFetched),
          start: startIndex,
          hl: 'en',
          gl: 'us',
          device: 'desktop'
        };
        
        const response = await getJson(params);
        
        if (response.organic_results && response.organic_results.length > 0) {
          allJobs.push(...response.organic_results);
          totalFetched += response.organic_results.length;
          console.log(`Fetched ${response.organic_results.length} results (total: ${totalFetched})`);
          
          // Check if there are more results
          if (response.organic_results.length < RESULTS_PER_PAGE || totalFetched >= TOTAL_RESULTS) {
            console.log('No more results available or limit reached');
            break;
          }
          
          // Update start index for next page
          startIndex += response.organic_results.length;
          
          // Add delay before next request
          console.log(`Waiting ${DELAY_MS}ms before next request...`);
          await delay(DELAY_MS);
          
        } else {
          console.log('No organic results found');
          break;
        }
        
      } catch (error) {
        console.error(`Error fetching page ${pageCount}:`, error.message);
        console.error('Full error:', error);
        break;
      }
    }
    
    console.log(`Total results fetched: ${allJobs.length}`);
    
    // Step 3: Filter for jobs posted within last 14 days, no AI policy, and Greenhouse only
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const filteredJobs = allJobs.filter(job => {
      const snippet = (job.snippet || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const link = (job.link || '').toLowerCase();
      
      // Check if URL is from greenhouse.io only
      const isGreenhouse = link.includes('greenhouse.io');
      
      // Check for "no AI" mentions
      const hasNoAIPolicy = snippet.includes('no ai') || 
                           snippet.includes('no artificial intelligence') ||
                           title.includes('no ai');
      
      // For date filtering, we rely on the tbs=qdr:m parameter
      // and assume results are recent enough (will filter to 14 days if date info available)
      let isRecent = true;
      
      // Try to extract date from snippet if available
      if (job.date) {
        // If there's a date field, parse it
        const jobDate = new Date(job.date);
        if (!isNaN(jobDate.getTime())) {
          isRecent = jobDate >= fourteenDaysAgo;
        }
      }
      
      const passed = isGreenhouse && !hasNoAIPolicy && isRecent;
      
      // Debug: Log first 5 results
      if (allJobs.indexOf(job) < 5) {
        console.log(`\n--- Result ${allJobs.indexOf(job) + 1}: ${job.title} ---`);
        console.log(`Link: ${link}`);
        console.log(`Snippet: ${snippet.substring(0, 100)}...`);
        console.log(`Is Greenhouse: ${isGreenhouse}`);
        console.log(`Passed filter: ${passed}`);
      }
      
      return passed;
    });
    
    console.log(`Jobs after filtering: ${filteredJobs.length}`);
    
    // Step 4: Compare against existing jobs and find unique ones
    const newJobs = filteredJobs.filter(scrapedJob => {
      // Extract company from Greenhouse URL (boards.greenhouse.io/company/jobs/...)
      const link = scrapedJob.link || '';
      let company = '';
      
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
      }
      
      const companyTitle = `${company}|${scrapedJob.title}`.toLowerCase();
      const jobUrl = scrapedJob.link || '';
      
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
    const formattedJobs = newJobs.map(job => {
      // Extract company from Greenhouse URL
      const link = job.link || '';
      let company = 'Unknown';
      
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
      }
      
      return {
        timestamp: new Date().toISOString(),
        title: job.title,
        company: company,
        location: 'Remote', // Default to remote since that's what we're searching for
        url: job.link,
        source: 'Greenhouse',
        postedAt: job.date || '',
        status: 'review_required'
      };
    });
    
    // Step 6: Append new jobs to Google Sheets
    if (formattedJobs.length > 0) {
      console.log(`Adding ${formattedJobs.length} new jobs to spreadsheet...`);
      await appendNewJobs(formattedJobs, 'company_boards');
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

// New scraper for general "product designer" search
async function runGeneralProductDesignerScraper() {
  try {
    console.log('Starting general product designer scraper...');
    
    // Step 1: Get existing jobs from Google Sheets (sheet_1)
    console.log('Fetching existing jobs from sheet_1...');
    const existingJobs = await getExistingJobs('sheet_1');
    console.log(`Found ${existingJobs.length} existing jobs in spreadsheet`);
    
    // Step 2: Scrape jobs from SerpAPI using regular Google search
    const allJobs = [];
    const TOTAL_RESULTS = 150;
    const RESULTS_PER_PAGE = 50; // Max results per page
    const DELAY_MS = 2000; // 2 second delay between requests
    
    let startIndex = 0;
    let totalFetched = 0;
    let pageCount = 0;
    
    while (totalFetched < TOTAL_RESULTS) {
      pageCount++;
      console.log(`Fetching page ${pageCount} (starting at ${startIndex})...`);
      
      try {
        const params = {
          engine: 'google',
          q: 'product designer remote site:boards.greenhouse.io',
          api_key: process.env.SERPAPI_KEY,
          tbs: 'qdr:m', // Last month
          num: Math.min(RESULTS_PER_PAGE, TOTAL_RESULTS - totalFetched),
          start: startIndex,
          hl: 'en',
          gl: 'us',
          device: 'desktop'
        };
        
        const response = await getJson(params);
        
        if (response.organic_results && response.organic_results.length > 0) {
          allJobs.push(...response.organic_results);
          totalFetched += response.organic_results.length;
          console.log(`Fetched ${response.organic_results.length} results (total: ${totalFetched})`);
          
          // Check if there are more results
          if (response.organic_results.length < RESULTS_PER_PAGE || totalFetched >= TOTAL_RESULTS) {
            console.log('No more results available or limit reached');
            break;
          }
          
          // Update start index for next page
          startIndex += response.organic_results.length;
          
          // Add delay before next request
          console.log(`Waiting ${DELAY_MS}ms before next request...`);
          await delay(DELAY_MS);
          
        } else {
          console.log('No organic results found');
          break;
        }
        
      } catch (error) {
        console.error(`Error fetching page ${pageCount}:`, error.message);
        console.error('Full error:', error);
        break;
      }
    }
    
    console.log(`Total results fetched: ${allJobs.length}`);
    
    // Step 3: Filter for jobs posted within last month, no AI policy, and Greenhouse only
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const filteredJobs = allJobs.filter(job => {
      const snippet = (job.snippet || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const link = (job.link || '').toLowerCase();
      
      // Check if URL is from greenhouse.io only
      const isGreenhouse = link.includes('greenhouse.io');
      
      // Check for "no AI" mentions
      const hasNoAIPolicy = snippet.includes('no ai') || 
                           snippet.includes('no artificial intelligence') ||
                           title.includes('no ai');
      
      // For date filtering, we rely on the tbs=qdr:m parameter (within last month)
      let isRecent = true;
      
      // Try to extract date from snippet if available
      if (job.date) {
        const jobDate = new Date(job.date);
        if (!isNaN(jobDate.getTime())) {
          isRecent = jobDate >= oneMonthAgo;
        }
      }
      
      const passed = isGreenhouse && !hasNoAIPolicy && isRecent;
      
      // Debug: Log first 5 results
      if (allJobs.indexOf(job) < 5) {
        console.log(`\n--- Result ${allJobs.indexOf(job) + 1}: ${job.title} ---`);
        console.log(`Link: ${link}`);
        console.log(`Snippet: ${snippet.substring(0, 100)}...`);
        console.log(`Is Greenhouse: ${isGreenhouse}`);
        console.log(`Passed filter: ${passed}`);
      }
      
      return passed;
    });
    
    console.log(`Jobs after filtering: ${filteredJobs.length}`);
    
    // Step 4: Compare against existing jobs and find unique ones
    const newJobs = filteredJobs.filter(scrapedJob => {
      const link = scrapedJob.link || '';
      let company = '';
      
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
      }
      
      const companyTitle = `${company}|${scrapedJob.title}`.toLowerCase();
      const jobUrl = scrapedJob.link || '';
      
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
    const formattedJobs = newJobs.map(job => {
      const link = job.link || '';
      let company = 'Unknown';
      
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
      }
      
      return {
        timestamp: new Date().toISOString(),
        title: job.title,
        company: company,
        location: 'Remote',
        url: job.link,
        source: 'Greenhouse',
        postedAt: job.date || '',
        status: 'review_required'
      };
    });
    
    // Step 6: Append new jobs to Google Sheets (sheet_1)
    if (formattedJobs.length > 0) {
      console.log(`Adding ${formattedJobs.length} new jobs to sheet_1...`);
      await appendNewJobs(formattedJobs, 'sheet_1');
      console.log('Jobs added successfully!');
    } else {
      console.log('No new jobs to add');
    }
    
    console.log('General product designer scraper completed successfully');
    
    return {
      success: true,
      totalScraped: allJobs.length,
      newJobsAdded: formattedJobs.length
    };
    
  } catch (error) {
    console.error('Error running general product designer scraper:', error);
    throw error;
  }
}

module.exports = { runJobScraper, runGeneralProductDesignerScraper };
