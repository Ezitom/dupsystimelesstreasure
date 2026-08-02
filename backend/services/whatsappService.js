/**
 * whatsappService.js
 * Reusable Twilio WhatsApp notification service for Dupsy's Timeless Treasure.
 *
 * Reads credentials exclusively from environment variables:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER  (format: whatsapp:+1415XXXXXXX)
 *
 * sendWhatsAppMessage(toPhoneNumber, messageBody)
 *   - Normalises the recipient number to the whatsapp:+E.164 format required by Twilio.
 *   - Validates that the number contains a country code (starts with +).
 *   - Returns a result object { success, sid } or { success: false, error }.
 *   - NEVER throws — a failed send will not crash the booking / payment flow.
 */

'use strict';

let twilioClient = null;
let twilioFrom   = null;

/**
 * Initialise the Twilio REST client eagerly at module load time.
 * Logs a loud startup error if any required env var is missing.
 */
function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  twilioFrom       = process.env.TWILIO_WHATSAPP_NUMBER;

  const missing = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!authToken)  missing.push('TWILIO_AUTH_TOKEN');
  if (!twilioFrom) missing.push('TWILIO_WHATSAPP_NUMBER');

  if (missing.length > 0) {
    console.error(
      `[WhatsApp] MISSING required env vars: ${missing.join(', ')}. ` +
      'WhatsApp notifications will FAIL. Add these to your .env and restart.'
    );
    return null;
  }

  const twilio = require('twilio');
  twilioClient = twilio(accountSid, authToken);
  console.log('[WhatsApp] Twilio client initialised successfully.');
  return twilioClient;
}

/**
 * Normalise a phone number to the `whatsapp:+E.164` format Twilio expects.
 *
 * Accepts any of:
 *   +2348012345678
 *   2348012345678
 *   +1 (555) 234-5678
 *   whatsapp:+2348012345678  (already formatted — passthrough)
 *
 * Returns null if the number cannot be normalised (e.g. missing country code).
 */
function normalisePhoneNumber(raw) {
  if (!raw || typeof raw !== 'string') return null;

  // Strip the whatsapp: prefix if already present
  let cleaned = raw.trim().replace(/^whatsapp:/i, '');

  // Remove all whitespace, dashes, parentheses, dots
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    // Already has country code — validate E.164: + followed by 7–15 digits
    if (!/^\+\d{7,15}$/.test(cleaned)) {
      console.warn(`[WhatsApp] Phone "${raw}" has + prefix but failed E.164 validation.`);
      return null;
    }
    return `whatsapp:${cleaned}`;
  }

  // No + prefix — try to determine the country code
  if (/^\d+$/.test(cleaned)) {
    if (cleaned.length >= 11 && cleaned.length <= 15) {
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        // Local Nigerian format: 08143905306 → strip leading 0, prepend +234
        // This handles the most common case. Generalised: strip leading 0 and
        // prepend + only for 11-digit numbers that start with 0.
        console.warn(
          `[WhatsApp] Phone "${raw}" looks like a local number (leading 0). ` +
          `Assuming Nigeria (+234). Customer should submit with country code.`
        );
        cleaned = '+234' + cleaned.slice(1);
      } else {
        // 11–15 digits with no leading 0 — treat as bare international (missing +)
        cleaned = '+' + cleaned;
      }
    } else {
      console.warn(`[WhatsApp] Phone "${raw}" has ${cleaned.length} digits — cannot determine country code.`);
      return null;
    }
  } else {
    return null;
  }

  // Final E.164 validation
  if (!/^\+\d{7,15}$/.test(cleaned)) {
    console.warn(`[WhatsApp] Phone "${raw}" could not be normalised to E.164: "${cleaned}"`);
    return null;
  }

  return `whatsapp:${cleaned}`;
}

/**
 * Validate that a raw phone string is WhatsApp-reachable (has a country code).
 *
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required.' };
  }

  const normalised = normalisePhoneNumber(phone);
  if (!normalised) {
    return {
      valid: false,
      error:
        'Phone number must include a country code and be in international format (e.g. +2348012345678 or +15551234567).'
    };
  }

  return { valid: true };
}

/**
 * Send a WhatsApp message via Twilio.
 *
 * @param {string} toPhoneNumber  - Recipient phone (any common format with country code)
 * @param {string} messageBody    - Plain-text message content
 * @returns {Promise<{ success: boolean, sid?: string, mock?: boolean, error?: string }>}
 */
