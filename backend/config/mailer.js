const nodemailer = require('nodemailer');
const path = require('path');

// Dynamically create or refresh Nodemailer Transporter using current .env
function getTransporter() {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  let pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;

  if (pass) {
    // Strip spaces if user pasted a Gmail App Password formatted as "abcd efgh ijkl mnop"
    pass = pass.replace(/\s+/g, '');
  }

  if (user && pass) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    // On cloud hosts like Render, port 465 (SSL) is blocked or drops packets.
    // Port 587 with secure: false and requireTLS: true uses STARTTLS and works reliably.
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const isPort465 = port === 465;

    return nodemailer.createTransport({
      host: host,
      port: isPort465 ? 587 : port, // Force 587 if defaulting to prevent port 465 cloud timeout
      secure: false, // Must be false for 587 STARTTLS
      requireTLS: true,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 8000, // 8 seconds fast-fail
      greetingTimeout: 8000,
      socketTimeout: 12000
    });
  }

  console.error(
    '[Email] SMTP credentials not configured (neither SMTP_USER/SMTP_PASS nor GMAIL_USER/GMAIL_APP_PASSWORD set). ' +
    'Email notifications will FAIL. Add credentials to Render environment variables.'
  );
  return null;
}

function getDefaultFrom() {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  return process.env.EMAIL_FROM || (user ? `"Dupsy's Timeless Treasure" <${user}>` : '"Dupsy\'s Timeless Treasure" <oniebenezer1@gmail.com>');
}

async function sendMail(mailOptions) {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

  // 1. Primary Cloud Provider Support: Resend API (HTTP Port 443 - Never blocked on Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const apiKey = process.env.RESEND_API_KEY.trim();
      const fromAddr = process.env.EMAIL_FROM || 'Dupsy\'s Timeless Treasure <onboarding@resend.dev>';
      const toAddr = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: toAddr,
          subject: mailOptions.subject,
          html: mailOptions.html,
          reply_to: mailOptions.replyTo
        })
      });

      const data = await res.json();
      if (res.ok && data.id) {
        console.log(`[Resend API Sent] ✓ To: ${mailOptions.to} | Subject: ${mailOptions.subject} | ID: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        const errDetail = data.message || data.error || JSON.stringify(data);
        console.error(`[Resend API Error] ✗ Failed to send to ${mailOptions.to}: ${errDetail}`);
        return { success: false, error: errDetail };
      }
    } catch (err) {
      console.error(`[Resend API Exception] ✗ ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // 2. Fallback: Nodemailer Transport (SMTP)
  const activeTransporter = getTransporter();
  
  if (!mailOptions.from) {
    mailOptions.from = getDefaultFrom();
  }

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail(mailOptions);
      console.log(`[Email Sent] ✓ To: ${mailOptions.to} | Subject: ${mailOptions.subject} | MsgID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Error] ✗ Failed to send to ${mailOptions.to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  } else {
    const errMsg = `[Email] Cannot send to ${mailOptions.to}: No email credentials set. Add RESEND_API_KEY or SMTP_USER/SMTP_PASS in Render Environment Variables.`;
    console.error(errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Send Booking Confirmation Email
 */
async function sendBookingConfirmationEmail(booking, magicLink) {
  const html = `
    <div style="background-color: #0a0a0a; color: #f5f5f5; font-family: sans-serif; padding: 30px; border: 1px solid #d4af37;">
      <h2 style="color: #d4af37; font-size: 24px; margin-top: 0;">Dupsy's Timeless Treasure</h2>
      <p>Dear ${booking.full_name},</p>
      <p>Thank you for submitting your fitting reservation request. Your unique reference code is:</p>
      <div style="background-color: #141414; border: 1px solid #d4af37; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #d4af37; letter-spacing: 2px; margin: 20px 0;">
        ${booking.reference}
      </div>
      <p><strong>Booking Details:</strong></p>
      <ul style="line-height: 1.8; color: #c7c7c7;">
        <li><strong style="color: #f5f5f5;">Jewelry Piece / Service:</strong> ${booking.product_name}</li>
        <li><strong style="color: #f5f5f5;">Category:</strong> ${booking.category}</li>
        <li><strong style="color: #f5f5f5;">Preferred Date:</strong> ${booking.preferred_date}</li>
        <li><strong style="color: #f5f5f5;">Initial Status:</strong> PENDING</li>
        <li><strong style="color: #f5f5f5;">Delivery Address:</strong> ${booking.address}</li>
      </ul>
      <p style="margin-top: 20px;">You can view and track your booking status instantly via your personal magic link:</p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="${magicLink}" style="background-color: #d4af37; color: #0a0a0a; padding: 12px 24px; font-weight: bold; text-decoration: none; display: inline-block;">
          View Booking Status Page
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #282828; margin: 25px 0;" />
      <p style="font-size: 12px; color: #8e8e8e;">Dupsy's Timeless Treasure Atelier | Handcrafted Fine Jewelry</p>
    </div>
  `;

  return sendMail({
    from: getDefaultFrom(),
    to: booking.email,
    subject: `Booking Confirmation: ${booking.reference} - Dupsy's Timeless Treasure`,
    html
  });
}

