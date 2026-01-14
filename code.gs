// ============================================
  // SHOP REPAIR TICKETS - Google Apps Script Backend
  // ============================================
  // Copy this entire file into your Google Apps Script project
  // Then deploy as a web app with "Anyone" access

  // ============================================
  // CONFIGURATION - UPDATE THIS!
  // ============================================
  const SPREADSHEET_ID = '1xyGOcCV5N7jtgJVml6l7OpNdSgMYs1pQ-EjMSgbnWrU'; // Replace with your TICKETS Google Sheet ID
  const SHEET_NAME = 'Tickets';

  // External sheet for repair log (replace with your decision-maker sheet ID)
  const EXTERNAL_SHEET_ID = '1aF_6nHHp8NA-eETkwZMUuTlPRPOiiKEvou-F9QuVTD8'; // Your decision-maker sheet
  const EXTERNAL_SHEET_NAME = 'Repairs'; // Sheet name for completed repairs log

  // Assets sheet configuration
  const ASSETS_SHEET_ID = '1AmyIFL74or_Nh0QLMu_n18YosrSP9E4EA6k5MTzlq1Y'; // Asset In/Out list spreadsheet
  const ASSETS_SHEET_NAME = 'Master'; // Sheet name containing equipment list

  // Full Asset column mapping (0-based) - for getAssetDetails
  const ASSET_DETAIL_COLS = {
    IN_OUT_SERVICE: 0,      // A
    ASSET_GRADE: 1,         // B
    NAME: 2,                // C
    DEPARTMENT: 3,          // D
    ASSET_NUMBER: 4,        // E
    RFID: 5,                // F
    SERIAL_VIN: 6,          // G
    MODEL_NUM: 7,           // H
    MAKE: 8,                // I
    YEAR: 9,                // J
    NOTES: 10,              // K
    TAG_NUM: 11,            // L
    BP_CARD_LAST: 12,       // M
    INVISITAG_GROUP: 13,    // N
    DATE_OF_PURCHASE: 14,   // O
    FUEL_WATER_SEP: 15,     // P
    OIL_TYPE: 16,           // Q
    OIL_CAPACITY: 17,       // R
    OIL_FILTER: 18,         // S
    ENGINE: 19,             // T
    LOCATION: 20,           // U
    FUEL: 21,               // V
    TRUCK_EQUIP_NUM: 22,    // W
    OUTER_AIR_FILTER: 23,   // X
    AIR_FILTER: 24,         // Y
    CQ_INNER_AF: 25,        // Z
    FUEL_FILTER: 26,        // AA
    CQ_OUTER_AF: 27,        // AB
    WIX_OUTER_AF: 28,       // AC
    WIX_INNER_AF: 29,       // AD
    FRONT_TIRE: 30,         // AE
    REAR_TIRE: 31,          // AF
    WIPER: 32,              // AG
    AXLE: 33,               // AH
    HEADLIGHT: 34,          // AI
    HYDRAULIC_FLUID: 35,    // AJ
    HYDRAULIC_FILTER_1: 36, // AK
    HYDRAULIC_FILTER_2: 37, // AL
    HYDRAULIC_FILTER_3: 38, // AM
    WEIGHT_CAPACITY: 39,    // AN
    TEETH_SPEC: 40,         // AO
    REPLACEMENT_COST: 41,   // AP
    TOTAL_REPAIR_COST: 42,  // AQ
    PERCENT_REPLACEMENT: 43,// AR
    REPAIR_STATUS: 44       // AS
  };

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

      // Support both 'action' format and 'function' format (Branches V1 style)
      const action = data.action || data.function || 'getTickets';
      const functionParams = data.parameters || [];

      switch (action) {
        case 'getTickets':
        case 'getRepairTickets':
          result = { success: true, response: { success: true, data: getTickets().data } };
          break;
        case 'getFleetItems':
        case 'getFleetItemsForRepair':
          const fleetResult = getFleetItemsForRepair();
          result = { success: true, response: { success: fleetResult.success, items: fleetResult.items, error: fleetResult.error } };
          break;
        case 'addTicket':
        case 'createRepairTicket':
          const ticketData = functionParams[0] || data;
          const addResult = addTicket({
            item: ticketData.assetName || ticketData.item,
            assignedTo: ticketData.assignedTo,
            notes: ticketData.notes,
            assetId: ticketData.assetId,
            assetType: ticketData.assetType
          });
          result = { success: true, response: addResult };
          break;
        case 'completeTicket':
        case 'completeRepairTicket':
          const completionData = functionParams[0] || data.ticketId;
          const completeResult = completeTicket(completionData);
          result = { success: true, response: completeResult };
          break;
        case 'deleteTicket':
        case 'deleteRepairTicket':
          const deleteId = functionParams[0] || data.ticketId;
          const deleteResult = deleteTicket(deleteId);
          result = { success: true, response: deleteResult };
          break;
        case 'getAssetDetails':
          const assetId = functionParams[0] || data.assetId;
          const assetResult = getAssetDetails(assetId);
          result = { success: true, response: assetResult };
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
  // GET FLEET ITEMS FOR REPAIR (from Assets sheet)
  // ============================================
  function getFleetItemsForRepair() {
    try {
      const ss = SpreadsheetApp.openById(ASSETS_SHEET_ID);
      const sheet = ss.getSheetByName(ASSETS_SHEET_NAME);

      if (!sheet) {
        return { success: false, error: 'Assets sheet not found' };
      }

      const data = sheet.getDataRange().getValues();
      const items = [];

      // Use the global ASSET_DETAIL_COLS for consistent column mapping
      const C = ASSET_DETAIL_COLS;

      // Only include assets with these Invisitag Groups
      const allowedGroups = [
        'powerheads',
        'blower',
        'mower',
        'install truck',
        'heavy machine',
        'maintenance truck',
        'trailer',
        'office truck'
      ];

      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const assetName = String(row[C.NAME] || '').trim();
        const assetNumber = String(row[C.ASSET_NUMBER] || '').trim();
        const rfid = String(row[C.RFID] || '').trim();
        const category = String(row[C.DEPARTMENT] || '').trim();
        const status = String(row[C.REPAIR_STATUS] || '').trim();
        const invisitagGroup = String(row[C.INVISITAG_GROUP] || '').trim().toLowerCase();

        // Skip empty rows
        if (!assetName) continue;

        // Skip if Invisitag Group is not in allowed list
        if (!allowedGroups.includes(invisitagGroup)) continue;

        // Determine display name based on department/category
        let displayName;
        const dept = category.toLowerCase();

        if (dept === 'truck' || dept === 'trucks') {
          // Trucks: Asset Number (Name) - e.g., "301 (2016 Ford F-550)"
          if (assetNumber) {
            displayName = assetNumber + ' (' + assetName + ')';
          } else {
            displayName = assetName;
          }
        } else if (dept === 'trailer' || dept === 'trailers' || dept === 'heavy machine' || dept === 'heavy machines') {
          // Trailers & Heavy Machines: Just Name - e.g., "Horton Equipment Trailer"
          displayName = assetName;
        } else {
          // Everything else: Name (Asset Number) - e.g., "Back Pack Blower (603)"
          if (assetNumber) {
            displayName = assetName + ' (' + assetNumber + ')';
          } else if (rfid) {
            displayName = assetName + ' (RFID: ' + rfid + ')';
          } else {
            displayName = assetName;
          }
        }

        items.push({
          id: assetNumber || rfid || 'ROW-' + i,  // Unique identifier for the item
          name: displayName,                       // Formatted display name
          assetName: assetName,                    // Raw asset name
          assetNumber: assetNumber,
          rfid: rfid,
          type: category || 'Uncategorized',       // Department for grouping
          status: status                           // Repair status from sheet
        });
      }

      // Sort by category, then by name
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });

      return { success: true, items: items };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  // ============================================
  // GET ASSET DETAILS (full stats for sidebar)
  // ============================================
  function getAssetDetails(assetIdentifier) {
    try {
      const ss = SpreadsheetApp.openById(ASSETS_SHEET_ID);
      const sheet = ss.getSheetByName(ASSETS_SHEET_NAME);

      if (!sheet) {
        return { success: false, error: 'Assets sheet not found' };
      }

      const data = sheet.getDataRange().getValues();
      const C = ASSET_DETAIL_COLS;

      // Find asset by Asset Number, RFID, Name, or row ID
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const assetNumber = String(row[C.ASSET_NUMBER] || '').trim();
        const rfid = String(row[C.RFID] || '').trim();
        const name = String(row[C.NAME] || '').trim();
        const rowId = 'ROW-' + i;

        // Match by various identifiers
        if (assetIdentifier === assetNumber ||
            assetIdentifier === rfid ||
            assetIdentifier === rowId ||
            assetIdentifier === name) {

          return {
            success: true,
            asset: {
              // Primary Info
              inOutService: String(row[C.IN_OUT_SERVICE] || ''),
              assetGrade: String(row[C.ASSET_GRADE] || ''),
              name: String(row[C.NAME] || ''),
              department: String(row[C.DEPARTMENT] || ''),
              assetNumber: assetNumber,

              // Identity
              rfid: rfid,
              serialVin: String(row[C.SERIAL_VIN] || ''),
              tagNum: String(row[C.TAG_NUM] || ''),
              bpCardLast: String(row[C.BP_CARD_LAST] || ''),
              invisitagGroup: String(row[C.INVISITAG_GROUP] || ''),

              // Equipment Specs
              make: String(row[C.MAKE] || ''),
              year: String(row[C.YEAR] || ''),
              modelNum: String(row[C.MODEL_NUM] || ''),
              engine: String(row[C.ENGINE] || ''),
              fuel: String(row[C.FUEL] || ''),
              location: String(row[C.LOCATION] || ''),
              truckEquipNum: String(row[C.TRUCK_EQUIP_NUM] || ''),
              weightCapacity: String(row[C.WEIGHT_CAPACITY] || ''),

              // Fluids & Filters
              oilType: String(row[C.OIL_TYPE] || ''),
              oilCapacity: String(row[C.OIL_CAPACITY] || ''),
              oilFilter: String(row[C.OIL_FILTER] || ''),
              fuelWaterSep: String(row[C.FUEL_WATER_SEP] || ''),
              fuelFilter: String(row[C.FUEL_FILTER] || ''),
              airFilter: String(row[C.AIR_FILTER] || ''),
              outerAirFilter: String(row[C.OUTER_AIR_FILTER] || ''),
              cqInnerAF: String(row[C.CQ_INNER_AF] || ''),
              cqOuterAF: String(row[C.CQ_OUTER_AF] || ''),
              wixOuterAF: String(row[C.WIX_OUTER_AF] || ''),
              wixInnerAF: String(row[C.WIX_INNER_AF] || ''),
              hydraulicFluid: String(row[C.HYDRAULIC_FLUID] || ''),
              hydraulicFilter1: String(row[C.HYDRAULIC_FILTER_1] || ''),
              hydraulicFilter2: String(row[C.HYDRAULIC_FILTER_2] || ''),
              hydraulicFilter3: String(row[C.HYDRAULIC_FILTER_3] || ''),

              // Tires & Parts
              frontTire: String(row[C.FRONT_TIRE] || ''),
              rearTire: String(row[C.REAR_TIRE] || ''),
              wiper: String(row[C.WIPER] || ''),
              axle: String(row[C.AXLE] || ''),
              headlight: String(row[C.HEADLIGHT] || ''),
              teethSpec: String(row[C.TEETH_SPEC] || ''),

              // Costs & Status
              replacementCost: parseFloat(row[C.REPLACEMENT_COST]) || 0,
              totalRepairCost: parseFloat(row[C.TOTAL_REPAIR_COST]) || 0,
              percentReplacement: parseFloat(row[C.PERCENT_REPLACEMENT]) || 0,
              repairStatus: String(row[C.REPAIR_STATUS] || ''),

              // Other
              dateOfPurchase: formatDateTime(row[C.DATE_OF_PURCHASE]),
              notes: String(row[C.NOTES] || '')
            }
          };
        }
      }

      return { success: false, error: 'Asset not found: ' + assetIdentifier };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
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
  // PUSH TO EXTERNAL SHEET (Repairs tab)
  // ============================================
  // Columns: Asset Name, Asset ID, Repair ID, Repair Date, Part Name, Part Cost ($),
  //          Labor Hours, Labor Rate ($/hr), Labor Cost ($), Total Repair Cost ($),
  //          Running Total ($), % of Replacement, Days Since Last Repair, Notes
  function pushToExternalSheet(ticketRow, repairDetails, repairDate, completedTime) {
    try {
      const extSS = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
      let extSheet = extSS.getSheetByName(EXTERNAL_SHEET_NAME);

      if (!extSheet) {
        console.error('Repairs sheet not found');
        return false;
      }

      // Generate Repair ID: REP-YYYYMMDD-HHMMSS
      const repairId = 'REP-' + Utilities.formatDate(completedTime, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

      // Get asset info
      const rawAssetName = repairDetails.assetName || String(ticketRow[COLS.ITEM] || '');

      // Extract asset ID and clean asset name based on format
      let assetId = '';
      let cleanAssetName = rawAssetName;

      // Try old format: [ID: xxx] or [RFID: xxx]
      const idMatch = rawAssetName.match(/\[ID:\s*([^\]]+)\]/);
      const rfidMatch = rawAssetName.match(/\[RFID:\s*([^\]]+)\]/);

      if (idMatch) {
        assetId = idMatch[1].trim();
        cleanAssetName = rawAssetName.replace(/\s*\[(ID|RFID|No ID):[^\]]*\]/g, '').trim();
      } else if (rfidMatch) {
        assetId = rfidMatch[1].trim();
        cleanAssetName = rawAssetName.replace(/\s*\[(ID|RFID|No ID):[^\]]*\]/g, '').trim();
      } else {
        // Try new display name formats
        // Truck format: "301 (2016 Ford F-550)" - asset number at start, name in parentheses
        const truckMatch = rawAssetName.match(/^(\d+)\s*\((.+)\)$/);
        // Equipment format: "Back Pack Blower (603)" - name first, asset number in parentheses at end
        const equipMatch = rawAssetName.match(/^(.+?)\s*\((\d+)\)$/);

        if (truckMatch) {
          assetId = truckMatch[1];
          cleanAssetName = truckMatch[2].trim();
        } else if (equipMatch) {
          assetId = equipMatch[2];
          cleanAssetName = equipMatch[1].trim();
        }
        // If no pattern matches, cleanAssetName stays as rawAssetName and assetId stays empty
      }

      // Parse part cost from part details if $ amount included
      let partCost = 0;
      let partName = repairDetails.partDetails || '';
      if (partName) {
        const costMatch = partName.match(/\$\s*([\d,]+\.?\d*)/);
        if (costMatch) {
          partCost = parseFloat(costMatch[1].replace(',', '')) || 0;
        }
      }

      // Calculate costs
      const laborHours = repairDetails.laborHours || 0;
      const laborRate = repairDetails.laborRate || 80;
      const laborCost = laborHours * laborRate;
      const totalRepairCost = laborCost + partCost;

      // Combine notes
      const combinedNotes = [
        repairDetails.taskDescription || '',
        repairDetails.additionalNotes ? 'Notes: ' + repairDetails.additionalNotes : '',
        ticketRow[COLS.NOTES] ? 'Original Issue: ' + String(ticketRow[COLS.NOTES]) : ''
      ].filter(n => n).join(' | ');

      // Append to Repairs sheet
      extSheet.appendRow([
        cleanAssetName,     // A - Asset Name (must be first for Decision page aggregation)
        assetId,            // B - Asset ID
        repairId,           // C - Repair ID
        repairDate,         // D - Repair Date
        partName,           // E - Part Name
        partCost,           // F - Part Cost ($)
        laborHours,         // G - Labor Hours
        laborRate,          // H - Labor Rate ($/hr)
        laborCost,          // I - Labor Cost ($)
        totalRepairCost,    // J - Total Repair Cost ($)
        '',                 // K - Running Total ($) - for your formula
        '',                 // L - % of Replacement - for your formula
        '',                 // M - Days Since Last Repair - for your formula
        combinedNotes       // N - Notes
      ]);

      return true;
    } catch (error) {
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
   function testGetFleetItems() {
    const result = getFleetItemsForRepair();
    Logger.log('Success: ' + result.success);
    Logger.log('Error: ' + result.error);
    Logger.log('Number of items: ' + (result.items ? result.items.length : 0));
    if (result.items && result.items.length > 0) {
      Logger.log('First item: ' + JSON.stringify(result.items[0]));
    }
  }
