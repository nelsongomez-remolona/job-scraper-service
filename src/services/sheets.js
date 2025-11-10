import { google } from 'googleapis';

const SPREADSHEET_ID = '1KeCj8PdvLiiURpHN3snwKb62FvPpka6vETc_TTy1jh0';
const SHEET_NAME = 'Sheet1'; // Update this if your sheet has a different name
const RANGE = `${SHEET_NAME}!A:K`; // Columns A through K (11 columns)

// Initialize Google Sheets API
function getGoogleSheetsClient() {
  // Using service account credentials from environment variable
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

// Get existing jobs from spreadsheet
export async function getExistingJobs() {
  const sheets = getGoogleSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });
    
    const rows = response.data.values || [];
    const existingJobs = new Set();
    
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length >= 2) {
        const title = (row[1] || '').toLowerCase(); // Column B (Title)
        const company = (row[2] || '').toLowerCase(); // Column C (Company)
        
        if (title && company) {
          const key = `${company}|${title}`;
          existingJobs.add(key);
        }
      }
    }
    
    return existingJobs;
  } catch (error) {
    console.error('Error fetching existing jobs:', error.message);
    throw error;
  }
}

// Append new jobs to spreadsheet
export async function appendJobsToSheet(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log('No jobs to append');
    return;
  }
  
  const sheets = getGoogleSheetsClient();
  
  // Convert jobs to rows format
  // Columns: Timestamp, Title, Company, Location, Apply_URL, Source, Posted, Status, Policy Flag, Needs User Review, Notes
  const rows = jobs.map(job => [
    job.timestamp,
    job.title,
    job.company,
    job.location,
    job.apply_url,
    job.source,
    job.posted,
    job.status,
    job.policy_flag,
    job.needs_user_review,
    job.notes
  ]);
  
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
    
    console.log(`Appended ${rows.length} rows to spreadsheet`);
    return response.data;
  } catch (error) {
    console.error('Error appending to spreadsheet:', error.message);
    throw error;
  }
}
