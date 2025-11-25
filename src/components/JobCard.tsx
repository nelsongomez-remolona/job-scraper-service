import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { JobResult } from '../App';
import { MapPin, Building2, DollarSign, ExternalLink, Calendar } from 'lucide-react';

interface JobCardProps {
  job: JobResult;
  provider: 'serpapi' | 'adzuna';
}

export function JobCard({ job, provider }: JobCardProps) {
  const borderColor = provider === 'serpapi' ? 'border-blue-200' : 'border-green-200';
  const badgeColor = provider === 'serpapi' ? 'bg-blue-100 text-blue-900' : 'bg-green-100 text-green-900';

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow border ${borderColor}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-slate-900 leading-tight line-clamp-2">
              {job.title}
            </h4>
            <Badge variant="secondary" className={`${badgeColor} text-xs flex-shrink-0`}>
              {job.source}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="size-4 flex-shrink-0" />
            <span className="line-clamp-1">{job.company}</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="size-4" />
              <span className="line-clamp-1">{job.location}</span>
            </div>
          )}

          {job.salary && (
            <div className="flex items-center gap-1 text-green-700">
              <DollarSign className="size-4" />
              <span>{job.salary}</span>
            </div>
          )}

          {job.postedDate && (
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              <span>{job.postedDate}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-sm text-slate-600 line-clamp-2">
            {job.description}
          </p>
        )}

        {/* Link */}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Job
          <ExternalLink className="size-3" />
        </a>
      </div>
    </Card>
  );
}
