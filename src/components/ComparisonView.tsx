import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { APIResult } from '../App';
import { Clock, DollarSign, FileText, TrendingUp, CheckCircle2, XCircle, AlertCircle, Settings } from 'lucide-react';
import { JobCard } from './JobCard';
import { API_CONFIG } from '../config/api-config';

interface ComparisonViewProps {
  serpResults: APIResult | null;
  adzunaResults: APIResult | null;
  loading: boolean;
}

export function ComparisonView({ serpResults, adzunaResults, loading }: ComparisonViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="p-6 space-y-4 animate-pulse">
            <div className="h-8 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-200 rounded" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-32 bg-slate-200 rounded" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Check if APIs are configured
  const serpConfigured = API_CONFIG.serpapi.enabled && API_CONFIG.serpapi.apiKey;
  const adzunaConfigured = API_CONFIG.adzuna.enabled && API_CONFIG.adzuna.appId && API_CONFIG.adzuna.appKey;

  // Show configuration warning if needed
  const showConfigWarning = (!serpConfigured || !adzunaConfigured) && 
                           (serpResults?.error?.includes('not configured') || 
                            adzunaResults?.error?.includes('not configured'));

  return (
    <div className="space-y-6">
      {/* Configuration Warning */}
      {showConfigWarning && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Settings className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="text-amber-900">Configuration Required</h3>
              <p className="text-amber-800 text-sm">
                To use the comparison tool, you need to configure your API credentials in <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">/config/api-config.ts</code>
              </p>
              <div className="space-y-2 text-sm">
                {!adzunaConfigured && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-700">•</span>
                    <span className="text-amber-700">
                      <strong>Adzuna:</strong> Add your App ID (you already have the App Key). Get it from{' '}
                      <a href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer" className="underline">
                        developer.adzuna.com
                      </a>
                    </span>
                  </div>
                )}
                {!serpConfigured && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-700">•</span>
                    <span className="text-amber-700">
                      <strong>SerpAPI (optional):</strong> Add your API key and set enabled: true. Get it from{' '}
                      <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener noreferrer" className="underline">
                        serpapi.com
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metrics Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SerpAPI Metrics */}
        <Card className="p-6 space-y-4 border-2 border-blue-200 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-blue-900">SerpAPI</h2>
            {serpResults?.error ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="size-3" />
                Error
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-blue-100 text-blue-900 gap-1">
                <CheckCircle2 className="size-3" />
                Success
              </Badge>
            )}
          </div>

          {serpResults?.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-red-900">API Error</p>
                <p className="text-red-700 text-sm">{serpResults.error}</p>
              </div>
            </div>
          ) : serpResults ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  icon={<FileText className="size-4" />}
                  label="Results"
                  value={serpResults.jobs.length.toString()}
                  color="blue"
                />
                <MetricCard
                  icon={<Clock className="size-4" />}
                  label="Response Time"
                  value={`${serpResults.responseTime.toFixed(0)}ms`}
                  color="blue"
                />
                <MetricCard
                  icon={<TrendingUp className="size-4" />}
                  label="Total Available"
                  value={serpResults.totalResults.toLocaleString()}
                  color="blue"
                />
                <MetricCard
                  icon={<DollarSign className="size-4" />}
                  label="Est. Cost"
                  value={`$${serpResults.cost.toFixed(4)}`}
                  color="blue"
                />
              </div>
            </>
          ) : null}
        </Card>

        {/* Adzuna Metrics */}
        <Card className="p-6 space-y-4 border-2 border-green-200 bg-green-50/50">
          <div className="flex items-center justify-between">
            <h2 className="text-green-900">Adzuna</h2>
            {adzunaResults?.error ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="size-3" />
                Error
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-900 gap-1">
                <CheckCircle2 className="size-3" />
                Success
              </Badge>
            )}
          </div>

          {adzunaResults?.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-red-900">API Error</p>
                <p className="text-red-700 text-sm">{adzunaResults.error}</p>
              </div>
            </div>
          ) : adzunaResults ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  icon={<FileText className="size-4" />}
                  label="Results"
                  value={adzunaResults.jobs.length.toString()}
                  color="green"
                />
                <MetricCard
                  icon={<Clock className="size-4" />}
                  label="Response Time"
                  value={`${adzunaResults.responseTime.toFixed(0)}ms`}
                  color="green"
                />
                <MetricCard
                  icon={<TrendingUp className="size-4" />}
                  label="Total Available"
                  value={adzunaResults.totalResults.toLocaleString()}
                  color="green"
                />
                <MetricCard
                  icon={<DollarSign className="size-4" />}
                  label="Est. Cost"
                  value={`$${adzunaResults.cost.toFixed(4)}`}
                  color="green"
                />
              </div>
            </>
          ) : null}
        </Card>
      </div>

      {/* Winner Summary */}
      {serpResults && adzunaResults && !serpResults.error && !adzunaResults.error && (
        <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <h3 className="text-amber-900 mb-4">Quick Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ComparisonItem
              label="More Results"
              winner={serpResults.jobs.length > adzunaResults.jobs.length ? 'serpapi' : 'adzuna'}
              serpValue={serpResults.jobs.length}
              adzunaValue={adzunaResults.jobs.length}
            />
            <ComparisonItem
              label="Faster"
              winner={serpResults.responseTime < adzunaResults.responseTime ? 'serpapi' : 'adzuna'}
              serpValue={`${serpResults.responseTime.toFixed(0)}ms`}
              adzunaValue={`${adzunaResults.responseTime.toFixed(0)}ms`}
            />
            <ComparisonItem
              label="Cheaper"
              winner={serpResults.cost < adzunaResults.cost ? 'serpapi' : 'adzuna'}
              serpValue={`$${serpResults.cost.toFixed(4)}`}
              adzunaValue={`$${adzunaResults.cost.toFixed(4)}`}
            />
            <ComparisonItem
              label="More Total Jobs"
              winner={serpResults.totalResults > adzunaResults.totalResults ? 'serpapi' : 'adzuna'}
              serpValue={serpResults.totalResults.toLocaleString()}
              adzunaValue={adzunaResults.totalResults.toLocaleString()}
            />
          </div>
        </Card>
      )}

      {/* Job Results Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SerpAPI Results */}
        <div className="space-y-4">
          <h3 className="text-blue-900">SerpAPI Jobs ({serpResults?.jobs.length || 0})</h3>
          <div className="space-y-3">
            {serpResults?.jobs.map((job) => (
              <JobCard key={job.id} job={job} provider="serpapi" />
            ))}
            {serpResults?.jobs.length === 0 && !serpResults?.error && (
              <Card className="p-8 text-center text-slate-500">
                No results found
              </Card>
            )}
          </div>
        </div>

        {/* Adzuna Results */}
        <div className="space-y-4">
          <h3 className="text-green-900">Adzuna Jobs ({adzunaResults?.jobs.length || 0})</h3>
          <div className="space-y-3">
            {adzunaResults?.jobs.map((job) => (
              <JobCard key={job.id} job={job} provider="adzuna" />
            ))}
            {adzunaResults?.jobs.length === 0 && !adzunaResults?.error && (
              <Card className="p-8 text-center text-slate-500">
                No results found
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const bgColor = color === 'blue' ? 'bg-blue-100' : 'bg-green-100';
  const textColor = color === 'blue' ? 'text-blue-900' : 'text-green-900';
  const labelColor = color === 'blue' ? 'text-blue-700' : 'text-green-700';

  return (
    <div className={`p-3 ${bgColor} rounded-lg space-y-1`}>
      <div className={`flex items-center gap-2 ${labelColor} text-sm`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={`${textColor}`}>{value}</div>
    </div>
  );
}

interface ComparisonItemProps {
  label: string;
  winner: 'serpapi' | 'adzuna';
  serpValue: string | number;
  adzunaValue: string | number;
}

function ComparisonItem({ label, winner, serpValue, adzunaValue }: ComparisonItemProps) {
  return (
    <div className="space-y-2">
      <p className="text-amber-900 text-sm">{label}</p>
      <div className="space-y-1">
        <div className={`flex items-center gap-2 text-sm ${winner === 'serpapi' ? 'text-blue-900' : 'text-slate-600'}`}>
          {winner === 'serpapi' && <CheckCircle2 className="size-4 text-blue-600" />}
          <span>SerpAPI: {serpValue}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${winner === 'adzuna' ? 'text-green-900' : 'text-slate-600'}`}>
          {winner === 'adzuna' && <CheckCircle2 className="size-4 text-green-600" />}
          <span>Adzuna: {adzunaValue}</span>
        </div>
      </div>
    </div>
  );
}