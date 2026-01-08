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

// External sheet for repair log (replace with your decision-maker sheet ID)
const EXTERNAL_SHEET_ID = ''; // Optional: Your external Google Sheet ID for repair log
const EXTERNAL_SHEET_NAME = 'RepairLog'; // Sheet name in external spreadsheet

// Column indexes (0-based)
const COLS = {
  TICKET_ID: 0,       // A
  CREATED: 1,         // B
  ITEM: 2,            // C
  ASSIGNED_TO: 3,     // D
  NOTES: 4,           // E
  STATUS: 5,          // F
  COMPLETED: 6,       // G
  REPAIR_DATE: 7,     // H - Repair date
  PART_USED: 8,       // I - Part used (YES/NO)
  PART_DETAILS: 9,    // J - Part name, number, price
  TASK_DESC: 10,      // K - Task description
  LABOR_HOURS: 11,    // L - Labor hours
  LABOR_RATE_TYPE: 12,// M - Standard or Emergency
  LABOR_RATE: 13,     // N - Rate per hour ($80 or $150)
  TOTAL_LABOR: 14,    // O - Total labor cost
  ADD_NOTES: 15       // P - Additional notes
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
// COMPLETE TICKET (with detailed repair data)
// ============================================
function completeTicket(completionData) {
  try {
    // Handle both old format (just ticketId string) and new format (object with details)
    let ticketId, repairDetails;

    if (typeof completionData === 'string') {
      // Legacy: just ticket ID
      ticketId = completionData;
      repairDetails = null;
    } else if (completionData && completionData.ticketId) {
      // New format: object with completion details
      ticketId = completionData.ticketId;
      repairDetails = completionData;
    } else {
      return { success: false, error: 'Ticket ID is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COLS.TICKET_ID]) === String(ticketId)) {
        const rowNum = i + 1; // Sheets are 1-indexed
        const completedTime = new Date();

        // Basic completion
        sheet.getRange(rowNum, COLS.STATUS + 1).setValue('COMPLETED');
        sheet.getRange(rowNum, COLS.COMPLETED + 1).setValue(completedTime);

        // If we have repair details, save them
        if (repairDetails) {
          const repairDate = repairDetails.repairDate ? new Date(repairDetails.repairDate) : completedTime;

          sheet.getRange(rowNum, COLS.REPAIR_DATE + 1).setValue(repairDate);
          sheet.getRange(rowNum, COLS.PART_USED + 1).setValue(repairDetails.partUsed ? 'YES' : 'NO');
          sheet.getRange(rowNum, COLS.PART_DETAILS + 1).setValue(repairDetails.partDetails || '');
          sheet.getRange(rowNum, COLS.TASK_DESC + 1).setValue(repairDetails.taskDescription || '');
          sheet.getRange(rowNum, COLS.LABOR_HOURS + 1).setValue(repairDetails.laborHours || 0);
          sheet.getRange(rowNum, COLS.LABOR_RATE_TYPE + 1).setValue(repairDetails.laborRateType || 'standard');
          sheet.getRange(rowNum, COLS.LABOR_RATE + 1).setValue(repairDetails.laborRate || 80);
          sheet.getRange(rowNum, COLS.TOTAL_LABOR + 1).setValue(repairDetails.totalLaborCost || 0);
          sheet.getRange(rowNum, COLS.ADD_NOTES + 1).setValue(repairDetails.additionalNotes || '');

          // Push to external sheet if configured
          if (EXTERNAL_SHEET_ID) {
            pushToExternalSheet(data[i], repairDetails, repairDate, completedTime);
          }
        }

        return { success: true, message: 'Ticket completed' };
      }
    }

    return { success: false, error: 'Ticket not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// PUSH TO EXTERNAL SHEET (Repair Decision Log)
// ============================================
function pushToExternalSheet(ticketRow, repairDetails, repairDate, completedTime) {
  try {
    const extSS = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    let extSheet = extSS.getSheetByName(EXTERNAL_SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!extSheet) {
      extSheet = extSS.insertSheet(EXTERNAL_SHEET_NAME);
      // Set headers
      extSheet.getRange(1, 1, 1, 14).setValues([[
        'Completed Date',
        'Ticket ID',
        'Asset Name',
        'Repair Date',
        'Original Issue',
        'Task Description',
        'Part Used',
        'Part Details',
        'Labor Hours',
        'Labor Rate Type',
        'Labor Rate',
        'Total Labor Cost',
        'Additional Notes',
        'Assigned To'
      ]]);
      extSheet.getRange(1, 1, 1, 14)
        .setFontWeight('bold')
        .setBackground('#4a4a4a')
        .setFontColor('#ffffff');
      extSheet.setFrozenRows(1);
    }

    // Append the repair data
    extSheet.appendRow([
      completedTime,
      String(ticketRow[COLS.TICKET_ID] || ''),
      repairDetails.assetName || String(ticketRow[COLS.ITEM] || ''),
      repairDate,
      String(ticketRow[COLS.NOTES] || ''),
      repairDetails.taskDescription || '',
      repairDetails.partUsed ? 'YES' : 'NO',
      repairDetails.partDetails || '',
      repairDetails.laborHours || 0,
      repairDetails.laborRateType || 'standard',
      repairDetails.laborRate || 80,
      repairDetails.totalLaborCost || 0,
      repairDetails.additionalNotes || '',
      String(ticketRow[COLS.ASSIGNED_TO] || '')
    ]);

    return true;
  } catch (error) {
    // Log error but don't fail the main completion
    console.error('Error pushing to external sheet:', error.toString());
    return false;
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

  // Set headers (including new completion detail columns)
  sheet.getRange(1, 1, 1, 16).setValues([[
    'Ticket ID',      // A
    'Created',        // B
    'Item',           // C
    'Assigned To',    // D
    'Notes',          // E
    'Status',         // F
    'Completed',      // G
    'Repair Date',    // H
    'Part Used',      // I
    'Part Details',   // J
    'Task Description', // K
    'Labor Hours',    // L
    'Labor Rate Type',// M
    'Labor Rate',     // N
    'Total Labor Cost', // O
    'Additional Notes'  // P
  ]]);

  // Format header row
  sheet.getRange(1, 1, 1, 16)
    .setFontWeight('bold')
    .setBackground('#4a4a4a')
    .setFontColor('#ffffff');

  // Set column widths
  sheet.setColumnWidth(1, 180);  // Ticket ID
  sheet.setColumnWidth(2, 150);  // Created
  sheet.setColumnWidth(3, 150);  // Item
  sheet.setColumnWidth(4, 120);  // Assigned To
  sheet.setColumnWidth(5, 250);  // Notes (original issue)
  sheet.setColumnWidth(6, 100);  // Status
  sheet.setColumnWidth(7, 150);  // Completed
  sheet.setColumnWidth(8, 120);  // Repair Date
  sheet.setColumnWidth(9, 80);   // Part Used
  sheet.setColumnWidth(10, 250); // Part Details
  sheet.setColumnWidth(11, 300); // Task Description
  sheet.setColumnWidth(12, 100); // Labor Hours
  sheet.setColumnWidth(13, 120); // Labor Rate Type
  sheet.setColumnWidth(14, 100); // Labor Rate
  sheet.setColumnWidth(15, 120); // Total Labor Cost
  sheet.setColumnWidth(16, 250); // Additional Notes

  // Freeze header row
  sheet.setFrozenRows(1);

  return 'Sheet setup complete! New columns added for repair details.';
}
