import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Search } from 'lucide-react';
import { SearchParams } from '../App';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [what, setWhat] = useState('product designer');
  const [where, setWhere] = useState('san francisco');
  const [resultsPerPage, setResultsPerPage] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ what, where, resultsPerPage });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="what">Job Title / Keywords</Label>
          <Input
            id="what"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="e.g. product designer"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="where">Location</Label>
          <Input
            id="where"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="e.g. san francisco"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="results">Results per API</Label>
          <Input
            id="results"
            type="number"
            min="10"
            max="100"
            value={resultsPerPage}
            onChange={(e) => setResultsPerPage(Number(e.target.value))}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Searching both APIs...
          </>
        ) : (
          <>
            <Search className="size-4 mr-2" />
            Compare APIs
          </>
        )}
      </Button>
    </form>
  );
}
