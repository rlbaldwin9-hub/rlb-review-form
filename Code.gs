// ============================================================
//  RLB Designs — Review Logger & Auto-Approver
//  Paste this entire file into Google Apps Script
//  (Extensions → Apps Script inside your Google Sheet)
// ============================================================

// Column layout in your Sheet (DO NOT change order):
// A: Timestamp | B: Status | C: Rating (number) | D: Rating Label
// E: Book Category | F: Book Title | G: Where Purchased
// H: Review Headline | I: Review Body | J: Reader Type
// K: First Name | L: Email | M: Consent | N: Display Name

const SHEET_NAME = "Reviews";
const AUTO_APPROVE_THRESHOLD = 4; // 4 and 5 stars auto-approve

// ------------------------------------------------------------
//  doPost — receives the Formspree webhook POST
// ------------------------------------------------------------
function doPost(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // Create sheet + headers if this is the first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp", "Status", "Rating (num)", "Rating Label",
        "Book Category", "Book Title", "Where Purchased",
        "Review Headline", "Review Body", "Reader Type",
        "First Name", "Email", "Consent", "Display Name"
      ]);
      // Freeze header row & basic formatting
      sheet.setFrozenRows(1);
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#3d5c40").setFontColor("#f5f0e8");
      sheet.setColumnWidths(1, 14, 160);
      sheet.getRange("I:I").setColumnWidth(320); // wider for review body
    }

    // Parse the incoming JSON payload from Formspree
    const payload = JSON.parse(e.postData.contents);

    const ratingRaw   = payload.rating || "";
    const ratingNum   = parseInt(ratingRaw) || 0;
    const ratingLabel = payload.rating ? ratingRaw.replace(/^\d+\s*-?\s*stars?\s*[-—]\s*/i, "").trim() : "";
    const firstName   = (payload.first_name || "").trim();
    const displayName = firstName ? firstName : "A Reader";

    // Auto-approve logic
    const status = ratingNum >= AUTO_APPROVE_THRESHOLD ? "Approved" : "Pending";

    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      status,
      ratingNum,
      ratingLabel,
      payload.book_category   || "",
      payload.book_title      || "",
      payload.where_purchased || "",
      payload.review_headline || "",
      payload.review_body     || "",
      payload.reader_type     || "",
      firstName,
      payload.email           || "",
      payload.consent         || "No",
      displayName
    ]);

    // Colour-code the Status cell
    const lastRow   = sheet.getLastRow();
    const statusCell = sheet.getRange(lastRow, 2);
    if (status === "Approved") {
      statusCell.setBackground("#d4edda").setFontColor("#155724");
    } else {
      statusCell.setBackground("#fff3cd").setFontColor("#856404");
    }

    // Send yourself a notification email
    sendNotificationEmail(payload, status, ratingNum);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------
//  doGet — returns approved reviews as JSON for the display page
// ------------------------------------------------------------
function doGet(e) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ reviews: [] });
    }

    const data    = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows    = data.slice(1);

    const reviews = rows
      .filter(row => row[1] === "Approved" && row[8]) // Status = Approved & has review body
      .map(row => ({
        timestamp:       row[0],
        rating:          row[2],
        ratingLabel:     row[3],
        bookCategory:    row[4],
        bookTitle:       row[5],
        reviewHeadline:  row[7],
        reviewBody:      row[8],
        readerType:      row[9],
        displayName:     row[13]
      }))
      .reverse(); // newest first

    return jsonResponse({ reviews: reviews });

  } catch (err) {
    Logger.log("doGet error: " + err.toString());
    return jsonResponse({ reviews: [], error: err.toString() });
  }
}

// ------------------------------------------------------------
//  Helper: return JSON response with CORS headers
// ------------------------------------------------------------
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
//  Helper: email notification to you on each new submission
// ------------------------------------------------------------
function sendNotificationEmail(payload, status, ratingNum) {
  try {
    const recipient = Session.getActiveUser().getEmail();
    const stars     = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
    const subject   = `[RLB Reviews] ${status === "Approved" ? "✅ New Review Live" : "⏳ Review Needs Approval"} — ${payload.book_title || "Unknown Title"}`;

    const body = `
A new reader review has been submitted.

Status:    ${status}
Rating:    ${stars} (${ratingNum}/5)
Book:      ${payload.book_title || "Not specified"}
Category:  ${payload.book_category || "Not specified"}
Reviewer:  ${payload.first_name || "Anonymous"}
Headline:  ${payload.review_headline || ""}

Review:
${payload.review_body || ""}

${status === "Pending" ? "👉 Open your Reviews Sheet to approve or reject this review." : "✅ This review was auto-approved and is now live on your site."}

— RLB Designs Review System
    `.trim();

    MailApp.sendEmail(recipient, subject, body);
  } catch (err) {
    Logger.log("Email error: " + err.toString());
  }
}

// ------------------------------------------------------------
//  Utility: run this once manually to create headers if needed
// ------------------------------------------------------------
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_NAME)) {
    doPost({ postData: { contents: JSON.stringify({
      rating: "5 stars — Outstanding!",
      book_category: "Test",
      book_title: "Setup Test",
      review_headline: "Setup",
      review_body: "This is a setup test review body.",
      first_name: "Rachel",
      consent: "Yes"
    })}});
  }
  Logger.log("Setup complete.");
}
