const https = require('https');

/**
 * Send WhatsApp Notification via Termii API
 * @param {string} phoneNumber - Recipient phone number (e.g. +234... or 234...)
 * @param {string} messageText - The message content to send
 */
async function sendWhatsAppNotification(phoneNumber, messageText) {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || 'DupsyTT';

  // Format phone number to clean international string without leading + or spaces
  const cleanPhone = phoneNumber.replace(/[\s\-\+\(\)]/g, '');

  if (!apiKey) {
    console.log(`[WhatsApp Mock Dispatch] To: ${cleanPhone} | Message: ${messageText}`);
    return { success: true, mock: true };
  }

  const payload = JSON.stringify({
    to: cleanPhone,
    from: senderId,
    sms: messageText,
    type: 'plain',
    channel: 'whatsapp',
    api_key: apiKey
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.ng.termii.com',
      path: '/api/sms/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          console.log(`[WhatsApp Success] Sent to ${cleanPhone}:`, parsed.message_id || parsed.message);
          resolve({ success: true, data: parsed });
        } catch (e) {
          console.log(`[WhatsApp Response] Sent to ${cleanPhone}: ${responseBody}`);
          resolve({ success: true, data: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[WhatsApp Error] Failed to send to ${cleanPhone}:`, err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  sendWhatsAppNotification
};