async function sendWhatsAppMessage(toPhoneNumber, messageBody) {
  const to = normalisePhoneNumber(toPhoneNumber);

  if (!to) {
    const errMsg = `[WhatsApp] Invalid / unformattable phone number: "${toPhoneNumber}". Message not sent.`;
    console.error(errMsg);
    return { success: false, error: errMsg };
  }

  const client = getTwilioClient();

  if (!client) {
    // Credentials are missing — log a hard error, do NOT silently mock
    const errMsg = `[WhatsApp] Cannot send to ${to}: Twilio client not initialised. Check env vars.`;
    console.error(errMsg);
    return { success: false, error: errMsg };
  }

  try {
    const message = await client.messages.create({
      from: twilioFrom,
      to,
      body: messageBody
    });

    console.log(`[WhatsApp Sent] ✓ To: ${to} | SID: ${message.sid}`);
    return { success: true, sid: message.sid };

  } catch (err) {
    // Log the full Twilio error — never re-throw so the HTTP response is not blocked
    console.error(
      `[WhatsApp Error] ✗ Failed to send to ${to}: ${err.message}` +
      (err.code ? ` (Twilio code: ${err.code})` : '')
    );
    return { success: false, error: err.message, code: err.code };
  }
}

// ---------------------------------------------------------------------------
// Named message-template helpers
// Each function accepts the booking object (and any extra data) and calls
// sendWhatsAppMessage with a well-crafted, branded message body.
// ---------------------------------------------------------------------------

/**
 * Notify customer that their booking has been received.
 * Trigger: immediately after POST /api/bookings
 */
async function notifyBookingReceived(booking, trackingLink) {
  const body =
    `*Dupsy's Timeless Treasure: Booking Received*\n\n` +
    `Hello ${booking.full_name}, we've received your booking request for *${booking.product_name}*.\n\n` +
    `*Reference:* ${booking.reference}\n` +
    `*Preferred Date:* ${booking.preferred_date}\n` +
    `*Status:* Pending Review\n\n` +
    `Our atelier team will review your request shortly and reach out with next steps.\n\n` +
    `Track your order anytime: ${trackingLink}`;

  return sendWhatsAppMessage(booking.phone, body);
}

/**
 * Notify customer that a payment link has been sent.
 * Trigger: PATCH /api/bookings/:id/payment-link
 */
async function notifyPaymentLinkSent(booking, paymentLink, trackingLink) {
  const body =
    `*Dupsy's Timeless Treasure: Payment Required*\n\n` +
    `Hello ${booking.full_name}, great news! Your booking for *${booking.product_name}* (Ref: ${booking.reference}) has been approved.\n\n` +
    `To confirm your order, please complete your payment using the secure link below:\n` +
    `Payment Link: ${paymentLink}\n\n` +
    `Once payment is received, we'll begin crafting your piece.\n\n` +
    `Track your order: ${trackingLink}`;

  return sendWhatsAppMessage(booking.phone, body);
}

/**
 * Notify customer that payment has been confirmed and order is being processed.
 * Trigger: PATCH /api/bookings/:id/status → status = 'confirmed'
 */
async function notifyPaymentConfirmed(booking, trackingLink) {
  const body =
    `*Dupsy's Timeless Treasure: Payment Confirmed*\n\n` +
    `Hello ${booking.full_name}, your payment for *${booking.product_name}* (Ref: ${booking.reference}) has been received and confirmed.\n\n` +
    `Our master goldsmith has begun work on your piece. We'll notify you as soon as it ships.\n\n` +
    `Track your order: ${trackingLink}`;

  return sendWhatsAppMessage(booking.phone, body);
}

/**
 * Notify customer that the order is shipped / out for delivery.
 * Trigger: PATCH /api/bookings/:id/status → status = 'shipped'
 * @param {object} booking
 * @param {string} trackingLink
 * @param {string} pickupLocation  - Park/garage name and address set by admin
 * @param {string} pickupContact   - Phone number to call at the pickup point
 */
async function notifyOrderShipped(booking, trackingLink, pickupLocation, pickupContact) {
  const body =
    `*Dupsy's Timeless Treasure: Order Dispatched*\n\n` +
    `Hello ${booking.full_name}, your order *${booking.product_name}* (Ref: ${booking.reference}) is now on its way to you!\n\n` +
    `*Status:* Out for Delivery\n\n` +
    `*Pickup Location:* ${pickupLocation}\n` +
    `*Contact at Pickup:* ${pickupContact}\n\n` +
    `Please call the number above when you arrive to collect your package.\n` +
    `Handle with care: this is a handcrafted luxury piece.\n\n` +
    `Track your order: ${trackingLink}`;

  return sendWhatsAppMessage(booking.phone, body);
}

/**
 * Notify customer that the order has been delivered.
 * Trigger: PATCH /api/bookings/:id/status → status = 'delivered'
 */
async function notifyOrderDelivered(booking, trackingLink) {
  const body =
    `*Dupsy's Timeless Treasure: Delivered*\n\n` +
    `Hello ${booking.full_name}, your *${booking.product_name}* (Ref: ${booking.reference}) has been delivered!\n\n` +
    `We hope you love your piece as much as we loved crafting it.\n\n` +
    `If you have any questions or would like to commission another piece, please don't hesitate to reach out.\n\n` +
    `Thank you for choosing Dupsy's Timeless Treasure.`;

  return sendWhatsAppMessage(booking.phone, body);
}

module.exports = {
  sendWhatsAppMessage,
  validatePhoneNumber,
  notifyBookingReceived,
  notifyPaymentLinkSent,
  notifyPaymentConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered
};
