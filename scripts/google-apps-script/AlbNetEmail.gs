/**
 * AlbNet Email – Google Apps Script (GmailApp)
 * Projekt: https://script.google.com/home/projects/164pLMBRLrmLtMloKs3Akfz5g38SBoQVlXASnqVQj3MIRMBH7hEDXKNc2/edit
 *
 * KONFIGURIM (1 herë):
 * 1. Kopjo këtë kod në projektin tënd Apps Script
 * 2. Project Settings → Script properties → shto:
 *      ALBNET_SECRET = albnet_gas_email_2026_k8m2  (ose çfarëdo sekreti)
 *      FROM_NAME = AlbNet
 * 3. Deploy → New deployment → Type: Web app
 *      Execute as: Me (selatinhaliti6@gmail.com)
 *      Who has access: Anyone
 * 4. Kopjo URL që mbaron me /exec → vendos në backend/.env si GOOGLE_APPS_SCRIPT_URL
 */

var PROP_SECRET = 'ALBNET_SECRET';
var PROP_FROM_NAME = 'FROM_NAME';
var DEFAULT_FROM_NAME = 'AlbNet';

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSecret_() {
  return (PropertiesService.getScriptProperties().getProperty(PROP_SECRET) || '').trim();
}

function authorized_(secret) {
  var expected = getSecret_();
  return expected && String(secret || '').trim() === expected;
}

function stripHtml_(html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sendEmail_(to, subject, html) {
  var fromName =
    PropertiesService.getScriptProperties().getProperty(PROP_FROM_NAME) || DEFAULT_FROM_NAME;
  GmailApp.sendEmail(to, subject, stripHtml_(html).slice(0, 500), {
    htmlBody: html,
    name: fromName,
  });
}

function doGet(e) {
  var secret = (e && e.parameter && e.parameter.secret) || '';
  if (!authorized_(secret)) {
    return jsonResponse({ ok: false, error: 'Unauthorized' });
  }
  return jsonResponse({
    ok: true,
    provider: 'gas',
    message: 'AlbNet Email API aktiv',
    user: Session.getActiveUser().getEmail(),
  });
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (!authorized_(body.secret)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    var to = String(body.to || '').trim();
    var subject = String(body.subject || '').trim();
    var html = String(body.html || '').trim();
    if (!to || to.indexOf('@') === -1 || !subject || !html) {
      return jsonResponse({ ok: false, error: 'to, subject, html required' });
    }
    sendEmail_(to, subject, html);
    return jsonResponse({ ok: true, provider: 'gas' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

/** Test nga editor: Run → testAlbNetEmail */
function testAlbNetEmail() {
  if (!getSecret_()) {
    throw new Error('Vendos ALBNET_SECRET në Script properties');
  }
  var me = Session.getActiveUser().getEmail();
  sendEmail_(me, 'AlbNet GAS Test', '<p>✅ AlbNet Apps Script funksionon</p>');
}
