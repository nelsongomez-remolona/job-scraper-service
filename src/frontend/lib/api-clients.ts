import { JobResult, APIResult } from '../App';
import { API_CONFIG } from '../config/api-config';

const SERPAPI_COST_PER_SEARCH = 0.01;
const ADZUNA_COST_PER_SEARCH = 0.00;

interface SearchParams {
  what: string;
  where: string;
  resultsPerPage?: number;
}

/**
 * Search using your Railway job scraper service
 */
export async function searchSerpAPI(params: SearchParams): Promise<APIResult> {
  const { what, where, resultsPerPage = 20 } = params;
  const startTime = Date.now();

  try {
    const RAILWAY_API_URL = 'https://job-scraper-service-production-d38e.up.railway.app/api/search';

    const requestBody = {
      what,
      where,
      limit: resultsPerPage,
    };

    console.log('Calling Railway /api/search with:', requestBody);

    const response = await fetch(RAILWAY_API_URL, {\n      method: 'POST',
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
      salary: undefined,
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
    console.error('Railway API error:', error);
    
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
 * Search using Adzuna API
 */
export async function searchAdzuna(params: SearchParams): Promise<APIResult> {
  const { what, where, resultsPerPage = 20 } = params;
  const startTime = Date.now();

  try {
    const appId = API_CONFIG.adzuna.appId;
    const appKey = API_CONFIG.adzuna.appKey;

    if (!appId || !appKey || !API_CONFIG.adzuna.enabled) {
      return {
        provider: 'adzuna',
        jobs: [],
        responseTime: Date.now() - startTime,
        totalResults: 0,
        cost: ADZUNA_COST_PER_SEARCH,
        error: 'Adzuna not configured. Add your App ID to /config/api-config.ts',
      };
    }

    const searchParams = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: resultsPerPage.toString(),
      what: what,
      where: where,
    });

    const country = 'us';
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${searchParams}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Adzuna HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    const jobs: JobResult[] = (data.results || []).map((job: any) => {
      let salary: string | undefined;
      if (job.salary_min && job.salary_max) {
        salary = `$${Math.round(job.salary_min).toLocaleString()} - $${Math.round(job.salary_max).toLocaleString()}`;
      } else if (job.salary_min) {
        salary = `From $${Math.round(job.salary_min).toLocaleString()}`;
      } else if (job.salary_max) {
        salary = `Up to $${Math.round(job.salary_max).toLocaleString()}`;
      }

      let postedDate: string | undefined;
      if (job.created) {
        const date = new Date(job.created);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          postedDate = 'Today';
        } else if (diffDays === 1) {
          postedDate = 'Yesterday';
        } else if (diffDays < 7) {
          postedDate = `${diffDays} days ago`;
        } else if (diffDays < 30) {
          postedDate = `${Math.floor(diffDays / 7)} weeks ago`;
        } else {
          postedDate = date.toLocaleDateString();
        }
      }

      return {
        id: `adzuna-${job.id}`,
        title: job.title || 'Untitled',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || where,
        salary,
        description: job.description || '',
        url: job.redirect_url || '#',
        source: 'Adzuna',
        postedDate,
      };
    });

    return {
      provider: 'adzuna',
      jobs,
      responseTime,
      totalResults: data.count || 0,
      cost: ADZUNA_COST_PER_SEARCH,
    };
  } catch (error) {
    console.error('Adzuna error:', error);
    return {
      provider: 'adzuna',
      jobs: [],
      responseTime: Date.now() - startTime,
      totalResults: 0,
      cost: ADZUNA_COST_PER_SEARCH,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
