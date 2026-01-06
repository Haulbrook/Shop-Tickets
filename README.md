# Shop Repair Tickets

A simple repair ticket system for shop operations. Submit tickets from phones/desktop, display on shop TV.

## Features

- **Mobile-friendly input form** - Create tickets from any device
- **TV display** - Large, readable cards for shop TV
- **Tap to complete** - Mark tickets done from TV or input form
- **Completed section** - Shows tickets completed today
- **Auto-refresh** - TV updates every 30 seconds

## Files

| File | Purpose |
|------|---------|
| `index.html` | Input form (phones/desktop) |
| `tv.html` | TV display |
| `code.gs` | Google Apps Script backend |

## Setup Instructions

### 1. Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Shop Repair Tickets"
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS-IS-YOUR-ID]/edit
   ```

### 2. Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Copy the entire contents of `code.gs` into the editor
4. Replace `YOUR_SPREADSHEET_ID_HERE` with your actual Spreadsheet ID
5. Click **Save**
6. Run the `setupSheet` function once (Run > Run function > setupSheet)
   - This creates the "Tickets" sheet with headers

### 3. Deploy as Web App

1. In Apps Script, click **Deploy > New deployment**
2. Click the gear icon and select **Web app**
3. Settings:
   - Description: "Shop Tickets API"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/.../exec`)

### 4. Host the HTML Files

**Option A: GitHub Pages (Free)**
1. Push this repo to GitHub
2. Go to Settings > Pages
3. Enable GitHub Pages from main branch
4. Your URLs will be:
   - Input: `https://[username].github.io/Shop-Tickets/`
   - TV: `https://[username].github.io/Shop-Tickets/tv.html`

**Option B: Netlify (Free)**
1. Connect your GitHub repo to Netlify
2. Deploy automatically

### 5. Configure the Apps

1. Open the input form (`index.html`)
2. Scroll to **Settings** at bottom
3. Paste your **Web app URL** and save
4. Do the same for `tv.html` (click the gear icon)

## Usage

### Creating a Ticket
1. Open the input form on your phone/computer
2. Enter:
   - **Item**: What needs repair (e.g., "IB2", "Blower")
   - **Truck/Crew**: Who reported it (e.g., "302", "Chase")
   - **Notes**: Description of the problem
3. Tap **Create Ticket**

### Completing a Ticket
- **From TV**: Tap the ticket card
- **From Input Form**: Tap "Mark Complete" button

### TV Display
- Shows **Open Tickets** (left) and **Completed Today** (right)
- Auto-refreshes every 30 seconds
- Tap any open ticket to mark it complete

## Google Sheet Structure

The system uses a sheet named "Tickets" with these columns:

| Column | Field |
|--------|-------|
| A | Ticket ID |
| B | Created |
| C | Item |
| D | Assigned To |
| E | Notes |
| F | Status |
| G | Completed |

## Troubleshooting

**"API URL not configured"**
- Open Settings and paste your Google Apps Script web app URL

**Tickets not loading**
- Check that the Apps Script is deployed as "Anyone" access
- Verify the Spreadsheet ID is correct in code.gs
- Run `setupSheet` function if the Tickets sheet doesn't exist

**CORS errors**
- Make sure you deployed as a Web App (not API executable)
- Redeploy with "Anyone" access
