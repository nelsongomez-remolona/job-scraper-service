const { google } = require('googleapis');

// Initialize Google Sheets API
function getGoogleSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  return google.sheets({ version: 'v4', auth });
}

// Extract spreadsheet ID from various URL formats or direct ID
function extractSpreadsheetId(input) {
  if (!input) {
    throw new Error('SPREADSHEET_ID environment variable is not set');
  }
  
  // If it's already just an ID (no slashes), return it
  if (!input.includes('/')) {
    return input;
  }
  
  // Extract from full URL: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  
  throw new Error('Invalid SPREADSHEET_ID format');
}

// Get existing jobs from spreadsheet
async function getExistingJobs() {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = extractSpreadsheetId(process.env.SPREADSHEET_ID);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:G', // Skip header row, read all data columns
    });
    
    const rows = response.data.values || [];
    
    return rows.map(row => ({
      title: row[0] || '',
      company: row[1] || '',
      location: row[2] || '',
      url: row[3] || '',
      postedAt: row[4] || '',
      scheduleType: row[5] || '',
      scrapedAt: row[6] || ''
    }));
    
  } catch (error) {
    console.error('Error fetching existing jobs:', error.message);
    
    // If sheet doesn't exist or is empty, return empty array
    if (error.message.includes('Unable to parse range')) {
      console.log('Sheet appears to be empty, will create headers');
      return [];
    }
    
    throw error;
  }
}

// Append new jobs to spreadsheet
async function appendNewJobs(jobs) {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = extractSpreadsheetId(process.env.SPREADSHEET_ID);
    
    // Check if we need to add headers
    let needsHeaders = false;
    try {
      const checkResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A1:G1',
      });
      needsHeaders = !checkResponse.data.values || checkResponse.data.values.length === 0;
    } catch (error) {
      needsHeaders = true;
    }
    
    // Add headers if needed
    if (needsHeaders) {
      console.log('Adding headers to spreadsheet...');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:G1',
        valueInputOption: 'RAW',
        resource: {
          values: [[
            'Title',
            'Company',
            'Location',
            'URL',
            'Posted At',
            'Schedule Type',
            'Scraped At'
          ]]
        }
      });
    }
    
    // Convert jobs to rows
    const rows = jobs.map(job => [
      job.title,
      job.company,
      job.location,
      job.url,
      job.postedAt,
      job.scheduleType,
      job.scrapedAt
    ]);
    
    // Append rows
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A2:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows
      }
    });
    
    console.log(`Appended ${rows.length} rows to spreadsheet`);
    
  } catch (error) {
    console.error('Error appending jobs to spreadsheet:', error.message);
    throw error;
  }
}

module.exports = {
  getExistingJobs,
  appendNewJobs
};
