# Job Scraper Service

Automated job scraper that monitors SerpAPI for design positions and updates a Google Spreadsheet with new postings.

## Features

- 🔍 Scrapes job postings from SerpAPI (up to 80 results)
- 📊 Integrates with Google Sheets for data storage
- 🔄 Automatic deduplication (prevents duplicate entries)
- ⏰ Scheduled runs on Monday, Wednesday, Friday at 8:00 AM
- 🎯 Manual trigger via API endpoint
- 🚫 Filters out jobs with "no AI" policies
- 📅 Converts relative dates ("7 days ago") to actual dates

## Setup

### 1. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and click "Create"
   - Skip optional permissions
   - Click "Done"
5. Create a key for the service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the key file
6. Share your Google Spreadsheet with the service account email (found in the JSON file as `client_email`)
   - Open your spreadsheet
   - Click "Share"
   - Paste the service account email
   - Give it "Editor" permissions

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
TIMEZONE=America/New_York

# Your SerpAPI key (already included in example)
SERPAPI_KEY=67c18478e34ad3cceb357993f7fe1bbb15b3e7bfec9f127a7fda5b0d16483907

# Paste the entire contents of your Google service account JSON file as a single line
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

**Important:** Make sure to format the `GOOGLE_CREDENTIALS` as a single line JSON string.

### 3. Update Sheet Name

If your Google Sheet tab is not named "Sheet1", update the `SHEET_NAME` constant in `/services/sheets.js`:

```javascript
const SHEET_NAME = 'YourSheetName'; // Update this
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Deploy to Railway

### Option 1: Connect GitHub Repository

1. Push this code to a GitHub repository
2. Go to [Railway](https://railway.app/)
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables:
   - `SERPAPI_KEY`
   - `GOOGLE_CREDENTIALS` (paste as single line JSON)
   - `TIMEZONE` (optional, defaults to America/New_York)
6. Deploy!

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set SERPAPI_KEY="your-key-here"
railway variables set GOOGLE_CREDENTIALS='{"type":"service_account",...}'

# Deploy
railway up
```

## API Endpoints

### Health Check
```
GET /
```

Returns service status and information.

### Manual Scrape Trigger
```
POST /api/scrape
```

Manually triggers a job scrape. Returns immediately while the scrape runs in the background.

Example using curl:
```bash
curl -X POST https://your-railway-app.railway.app/api/scrape
```

Example using JavaScript:
```javascript
fetch('https://your-railway-app.railway.app/api/scrape', {
  method: 'POST'
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Scheduled Runs

The service automatically runs on:
- **Monday** at 8:00 AM
- **Wednesday** at 8:00 AM
- **Friday** at 8:00 AM

Timezone can be configured via the `TIMEZONE` environment variable.

## Spreadsheet Columns

The service writes data to the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Timestamp | When the job was scraped | 2025-11-10T08:00:00.000Z |
| Title | Job title | Senior Product Designer |
| Company | Company name | acme-corp |
| Location | Job location | Remote |
| Apply_URL | Link to job posting | https://boards.greenhouse.io/... |
| Source | Job board platform | greenhouse |
| Posted | Date job was posted | 2025-11-03 |
| Status | Review status | review_required |
| Policy Flag | AI policy violations | (empty or YES) |
| Needs User Review | Requires manual review | YES |
| Notes | Auto-generated notes | Auto-scraped from SerpAPI |

## How It Works

1. **Fetch Existing Data**: Reads all existing jobs from your Google Spreadsheet
2. **Scrape SerpAPI**: Makes two API calls to get up to 80 results
   - First call: results 0-50
   - Second call: results 50-80
   - 3-second delay between calls to prevent rate limiting
3. **Process Results**: Extracts job information from search results
4. **Check for "No AI" Policy**: Skips jobs that mention AI restrictions
5. **Deduplicate**: Compares Company + Title against existing data
6. **Save New Jobs**: Appends only unique jobs to the spreadsheet

## Deduplication Logic

Jobs are considered duplicates if they have the same combination of:
- Company name (case-insensitive)
- Job title (case-insensitive)

## Notes

- The service includes a 3-second delay between API requests to prevent being flagged by SerpAPI
- Date parsing converts relative dates like "7 days ago" to actual dates (YYYY-MM-DD format)
- All new jobs are automatically marked with `status: review_required` and `needs_user_review: YES`
- The service account email must have edit access to your Google Spreadsheet

## Troubleshooting

### "Error fetching existing jobs"
- Make sure your Google Spreadsheet is shared with the service account email
- Verify the `GOOGLE_CREDENTIALS` environment variable is properly formatted

### "Error fetching from SerpAPI"
- Check that your `SERPAPI_KEY` is valid
- Verify you haven't exceeded your SerpAPI quota

### Scheduled jobs not running
- Check the `TIMEZONE` environment variable
- Railway logs will show when scheduled jobs run
- Verify the cron expression is correct for your timezone

### No new jobs found
- All jobs might already exist in your spreadsheet
- Check the logs to see how many duplicates were found
- Verify the search query is returning results on SerpAPI

## License

MIT
