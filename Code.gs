// ============================================================
//  RLB Designs — Review Logger & Auto-Approver  v2.0
//  Handles: Books, Creator Apps, Tutorials, Website/Blog
//
//  HOW TO INSTALL:
//  1. Open your RLB Reader Reviews Google Sheet
//  2. Click Extensions → Apps Script
//  3. Delete all existing code
//  4. Paste this entire file
//  5. Click Save (Ctrl+S), name project "RLB Reviews"
//  6. Click Deploy → Manage Deployments
//  7. Edit your existing deployment → set to New Version → Deploy
//  Your Web App URL stays exactly the same — nothing else to update
// ============================================================

var SHEET_NAME             = 'Reviews';
var AUTO_APPROVE_THRESHOLD = 4;  // 4 and 5 stars auto-approve; 1-3 stay Pending

// Column order — DO NOT change without also updating getRowData()
var HEADERS = [
  'Timestamp',        // A
  'Status',           // B
  'Review Type',      // C
  'Rating (num)',     // D
  'Rating Label',     // E
  // ── Book fields ──
  'Book Category',    // F
  'Book Title',       // G
  'Where Purchased',  // H
  // ── App fields ──
  'App Name',         // I
  // ── Tutorial fields ──
  'Tutorial Topic',   // J
  'Tutorial Name',    // K
  // ── Website fields ──
  'Website Area',     // L
  // ── Shared fields ──
  'How Heard',        // M
  'Review Headline',  // N
  'Review Body',      // O
  'Reader Type',      // P
  'First Name',       // Q
  'Email',            // R
  'Public Consent',   // S
  'Age Confirmed',    // T
  'Display Name'      // U
];

// ============================================================
//  doPost — receives form submission
// ============================================================
function doPost(e) {
  try {
    var sheet = getOrCreateSheet();
    var payload = parsePayload(e);

    var ratingRaw  = payload.rating || '';
    var ratingNum  = 0;
    var ratingLabel = '';

    // Parse "5 stars — Outstanding!" format
    var ratingMatch = ratingRaw.match(/^(\d+)/);
    if (ratingMatch) {
      ratingNum = parseInt(ratingMatch[1], 10);
    }
    var dashIndex = ratingRaw.indexOf('—');
    if (dashIndex !== -1) {
      ratingLabel = ratingRaw.substring(dashIndex + 1).trim();
    }

    // Auto-approve logic:
    // Books with 4-5 stars → Approved
    // Books with 1-3 stars → Pending
    // Apps/Tutorials/Website with any rating → Approved (feedback always welcome)
    var reviewType = payload.review_type || 'Book';
    var status;
    if (reviewType === 'Book') {
      status = (ratingNum >= AUTO_APPROVE_THRESHOLD) ? 'Approved' : 'Pending';
    } else {
      status = ratingNum > 0
        ? (ratingNum >= AUTO_APPROVE_THRESHOLD ? 'Approved' : 'Pending')
        : 'Approved';
    }

    var firstName   = (payload.first_name || '').trim();
    var displayName = firstName ? firstName : 'A Reader';

    var row = [
      new Date(),                          // A Timestamp
      status,                              // B Status
      reviewType,                          // C Review Type
      ratingNum || '',                     // D Rating (num)
      ratingLabel,                         // E Rating Label
      payload.book_category   || '',       // F Book Category
      payload.book_title      || '',       // G Book Title
      payload.where_purchased || '',       // H Where Purchased
      payload.app_name        || '',       // I App Name
      payload.tutorial_topic  || '',       // J Tutorial Topic
      payload.tutorial_name   || '',       // K Tutorial Name
      payload.website_area    || '',       // L Website Area
      payload.how_heard       || '',       // M How Heard
      payload.review_headline || '',       // N Review Headline
      payload.review_body     || '',       // O Review Body
      payload.reader_type     || '',       // P Reader Type
      firstName,                           // Q First Name
      payload.email           || '',       // R Email
      payload.public_consent  || '',       // S Public Consent
      payload.age_confirmed   || '',       // T Age Confirmed
      displayName                          // U Display Name
    ];

    sheet.appendRow(row);

    // Colour-code the Status cell
    var lastRow   = sheet.getLastRow();
    var statusCell = sheet.getRange(lastRow, 2);
    if (status === 'Approved') {
      statusCell.setBackground('#d4edda').setFontColor('#155724');
    } else {
      statusCell.setBackground('#fff3cd').setFontColor('#856404');
    }

    // Colour-code the Review Type cell
    var typeColors = {
      'Book':           { bg: '#dce8ff', fg: '#1a3a6b' },
      'Creator App':    { bg: '#e8d5ff', fg: '#4a1a6b' },
      'Tutorial':       { bg: '#fde8c8', fg: '#6b3a00' },
      'Website / Blog': { bg: '#d5f0e8', fg: '#0a4a2a' }
    };
    var typeColor = typeColors[reviewType];
    if (typeColor) {
      sheet.getRange(lastRow, 3).setBackground(typeColor.bg).setFontColor(typeColor.fg);
    }

    sendNotificationEmail(payload, status, ratingNum, reviewType);

    return jsonResponse({ result: 'success' });

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ result: 'error', message: err.toString() });
  }
}

