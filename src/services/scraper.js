import axios from 'axios';
import { getExistingJobs, appendJobsToSheet } from './sheets.js';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const BASE_QUERY = 'product+designer+design+system+remote+(site%3Aboards.greenhouse.io)';
const DELAY_MS = 3000; // 3 second delay between requests to avoid flagging

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse "X days ago" to actual date
function parsePostedDate(postedString) {
  if (!postedString) return '';
  
  const now = new Date();
  const daysAgoMatch = postedString.match(/(\d+)\s+days?\s+ago/i);
  const hoursAgoMatch = postedString.match(/(\d+)\s+hours?\s+ago/i);
  
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1]);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  if (hoursAgoMatch) {
    return now.toISOString().split('T')[0]; // Today
  }
  
  return postedString; // Return as-is if we can't parse
}

// Extract source from URL (e.g., greenhouse, lever)
function extractSource(url) {
  if (!url) return '';
  
  if (url.includes('greenhouse.io')) return 'greenhouse';
  if (url.includes('lever.co')) return 'lever';
  if (url.includes('ashbyhq.com')) return 'ashby';
  if (url.includes('workable.com')) return 'workable';
  
  return 'other';
}

// Check if job posting has "no AI" policy
function checkPolicyFlag(snippet, title) {
  const text = `${snippet || ''} ${title || ''}`.toLowerCase();
  const noAiKeywords = ['no ai', 'no artificial intelligence', 'ai prohibited', 'do not use ai'];
  
  return noAiKeywords.some(keyword => text.includes(keyword));
}

// Fetch results from SerpAPI
async function fetchSerpResults(start = 0) {
  const url = `https://serpapi.com/search.json?engine=google&q=${BASE_QUERY}&tbs=qdr%3Am&num=50&start=${start}&hl=en&gl=us&device=desktop&api_key=${SERPAPI_KEY}`;
  
  console.log(`Fetching results from start=${start}...`);
  
  try {
    const response = await axios.get(url, { timeout: 30000 });
    return response.data;
  } catch (error) {
    console.error(`Error fetching from SerpAPI (start=${start}):`, error.message);
    throw error;
  }
}

// Process results and extract job data
function processResults(serpData) {
  const jobs = [];
  
  if (!serpData.organic_results || serpData.organic_results.length === 0) {
    console.log('No organic results found');
    return jobs;
  }
  
  for (const result of serpData.organic_results) {
    const title = result.title || '';
    const link = result.link || '';
    const snippet = result.snippet || '';
    
    // Extract company name (usually in the title or domain)
    let company = '';
    if (link.includes('greenhouse.io')) {
      const match = link.match(/boards\.greenhouse\.io\/([^\/]+)/);
      company = match ? match[1] : '';
    }
    
    // Try to extract from title if company not found
    if (!company && title) {
      // Common pattern: "Job Title - Company Name" or "Job Title | Company Name"
      const titleMatch = title.match(/[-|](.+?)(?:\s*[-|]|$)/);
      if (titleMatch) {
        company = titleMatch[1].trim();
      }
    }
    
    // Extract location (often in snippet)
    const locationMatch = snippet.match(/(?:Remote|Location:|Based in|Located in)\s*:?\s*([^.•]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : 'Remote';
    
    // Check for policy flags
    const hasNoAiPolicy = checkPolicyFlag(snippet, title);
    
    if (hasNoAiPolicy) {
      console.log(`Skipping job with "no AI" policy: ${title}`);
      continue;
    }
    
    const job = {
      timestamp: new Date().toISOString(),
      title: title,
      company: company || 'Unknown',
      location: location,
      apply_url: link,
      source: extractSource(link),
      posted: parsePostedDate(result.date || ''),
      status: 'review_required',
      policy_flag: hasNoAiPolicy ? 'YES' : '',
      needs_user_review: 'YES',
      notes: 'Auto-scraped from SerpAPI'
    };
    
    jobs.push(job);
  }
  
  return jobs;
}

// Main scraper function
export async function runJobScraper() {
  console.log('Starting job scraper...');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Step 1: Fetch existing jobs from Google Sheet
    console.log('Fetching existing jobs from Google Sheet...');
    const existingJobs = await getExistingJobs();
    console.log(`Found ${existingJobs.size} existing jobs in spreadsheet`);
    
    // Step 2: Fetch results from SerpAPI (up to 80 results)
    const allJobs = [];
    
    // Fetch first 50 results (start=0)
    console.log('Fetching first batch (0-50)...');
    const firstBatch = await fetchSerpResults(0);
    const firstJobs = processResults(firstBatch);
    allJobs.push(...firstJobs);
    
    await sleep(DELAY_MS); // Delay to prevent flagging
    
    // Fetch next 30 results to reach 80 (start=50)
    console.log('Fetching second batch (50-80)...');
    const secondBatch = await fetchSerpResults(50);
    const secondJobs = processResults(secondBatch);
    allJobs.push(...secondJobs);
    
    console.log(`Total jobs fetched: ${allJobs.length}`);
    
    // Step 3: Filter out duplicates
    const newJobs = [];
    for (const job of allJobs) {
      const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
      if (!existingJobs.has(key)) {
        newJobs.push(job);
      } else {
        console.log(`Duplicate found: ${job.company} - ${job.title}`);
      }
    }
    
    console.log(`New unique jobs: ${newJobs.length}`);
    
    // Step 4: Append new jobs to spreadsheet
    if (newJobs.length > 0) {
      console.log('Appending new jobs to spreadsheet...');
      await appendJobsToSheet(newJobs);
      console.log('Successfully added new jobs to spreadsheet');
    } else {
      console.log('No new jobs to add');
    }
    
    return {
      success: true,
      total_fetched: allJobs.length,
      new_jobs: newJobs.length,
      duplicates: allJobs.length - newJobs.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in runJobScraper:', error);
    throw error;
  }
}
