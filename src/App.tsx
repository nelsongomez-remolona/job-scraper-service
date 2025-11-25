import { useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { ComparisonView } from './components/ComparisonView';
import { searchSerpAPI, searchAdzuna } from './lib/api-clients';

// Type definitions
export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: string;
  postedDate?: string;
}

export interface APIResult {
  provider: 'serpapi' | 'adzuna';
  jobs: JobResult[];
  responseTime: number;
  totalResults: number;
  cost: number;
  error?: string;
}

export interface SearchParams {
  what: string;
  where: string;
  resultsPerPage?: number;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [serpResults, setSerpResults] = useState<APIResult | null>(null);
  const [adzunaResults, setAdzunaResults] = useState<APIResult | null>(null);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setSerpResults(null);
    setAdzunaResults(null);

    try {
      // Search both APIs in parallel
      const [serpData, adzunaData] = await Promise.all([
        searchSerpAPI(params),
        searchAdzuna(params),
      ]);

      setSerpResults(serpData);
      setAdzunaResults(adzunaData);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Job API Comparison Tool
          </h1>
          <p className="text-slate-600">
            Compare SerpAPI vs Adzuna side by side
          </p>
        </div>

        {/* Search Form */}
        <SearchForm onSearch={handleSearch} loading={loading} />

        {/* Results */}
        {(serpResults || adzunaResults || loading) && (
          <div className="mt-8">
            <ComparisonView
              serpResults={serpResults}
              adzunaResults={adzunaResults}
              loading={loading}
            />
          </div>
        )}

        {/* Initial State */}
        {!serpResults && !adzunaResults && !loading && (
          <div className="mt-12 text-center text-slate-500">
            <p className="text-lg">Enter a search query to compare results</p>
          </div>
        )}
      </div>
    </div>
  );
}