/**
 * Send Payment Link Email
 */
async function sendPaymentLinkEmail(booking, paymentLink, magicLink) {
  const html = `
    <div style="background-color: #0a0a0a; color: #f5f5f5; font-family: sans-serif; padding: 30px; border: 1px solid #d4af37;">
      <h2 style="color: #d4af37; font-size: 24px; margin-top: 0;">Dupsy's Timeless Treasure</h2>
      <p>Dear ${booking.full_name},</p>
      <p>Your booking request for <strong>${booking.product_name}</strong> (Ref: ${booking.reference}) has been reviewed by our atelier.</p>
      <p>To proceed with your order, please complete your payment using the secure link below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${paymentLink}" target="_blank" style="background-color: #d4af37; color: #0a0a0a; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block;">
          Complete Order Payment ↗
        </a>
      </div>
      <p style="font-size: 14px; color: #c7c7c7;">Payment Link: <a href="${paymentLink}" style="color: #d4af37;">${paymentLink}</a></p>
      <p style="margin-top: 20px;">You can also monitor your order status at any time via your reference page:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="${magicLink}" style="border: 1px solid #d4af37; color: #d4af37; padding: 10px 20px; text-decoration: none; display: inline-block;">
          Track Order Page
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #282828; margin: 25px 0;" />
      <p style="font-size: 12px; color: #8e8e8e;">Dupsy's Timeless Treasure Atelier | Handcrafted Fine Jewelry</p>
    </div>
  `;

  return sendMail({
    from: getDefaultFrom(),
    to: booking.email,
    subject: `Payment Link for Order ${booking.reference} - Dupsy's Timeless Treasure`,
    html
  });
}

/**
 * Send Status Update Email
 * @param {object} booking
 * @param {string} status
 * @param {string} magicLink
 * @param {string} [pickupLocation]  - Only used when status === 'shipped'
 * @param {string} [pickupContact]   - Only used when status === 'shipped'
 */