// ============================================================
//  doGet — returns approved reviews as JSON for reviews.html
// ============================================================
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var data  = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return jsonResponse({ reviews: [] });
    }

    var rows = data.slice(1); // skip header row

    var reviews = rows
      .filter(function(row) {
        return row[1] === 'Approved' && row[14]; // Status=Approved & has review body
      })
      .map(function(row) {
        return {
          timestamp:      row[0],
          status:         row[1],
          reviewType:     row[2],
          rating:         row[3],
          ratingLabel:    row[4],
          bookCategory:   row[5],
          bookTitle:      row[6],
          appName:        row[8],
          tutorialTopic:  row[9],
          tutorialName:   row[10],
          websiteArea:    row[11],
          reviewHeadline: row[13],
          reviewBody:     row[14],
          readerType:     row[15],
          displayName:    row[20]
        };
      })
      .reverse(); // newest first

    return jsonResponse({ reviews: reviews });

  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return jsonResponse({ reviews: [], error: err.toString() });
  }
}

// ============================================================
//  Helper: get or create the Reviews sheet with headers
// ============================================================
function getOrCreateSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    // Formatting
    var headerRange = sheet.getRange('1:1');
    headerRange
      .setFontWeight('bold')
      .setBackground('#3d5c40')
      .setFontColor('#f5f0e8');

    sheet.setFrozenRows(1);

    // Set column widths
    sheet.setColumnWidth(1, 160);  // Timestamp
    sheet.setColumnWidth(2, 90);   // Status
    sheet.setColumnWidth(3, 110);  // Review Type
    sheet.setColumnWidth(4, 80);   // Rating num
    sheet.setColumnWidth(5, 110);  // Rating label
    sheet.setColumnWidth(6, 160);  // Book Category
    sheet.setColumnWidth(7, 200);  // Book Title
    sheet.setColumnWidth(8, 140);  // Where Purchased
    sheet.setColumnWidth(9, 200);  // App Name
    sheet.setColumnWidth(10, 180); // Tutorial Topic
    sheet.setColumnWidth(11, 220); // Tutorial Name
    sheet.setColumnWidth(12, 160); // Website Area
    sheet.setColumnWidth(13, 160); // How Heard
    sheet.setColumnWidth(14, 220); // Review Headline
    sheet.setColumnWidth(15, 380); // Review Body
    sheet.setColumnWidth(16, 140); // Reader Type
    sheet.setColumnWidth(17, 120); // First Name
    sheet.setColumnWidth(18, 180); // Email
    sheet.setColumnWidth(19, 200); // Public Consent
    sheet.setColumnWidth(20, 100); // Age Confirmed
    sheet.setColumnWidth(21, 120); // Display Name
  }

  return sheet;
}

// ============================================================
//  Helper: parse POST payload (JSON or form-encoded)
// ============================================================
function parsePayload(e) {
  var payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    // Fall back to form parameters
    payload = (e && e.parameter) ? e.parameter : {};
  }
  return payload;
}

// ============================================================
//  Helper: return JSON response
// ============================================================
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  Helper: send notification email on each submission
// ============================================================
function sendNotificationEmail(payload, status, ratingNum, reviewType) {
  try {
    var recipient = Session.getActiveUser().getEmail();
    var stars     = ratingNum > 0
      ? ('★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum) + ' (' + ratingNum + '/5)')
      : 'No rating given';

    var statusIcon = status === 'Approved' ? '✅' : '⏳';
    var subject    = '[RLB Reviews] ' + statusIcon + ' New ' + reviewType + ' Review';

    // Build the subject line detail based on type
    var subjectDetail = '';
    if (reviewType === 'Book')           { subjectDetail = payload.book_title || 'Unknown Title'; }
    if (reviewType === 'Creator App')    { subjectDetail = payload.app_name   || 'Unknown App'; }
    if (reviewType === 'Tutorial')       { subjectDetail = payload.tutorial_name || payload.tutorial_topic || 'Unknown Tutorial'; }
    if (reviewType === 'Website / Blog') { subjectDetail = payload.website_area  || 'General'; }
    if (subjectDetail) { subject += ' — ' + subjectDetail; }

    var body = [
      'A new review has been submitted on RLBDesigns.com.',
      '',
      'STATUS:       ' + status,
      'TYPE:         ' + reviewType,
      'RATING:       ' + stars,
      ''
    ];

    if (reviewType === 'Book') {
      body.push('CATEGORY:     ' + (payload.book_category || '—'));
      body.push('TITLE:        ' + (payload.book_title    || '—'));
    }
    if (reviewType === 'Creator App') {
      body.push('APP:          ' + (payload.app_name || '—'));
    }
    if (reviewType === 'Tutorial') {
      body.push('TUTORIAL:     ' + (payload.tutorial_topic || '—'));
      body.push('SPECIFIC:     ' + (payload.tutorial_name  || '—'));
    }
    if (reviewType === 'Website / Blog') {
      body.push('AREA:         ' + (payload.website_area || '—'));
    }

    body.push('');
    body.push('REVIEWER:     ' + (payload.first_name || 'Anonymous'));
    body.push('HEADLINE:     ' + (payload.review_headline || '—'));
    body.push('');
    body.push('REVIEW:');
    body.push(payload.review_body || '—');
    body.push('');
    body.push('CONSENT:      ' + (payload.public_consent || '—'));
    body.push('');

    if (status === 'Pending') {
      body.push('👉 Open your Reviews Sheet to approve or reject this review.');
      body.push('   Change column B from "Pending" to "Approved" to publish it.');
    } else {
      body.push('✅ This review was auto-approved and is now live on your site.');
    }

    body.push('');
    body.push('— RLB Designs Review System v2.0');

    MailApp.sendEmail(recipient, subject, body.join('\n'));

  } catch (err) {
    Logger.log('Email error: ' + err.toString());
  }
}

// ============================================================
//  Utility: run this ONCE manually after pasting to verify
//  setup — creates the sheet and headers if they don't exist
// ============================================================
function setupSheet() {
  var sheet = getOrCreateSheet();
  Logger.log('Setup complete. Sheet "' + SHEET_NAME + '" is ready with ' + HEADERS.length + ' columns.');
}
