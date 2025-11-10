# Job Scraper Service

Monitors SerpAPI for "product designer design system remote" positions and automatically updates Google Spreadsheet with new listings.

## Features

- Scrapes up to 80 results from SerpAPI with proper delays
- Runs on schedule: Monday, Wednesday, Friday at 8am
- Manual trigger endpoint available
- Deduplicates by company+title AND URL
- Filters out "no AI" positions
- Appends to Google Spreadsheet

## Environment Variables

Set these in Railway:

```
SERPAPI_KEY=your_serpapi_key_here
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}
SPREADSHEET_ID=your_spreadsheet_id_or_full_url
TIMEZONE=America/Los_Angeles
```

## Endpoints

- `GET /` - Service status
- `GET /health` - Health check
- `POST /api/scrape` - Manual trigger

## Google Sheets Setup

1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a service account and download credentials JSON
4. Share your spreadsheet with the service account email
5. Copy the entire credentials JSON into `GOOGLE_CREDENTIALS` env var

## Deployment

Deploy to Railway:
1. Connect GitHub repo
2. Set environment variables
3. Deploy
4. Generate public domain (optional, for manual triggers)

## Testing

```bash
curl -X POST https://your-app.railway.app/api/scrape
```