async function sendStatusUpdateEmail(booking, status, magicLink, pickupLocation, pickupContact) {
  const statusTitles = {
    pending: 'Pending Review',
    confirmed: 'Payment Confirmed',
    shipped: 'Order Shipped: Ready for Collection',
    delivered: 'Successfully Delivered'
  };

  const statusTitle = statusTitles[status.toLowerCase()] || status.toUpperCase();

  // Build optional pickup block for shipped orders
  const pickupBlock = (status === 'shipped' && pickupLocation && pickupContact)
    ? `
      <div style="background-color: #1a1400; border: 1px solid #d4af37; padding: 18px; margin: 20px 0;">
        <p style="color: #d4af37; font-weight: bold; font-size: 15px; margin: 0 0 12px 0;">Collection Details</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #c7c7c7; padding: 4px 0; width: 40%;"><strong style="color: #f5f5f5;">Pickup Location:</strong></td>
            <td style="color: #f5f5f5; padding: 4px 0;">${pickupLocation}</td>
          </tr>
          <tr>
            <td style="color: #c7c7c7; padding: 4px 0;"><strong style="color: #f5f5f5;">Contact at Pickup:</strong></td>
            <td style="color: #f5f5f5; padding: 4px 0;">${pickupContact}</td>
          </tr>
        </table>
        <p style="color: #c7c7c7; font-size: 13px; margin: 12px 0 0 0;">
          Please call the number above when you arrive to collect your package.
        </p>
      </div>`
    : '';

  const html = `
    <div style="background-color: #0a0a0a; color: #f5f5f5; font-family: sans-serif; padding: 30px; border: 1px solid #d4af37;">
      <h2 style="color: #d4af37; font-size: 24px; margin-top: 0;">Dupsy's Timeless Treasure</h2>
      <p>Dear ${booking.full_name},</p>
      <p>The status of your booking reference <strong>${booking.reference}</strong> has been updated to:</p>
      <div style="background-color: #141414; border: 1px solid #d4af37; padding: 15px; text-align: center; font-size: 20px; font-weight: bold; color: #d4af37; letter-spacing: 1px; margin: 20px 0;">
        ${statusTitle.toUpperCase()}
      </div>
      ${pickupBlock}
      <p><strong>Order Summary:</strong></p>
      <ul style="line-height: 1.8; color: #c7c7c7;">
        <li><strong style="color: #f5f5f5;">Piece / Service:</strong> ${booking.product_name}</li>
        <li><strong style="color: #f5f5f5;">Preferred Date:</strong> ${booking.preferred_date}</li>
        <li><strong style="color: #f5f5f5;">Delivery Address:</strong> ${booking.address}</li>
      </ul>
      <p style="text-align: center; margin: 25px 0;">
        <a href="${magicLink}" style="background-color: #d4af37; color: #0a0a0a; padding: 12px 24px; font-weight: bold; text-decoration: none; display: inline-block;">
          View Live Status Page
        </a>
      </p>
      <hr style="border: 0; border-top: 1px solid #282828; margin: 25px 0;" />
      <p style="font-size: 12px; color: #8e8e8e;">Dupsy's Timeless Treasure Atelier | Handcrafted Fine Jewelry</p>
    </div>
  `;

  return sendMail({
    from: getDefaultFrom(),
    to: booking.email,
    subject: `Order Status Update: ${statusTitle} (${booking.reference}) - Dupsy's Timeless Treasure`,
    html
  });
}

/**
 * Send Contact Form Inquiry Email to Admin
 */
async function sendContactFormEmail(contactData) {
  require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || 'oniebenezer1@gmail.com';
  const phoneText = contactData.phone ? contactData.phone.trim() : 'Not provided';

  const html = `
    <div style="background-color: #0a0a0a; color: #f5f5f5; font-family: sans-serif; padding: 30px; border: 1px solid #d4af37;">
      <h2 style="color: #d4af37; font-size: 22px; margin-top: 0;">New Contact Form Message</h2>
      <p style="color: #c7c7c7;">You have received a new customer inquiry from the website contact page:</p>
      
      <div style="background-color: #141414; border: 1px solid #333333; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong style="color: #d4af37;">Customer Name:</strong> ${contactData.name}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #d4af37;">Email Address:</strong> <a href="mailto:${contactData.email}" style="color: #d4af37;">${contactData.email}</a></p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #d4af37;">Phone Number:</strong> ${phoneText}</p>
        <p style="margin: 0 0 10px 0;"><strong style="color: #d4af37;">Subject:</strong> ${contactData.subject}</p>
        <p style="margin: 0 0 5px 0;"><strong style="color: #d4af37;">Message Content:</strong></p>
        <div style="background-color: #0a0a0a; border-left: 3px solid #d4af37; padding: 12px 15px; color: #f5f5f5; font-style: italic; white-space: pre-wrap; margin-top: 8px;">
          ${contactData.message}
        </div>
      </div>

      <p style="font-size: 13px; color: #8e8e8e; margin-top: 20px;">
        To reply directly to this customer, click "Reply" in your email client or write to <a href="mailto:${contactData.email}" style="color: #d4af37;">${contactData.email}</a>.
      </p>
      <hr style="border: 0; border-top: 1px solid #282828; margin: 20px 0;" />
      <p style="font-size: 12px; color: #8e8e8e;">Dupsy's Timeless Treasure Store Notification System</p>
    </div>
  `;

  return sendMail({
    from: getDefaultFrom(),
    to: adminEmail,
    replyTo: `"${contactData.name}" <${contactData.email}>`,
    subject: `New Customer Inquiry: ${contactData.subject} (from ${contactData.name})`,
    html
  });
}

module.exports = {
  sendBookingConfirmationEmail,
  sendPaymentLinkEmail,
  sendStatusUpdateEmail,
  sendContactFormEmail
};
