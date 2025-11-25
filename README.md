# Job Scraper Service with API Comparison Tool

A dual-purpose service that:
1. **Job Scraper**: Monitors SerpAPI for product designer positions and automatically updates Google Spreadsheet
2. **API Comparison Tool**: Side-by-side comparison of SerpAPI vs Adzuna job search APIs

## Features

### Job Scraper
- Scrapes up to 200 results from SerpAPI with proper rate limiting
- Supports filtered searches (Greenhouse, Lever, Ashby, LinkedIn) and general searches
- Deduplicates by company+title AND URL
- Filters out "no AI" positions
- Appends to Google Spreadsheet with status tracking

### API Comparison Tool
- **Side-by-side comparison** of SerpAPI and Adzuna
- **Performance metrics**: Response time, result count, cost per search
- **Secure API keys**: All credentials stored server-side in Railway
- **Real-time search**: Compare job results instantly
- **Visual comparison**: See which API performs better for your queries

## Environment Variables

### Required for Job Scraper
```bash
SERPAPI_KEY=your_serpapi_key_here
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}
SPREADSHEET_ID=your_spreadsheet_id_or_full_url
```

### Required for API Comparison Tool
```bash
# SerpAPI (already required above)
SERPAPI_KEY=your_serpapi_key_here

# Adzuna API
ADZUNA_APP_ID=0875fd8c
ADZUNA_APP_KEY=a37dddb8ea86102794318ec67342aa20
```

### Optional
```bash
TIMEZONE=America/Los_Angeles
PORT=3000
```

## API Endpoints

### Comparison Tool Endpoints
- `POST /api/search` - Search using SerpAPI (for comparison tool)
- `POST /api/search/adzuna` - Search using Adzuna (for comparison tool)

**Example Request:**
```bash
curl -X POST https://your-app.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "what": "product designer",
    "where": "san francisco",
    "limit": 20
  }'
```

### Job Scraper Endpoints
- `POST /api/scrape` - Run filtered job scraper (Greenhouse, Lever, Ashby, LinkedIn)
- `POST /api/scrape/general` - Run general job scraper (all sources)

### Utility Endpoints
- `GET /health` - Health check
- `GET /test` - Test endpoint with environment info
- `GET /test-scraper` - Test scraper module loading

## Setup Instructions

### 1. Get API Credentials

#### SerpAPI (Required)
1. Sign up at [serpapi.com](https://serpapi.com/users/sign_up)
2. Get your API key from the dashboard
3. Free tier: 100 searches/month

#### Adzuna (For Comparison Tool)
1. Sign up at [developer.adzuna.com](https://developer.adzuna.com/)
2. Get your App ID and App Key
3. Free tier: 1,000 searches/month

#### Google Sheets (For Job Scraper)
1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a service account and download credentials JSON
4. Share your spreadsheet with the service account email

### 2. Deploy to Railway

1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo

2. **Add Environment Variables**
   - Go to your service → Variables tab
   - Add all required variables from the list above

3. **Deploy**
   - Railway auto-deploys on push
   - Get your public URL from the Settings tab

4. **Test the Comparison Tool**
   - Open your Railway URL in browser
   - Enter search parameters
   - Compare SerpAPI vs Adzuna results!

### 3. Frontend Development (Optional)

The comparison tool frontend is in `/src`:

```bash
cd src
npm install
npm run dev
```

Update `RAILWAY_API_URL` in `src/lib/api-clients.ts` to point to your Railway backend.

## How It Works

### API Comparison Flow
```
User enters search → Frontend (React) → Railway Backend → APIs
                                              ↓
                         SerpAPI + Adzuna (parallel)
                                              ↓
                         Format & return results
                                              ↓
                         Frontend displays side-by-side
```

### Security
- ✅ All API keys stored server-side (Railway environment variables)
- ✅ Frontend calls backend endpoints, never calls APIs directly
- ✅ No sensitive credentials in client-side code
- ✅ CORS enabled for frontend access

## API Comparison Metrics

| Metric | SerpAPI | Adzuna |
|--------|---------|--------|
| **Cost per search** | $0.01 | Free |
| **Free tier** | 100/month | 1,000/month |
| **Salary data** | No | Yes |
| **Job boards** | All (via Google) | Aggregated |
| **Response time** | ~500-1500ms | ~200-800ms |

## Deployment

The service is deployed at:
```
https://job-scraper-service-production-d38e.up.railway.app
```

## Testing

### Test Comparison Tool
```bash
# Test SerpAPI search
curl -X POST https://your-app.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"what":"software engineer","where":"new york","limit":10}'

# Test Adzuna search
curl -X POST https://your-app.railway.app/api/search/adzuna \
  -H "Content-Type: application/json" \
  -d '{"what":"software engineer","where":"new york","limit":10}'
```

### Test Job Scraper
```bash
# Run filtered scraper
curl -X POST https://your-app.railway.app/api/scrape

# Run general scraper
curl -X POST https://your-app.railway.app/api/scrape/general
```

## Troubleshooting

### "Adzuna not configured" Error
- Make sure `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are set in Railway
- Check Variables tab in Railway dashboard
- Redeploy after adding variables

### CORS Errors
- The backend has CORS enabled for all origins
- If using custom domain, update CORS settings in `index.js`

### No Results Returned
- Check that API keys are valid
- Verify rate limits haven't been exceeded
- Check Railway logs for detailed error messages

## Development

### Project Structure
```
├── index.js              # Main Express server (Railway)
├── scraper.js            # Job scraping logic
├── sheets.js             # Google Sheets integration
├── src/                  # Frontend comparison tool
│   ├── App.tsx          # Main React app
│   ├── components/      # React components
│   │   ├── ComparisonView.tsx
│   │   ├── SearchForm.tsx
│   │   └── JobCard.tsx
│   └── lib/
│       └── api-clients.ts  # API client functions
```

## License

MIT
