// ============================================
// SHOP REPAIR TICKETS - Google Apps Script Backend
// ============================================
// Copy this entire file into your Google Apps Script project
// Then deploy as a web app with "Anyone" access

// ============================================
// CONFIGURATION - UPDATE THIS!
// ============================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Replace with your Google Sheet ID
const SHEET_NAME = 'Tickets';

// Column indexes (0-based)
const COLS = {
  TICKET_ID: 0,    // A
  CREATED: 1,      // B
  ITEM: 2,         // C
  ASSIGNED_TO: 3,  // D
  NOTES: 4,        // E
  STATUS: 5,       // F
  COMPLETED: 6     // G
};

// ============================================
// WEB APP ENTRY POINTS
// ============================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // Enable CORS
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    let result;
    const params = e.parameter || {};
    let body = {};

    // Parse POST body if present
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = {};
      }
    }

    // Merge params and body
    const data = { ...params, ...body };
    const action = data.action || 'getTickets';

    switch (action) {
      case 'getTickets':
        result = getTickets();
        break;
      case 'addTicket':
        result = addTicket(data);
        break;
      case 'completeTicket':
        result = completeTicket(data.ticketId);
        break;
      case 'deleteTicket':
        result = deleteTicket(data.ticketId);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (error) {
    output.setContent(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }

  return output;
}

// ============================================
// GET ALL TICKETS
// ============================================
function getTickets() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'Sheet not found. Create a sheet named "Tickets"' };
    }

    const data = sheet.getDataRange().getValues();
    const tickets = { open: [], completed: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[COLS.TICKET_ID]) continue;

      const ticket = {
        ticketId: String(row[COLS.TICKET_ID] || ''),
        created: formatDateTime(row[COLS.CREATED]),
        item: String(row[COLS.ITEM] || ''),
        assignedTo: String(row[COLS.ASSIGNED_TO] || ''),
        notes: String(row[COLS.NOTES] || ''),
        status: String(row[COLS.STATUS] || 'OPEN'),
        completed: formatDateTime(row[COLS.COMPLETED])
      };

      if (ticket.status === 'COMPLETED') {
        // Only show tickets completed today
        const completedDate = row[COLS.COMPLETED];
        if (completedDate instanceof Date) {
          const compDay = new Date(completedDate);
          compDay.setHours(0, 0, 0, 0);
          if (compDay.getTime() === today.getTime()) {
            tickets.completed.push(ticket);
          }
        }
      } else {
        tickets.open.push(ticket);
      }
    }

    // Sort: open by created (oldest first), completed by completed time (newest first)
    tickets.open.sort((a, b) => new Date(a.created) - new Date(b.created));
    tickets.completed.sort((a, b) => new Date(b.completed) - new Date(a.completed));

    return { success: true, data: tickets };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// ADD NEW TICKET
// ============================================
function addTicket(data) {
  try {
    if (!data.item || !data.item.trim()) {
      return { success: false, error: 'Item is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }

    // Generate ticket ID: TKT-YYYYMMDD-HHMMSS
    const now = new Date();
    const ticketId = 'TKT-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

    // Append new row
    sheet.appendRow([
      ticketId,
      now,
      String(data.item || '').trim(),
      String(data.assignedTo || '').trim(),
      String(data.notes || '').trim(),
      'OPEN',
      ''
    ]);

    return {
      success: true,
      message: 'Ticket created',
      ticketId: ticketId
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// COMPLETE TICKET
// ============================================
function completeTicket(ticketId) {
  try {
    if (!ticketId) {
      return { success: false, error: 'Ticket ID is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COLS.TICKET_ID]) === String(ticketId)) {
        const rowNum = i + 1; // Sheets are 1-indexed
        sheet.getRange(rowNum, COLS.STATUS + 1).setValue('COMPLETED');
        sheet.getRange(rowNum, COLS.COMPLETED + 1).setValue(new Date());
        return { success: true, message: 'Ticket completed' };
      }
    }

    return { success: false, error: 'Ticket not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// DELETE TICKET
// ============================================
function deleteTicket(ticketId) {
  try {
    if (!ticketId) {
      return { success: false, error: 'Ticket ID is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COLS.TICKET_ID]) === String(ticketId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Ticket deleted' };
      }
    }

    return { success: false, error: 'Ticket not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDateTime(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

// ============================================
// SETUP HELPER - Run this once to create headers
// ============================================
function setupSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Set headers
  sheet.getRange(1, 1, 1, 7).setValues([[
    'Ticket ID', 'Created', 'Item', 'Assigned To', 'Notes', 'Status', 'Completed'
  ]]);

  // Format header row
  sheet.getRange(1, 1, 1, 7)
    .setFontWeight('bold')
    .setBackground('#4a4a4a')
    .setFontColor('#ffffff');

  // Set column widths
  sheet.setColumnWidth(1, 180); // Ticket ID
  sheet.setColumnWidth(2, 150); // Created
  sheet.setColumnWidth(3, 150); // Item
  sheet.setColumnWidth(4, 120); // Assigned To
  sheet.setColumnWidth(5, 250); // Notes
  sheet.setColumnWidth(6, 100); // Status
  sheet.setColumnWidth(7, 150); // Completed

  // Freeze header row
  sheet.setFrozenRows(1);

  return 'Sheet setup complete!';
}
