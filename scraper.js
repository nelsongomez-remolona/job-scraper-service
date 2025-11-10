const { getJson } = require('serpapi');
const { getExistingJobs, appendNewJobs } = require('./sheets');

// Utility function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Perform a single search with SerpAPI
async function performSearch(query, type, maxResults = 200) {
  const allJobs = [];
  const RESULTS_PER_PAGE = 50; // Max results per page
  const DELAY_MS = 2000; // 2 second delay between requests
  
  let startIndex = 0;
  let totalFetched = 0;
  let pageCount = 0;
  
  console.log(`\n=== Starting search: "${query}" (type: ${type}) ===`);
  
  while (totalFetched < maxResults) {
    pageCount++;
    console.log(`Fetching page ${pageCount} (starting at ${startIndex})...`);
    
    try {
      const params = {
        engine: 'google',
        q: query + ' (site:boards.greenhouse.io OR site:jobs.lever.co OR site:jobs.ashbyhq.com OR site:linkedin.com/jobs)',
        api_key: process.env.SERPAPI_KEY,
        tbs: 'qdr:m', // Last month
        num: Math.min(RESULTS_PER_PAGE, maxResults - totalFetched),
        start: startIndex,
        hl: 'en',
        gl: 'us',
        device: 'desktop'
      };
      
      const response = await getJson(params);
      
      if (response.organic_results && response.organic_results.length > 0) {
        // Add type to each job
        const jobsWithType = response.organic_results.map(job => ({
          ...job,
          searchType: type
        }));
        
        allJobs.push(...jobsWithType);
        totalFetched += response.organic_results.length;
        console.log(`Fetched ${response.organic_results.length} results (total: ${totalFetched})`);
        
        // Check if there are more results
        if (response.organic_results.length < RESULTS_PER_PAGE || totalFetched >= maxResults) {
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
  
  console.log(`Search complete: ${allJobs.length} results for "${query}"`);
  return allJobs;
}

async function runJobScraper() {
  try {
    console.log('Starting comprehensive job scraper...');
    
    // Step 1: Get existing jobs from Google Sheets
    console.log('\n=== Step 1: Fetching existing jobs from Google Sheet ===');
    const existingJobs = await getExistingJobs('company_boards');
    console.log(`Found ${existingJobs.length} existing jobs in spreadsheet`);
    
    // Create sets for deduplication
    const existingUrls = new Set(existingJobs.map(job => job.url).filter(Boolean));
    const existingCompanyTitles = new Set(
      existingJobs.map(job => `${job.company}|${job.title}`.toLowerCase()).filter(ct => ct !== '|')
    );
    
    console.log(`Tracking ${existingUrls.size} unique URLs and ${existingCompanyTitles.size} unique company+title combos`);
    
    // Step 2: Perform all 4 searches
    console.log('\n=== Step 2: Performing searches ===');
    
    const searches = [
      { query: 'product designer design system remote', type: 'design system remote' },
      { query: 'product designer remote', type: 'standard remote' },
      { query: 'product designer san francisco', type: 'standard' },
      { query: 'product designer design system san francisco', type: 'product designer design system' }
    ];
    
    let allScrapedJobs = [];
    
    for (const search of searches) {
      const jobs = await performSearch(search.query, search.type, 200);
      allScrapedJobs.push(...jobs);
      
      // Add delay between different searches
      if (searches.indexOf(search) < searches.length - 1) {
        console.log('\nWaiting 3 seconds before next search...');
        await delay(3000);
      }
    }
    
    console.log(`\n=== Total results across all searches: ${allScrapedJobs.length} ===`);
    
    // Step 3: Filter jobs
    console.log('\n=== Step 3: Filtering jobs ===');
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const filteredJobs = allScrapedJobs.filter(job => {
      const snippet = (job.snippet || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const link = (job.link || '').toLowerCase();
      
      // Check if URL is from one of our supported job boards
      const isGreenhouse = link.includes('greenhouse.io');
      const isLever = link.includes('lever.co');
      const isAshby = link.includes('ashbyhq.com');
      const isLinkedIn = link.includes('linkedin.com/jobs');
      
      const isValidJobBoard = isGreenhouse || isLever || isAshby || isLinkedIn;
      
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
      
      return isValidJobBoard && !hasNoAIPolicy && isRecent;
    });
    
    console.log(`Jobs after filtering: ${filteredJobs.length}`);
    
    // Step 4: Deduplicate across all searches
    console.log('\n=== Step 4: Deduplicating jobs ===');
    
    const seenUrls = new Set(existingUrls);
    const seenCompanyTitles = new Set(existingCompanyTitles);
    const uniqueJobs = [];
    
    for (const job of filteredJobs) {
      const link = job.link || '';
      const url = link;
      
      // Extract company from URL based on job board type
      let company = 'Unknown';
      let source = 'Unknown';
      
      // Greenhouse: boards.greenhouse.io/company/jobs/...
      const greenhouseMatch = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      if (greenhouseMatch) {
        company = greenhouseMatch[1];
        source = 'Greenhouse';
      }
      
      // Lever: jobs.lever.co/company/...
      const leverMatch = link.match(/jobs\.lever\.co\/([^\/]+)/);
      if (leverMatch) {
        company = leverMatch[1];
        source = 'Lever';
      }
      
      // Ashby: jobs.ashbyhq.com/company/...
      const ashbyMatch = link.match(/jobs\.ashbyhq\.com\/([^\/]+)/);
      if (ashbyMatch) {
        company = ashbyMatch[1];
        source = 'Ashby';
      }
      
      // LinkedIn: linkedin.com/jobs/view/...
      const linkedInMatch = link.match(/linkedin\.com\/jobs\/view/);
      if (linkedInMatch) {
        // Try to extract company name from title or snippet
        const titleMatch = job.title.match(/at (.+?)(?:\s*\||$)/i);
        if (titleMatch) {
          company = titleMatch[1].trim();
        }
        source = 'LinkedIn';
      }
      
      const companyTitle = `${company}|${job.title}`.toLowerCase();
      
      // Check if we've already seen this URL or company+title combo
      const urlExists = seenUrls.has(url);
      const companyTitleExists = seenCompanyTitles.has(companyTitle);
      
      if (!urlExists && !companyTitleExists) {
        // This is a unique job
        uniqueJobs.push({ ...job, extractedCompany: company, extractedSource: source });
        seenUrls.add(url);
        seenCompanyTitles.add(companyTitle);
      }
    }
    
    console.log(`New unique jobs found: ${uniqueJobs.length}`);
    
    // Step 5: Format jobs with timestamp and prepare for insertion
    console.log('\n=== Step 5: Formatting jobs for insertion ===');
    
    const formattedJobs = uniqueJobs.map(job => {
      // Use the extracted company and source from deduplication step
      const company = job.extractedCompany || 'Unknown';
      const source = job.extractedSource || 'Unknown';
      
      // Determine location based on type
      let location = 'Remote';
      if (job.searchType.includes('san francisco')) {
        location = 'San Francisco';
      } else if (job.searchType === 'standard') {
        location = 'San Francisco';
      }
      
      return {
        timestamp: new Date().toISOString(),
        title: job.title,
        company: company,
        location: location,
        url: job.link,
        source: source,
        postedAt: job.date || '',
        status: 'review_required',
        type: job.searchType
      };
    });
    
    // Log breakdown by type
    const typeBreakdown = {};
    formattedJobs.forEach(job => {
      typeBreakdown[job.type] = (typeBreakdown[job.type] || 0) + 1;
    });
    
    console.log('\nBreakdown by type:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} jobs`);
    });
    
    // Step 6: Append new jobs to Google Sheets
    console.log('\n=== Step 6: Saving to spreadsheet ===');
    
    if (formattedJobs.length > 0) {
      console.log(`Adding ${formattedJobs.length} new jobs to company_boards...`);
      await appendNewJobs(formattedJobs, 'company_boards');
      console.log('Jobs added successfully!');
    } else {
      console.log('No new jobs to add');
    }
    
    console.log('\n=== Job scraper completed successfully ===');
    
    return {
      success: true,
      totalScraped: allScrapedJobs.length,
      totalFiltered: filteredJobs.length,
      newJobsAdded: formattedJobs.length,
      breakdown: typeBreakdown
    };
    
  } catch (error) {
    console.error('Error running job scraper:', error);
    throw error;
  }
}

module.exports = { runJobScraper };
