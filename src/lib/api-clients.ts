import { JobResult, APIResult } from '../App';

const SERPAPI_COST_PER_SEARCH = 0.01;
const ADZUNA_COST_PER_SEARCH = 0.00;

// Railway API base URL - update this if your Railway app URL changes
const RAILWAY_API_URL = 'https://job-scraper-service-production-d38e.up.railway.app';
  
  interface SearchParams {
    what: string;
    where: string;
    resultsPerPage?: number;
  }
  
/**
 * Search using SerpAPI via your Railway backend
 * This keeps your API keys secure on the server
 */
export async function searchSerpAPI(params: SearchParams): Promise<APIResult> {
  const { what, where, resultsPerPage = 20 } = params;
  const startTime = Date.now();

  try {
    const requestBody = {
      what,
      where,
      limit: resultsPerPage,
    };

    console.log('Calling Railway /api/search with:', requestBody);

    const response = await fetch(`${RAILWAY_API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Railway API HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (!data.success) {
      throw new Error(data.error || 'Search failed');
    }

    const jobs: JobResult[] = (data.jobs || []).map((job: any) => ({
      id: job.id || `railway-${Math.random().toString(36).substr(2, 9)}`,
      title: job.title || 'Untitled',
      company: job.company || 'Unknown Company',
      location: job.location || where,
      salary: job.salary || undefined,
      description: job.description || job.snippet || '',
      url: job.url || '#',
      source: job.source || 'Google Jobs',
      postedDate: job.postedDate || undefined,
    }));

    return {
      provider: 'serpapi',
      jobs,
      responseTime,
      totalResults: data.total || data.count || jobs.length,
      cost: SERPAPI_COST_PER_SEARCH,
    };
  } catch (error) {
    console.error('SerpAPI error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('404')) {
      return {
        provider: 'serpapi',
        jobs: [],
        responseTime: Date.now() - startTime,
        totalResults: 0,
        cost: SERPAPI_COST_PER_SEARCH,
        error: '❌ /api/search endpoint not found. Deploy it to Railway first!',
      };
    }

    return {
      provider: 'serpapi',
      jobs: [],
      responseTime: Date.now() - startTime,
      totalResults: 0,
      cost: SERPAPI_COST_PER_SEARCH,
      error: errorMessage,
    };
  }
}
  
/**
 * Search using Adzuna API via your Railway backend
 * This keeps your API keys secure on the server
 */
export async function searchAdzuna(params: SearchParams): Promise<APIResult> {
  const { what, where, resultsPerPage = 20 } = params;
  const startTime = Date.now();

  try {
    const requestBody = {
      what,
      where,
      limit: resultsPerPage,
    };

    console.log('Calling Railway /api/search/adzuna with:', requestBody);

    const response = await fetch(`${RAILWAY_API_URL}/api/search/adzuna`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Railway API HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (!data.success) {
      throw new Error(data.error || 'Search failed');
    }

    const jobs: JobResult[] = (data.jobs || []).map((job: any) => ({
      id: job.id || `adzuna-${Math.random().toString(36).substr(2, 9)}`,
      title: job.title || 'Untitled',
      company: job.company || 'Unknown Company',
      location: job.location || where,
      salary: job.salary || undefined,
      description: job.description || '',
      url: job.url || '#',
      source: job.source || 'Adzuna',
      postedDate: job.postedDate || undefined,
    }));

    return {
      provider: 'adzuna',
      jobs,
      responseTime,
      totalResults: data.total || data.count || jobs.length,
      cost: ADZUNA_COST_PER_SEARCH,
    };
  } catch (error) {
    console.error('Adzuna error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not configured')) {
      return {
        provider: 'adzuna',
        jobs: [],
        responseTime: Date.now() - startTime,
        totalResults: 0,
        cost: ADZUNA_COST_PER_SEARCH,
        error: '❌ Adzuna not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to Railway environment variables.',
      };
    }

    return {
      provider: 'adzuna',
      jobs: [],
      responseTime: Date.now() - startTime,
      totalResults: 0,
      cost: ADZUNA_COST_PER_SEARCH,
      error: errorMessage,
    };
  }
}
