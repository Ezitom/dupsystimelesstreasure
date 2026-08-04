const express = require('express');
const router = express.Router();
const https = require('https');
const crypto = require('crypto');
const { sendBookingConfirmationEmail } = require('../config/mailer');
const { validatePhoneNumber, notifyPaymentConfirmed } = require('../services/whatsappService');

// Helper: Generate Reference Code (e.g., DTT-884920)
function generateReferenceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'DTT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Paystack REST API Wrapper using HTTPS
function paystackApiCall(apiPath, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: parsed });
        } catch (err) {
          reject(new Error('Failed to parse Paystack API response'));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper: Verify Paystack Webhook Signature (HMAC SHA512)
function verifyPaystackSignature(req) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const signature = req.headers['x-paystack-signature'];
  if (!signature) return false;

  const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const expectedHash = crypto.createHmac('sha512', secret).update(rawPayload).digest('hex');
  return expectedHash === signature;
}

const defaultDeliveryZones = require('../config/deliveryZones.json');

module.exports = function(supabase, memoryStore) {

  function getMagicLink(req, reference) {
    const baseUrl = process.env.FRONTEND_URL || 'https://dupsystimelesstreasure.netlify.app';
    return `${baseUrl}/order/${reference}`;
  }

  // 1. GET /api/paystack/config - Expose public key if needed by frontend
  router.get('/config', (req, res) => {
    res.json({
      publicKey: process.env.PAYSTACK_PUBLIC_KEY || ''
    });
  });

  // 2. POST /api/paystack/initialize - Create booking record & initialize Paystack checkout
  router.post('/initialize', async (req, res) => {
    const { product_id, product_name, full_name, phone, email, address, nearest_park, delivery_zone, preferred_date, category, notes } = req.body;

    // Validation
    if (!full_name || !phone || !email || !address || !preferred_date) {
      return res.status(400).json({ error: 'Please provide all required fields (Name, Phone, Email, Delivery Address, Date).' });
    }

    if (!delivery_zone) {
      return res.status(400).json({ error: 'Please select a delivery location.' });
    }

    if (address.trim().length < 5) {
      return res.status(400).json({ error: 'Please enter a valid, detailed delivery address.' });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }

    // Server-side Delivery Zone & Fee Lookup (Never trust frontend fee value)
    let availableZones = memoryStore.deliveryZones || defaultDeliveryZones;
    if (supabase) {
      try {
        const { data: dbZones } = await supabase.from('delivery_zones').select('*');
        if (dbZones && dbZones.length > 0) {
          availableZones = dbZones;
        }
      } catch (e) {}
    }

    const cleanZoneInput = String(delivery_zone).trim().toLowerCase();
    const matchedZone = availableZones.find(z =>
      (z.zone_name && z.zone_name.toLowerCase() === cleanZoneInput) ||
      (z.id && z.id.toLowerCase() === cleanZoneInput)
    );

    if (!matchedZone) {
      return res.status(400).json({ error: 'Selected delivery location is invalid. Please select a valid delivery location.' });
    }

    const authoritativeDeliveryFee = parseFloat(matchedZone.fee);
    const selectedZoneName = matchedZone.zone_name;

    // Determine Product Price (Collection Price)
    let price = 3500.00; // default for bespoke custom pieces
    let selectedProductName = product_name || 'Custom Jewelry Atelier';

    if (product_id) {
      let foundProduct = null;
      if (supabase) {
        try {
          const { data } = await supabase.from('products').select('*').eq('id', product_id).single();
          if (data) foundProduct = data;
        } catch (e) {}
      }
      if (!foundProduct) {
        foundProduct = memoryStore.products.find(p => p.id === product_id);
      }
      if (foundProduct) {
        price = parseFloat(foundProduct.price);
        selectedProductName = foundProduct.name;
      }
    } else if (product_name) {
      const match = memoryStore.products.find(p => p.name.toLowerCase().includes(product_name.toLowerCase()));
      if (match) price = parseFloat(match.price);
    }

    const collectionPrice = price;
    const totalAmount = collectionPrice + authoritativeDeliveryFee;

    // Generate unique reference
    let ref = generateReferenceCode();
    while (memoryStore.bookings.some(b => b.reference === ref)) {
      ref = generateReferenceCode();
    }

    const parkStr = nearest_park ? nearest_park.trim() : '';
    let formattedNotes = notes ? notes.trim() : '';
    if (parkStr && !formattedNotes.includes('Nearest Park')) {
      formattedNotes = formattedNotes ? `${formattedNotes}\n[Nearest Park / Pickup Station: ${parkStr}]` : `[Nearest Park / Pickup Station: ${parkStr}]`;
    }

    const bookingData = {
      id: String(Date.now()),
      reference: ref,
      product_id: product_id || null,
      product_name: selectedProductName,
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      nearest_park: parkStr,
      delivery_zone: selectedZoneName,
      delivery_fee: authoritativeDeliveryFee,
      total_amount: totalAmount,
      preferred_date,
      category: category || 'custom',
      notes: formattedNotes,
      status: 'pending',
      payment_status: 'unpaid',
      paystack_ref: null,
      amount: totalAmount,
      pickup_location: parkStr || null,
      pickup_contact_number: null,
      created_at: new Date().toISOString()
    };

    let createdBooking = bookingData;

    // Save initial unpaid booking to database
    if (supabase) {
      try {
        let { data, error } = await supabase.from('bookings').insert([{
          reference: bookingData.reference,
          product_id: bookingData.product_id,
          product_name: bookingData.product_name,
          full_name: bookingData.full_name,
          phone: bookingData.phone,
          email: bookingData.email,
          address: bookingData.address,
          preferred_date: bookingData.preferred_date,
          category: bookingData.category,
          notes: bookingData.notes,
          status: 'pending',
          payment_status: 'unpaid',
          amount: bookingData.amount,
          delivery_zone: bookingData.delivery_zone,
          delivery_fee: bookingData.delivery_fee,
          total_amount: bookingData.total_amount
        }]).select();

        if (error) {
          console.warn('[Paystack Init] Full column insert warning, attempting core insert fallback:', error.message);
          const fallbackRes = await supabase.from('bookings').insert([{
            reference: bookingData.reference,
            product_id: bookingData.product_id,
            product_name: bookingData.product_name,
            full_name: bookingData.full_name,
            phone: bookingData.phone,
            email: bookingData.email,
            address: bookingData.address,
            preferred_date: bookingData.preferred_date,
            category: bookingData.category,
            notes: bookingData.notes,
            status: 'pending',
            amount: bookingData.amount
          }]).select();
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!error && data && data.length > 0) {
          createdBooking = { ...bookingData, ...data[0] };
        }
      } catch (err) {
        console.warn('[Paystack Init] Supabase insert exception:', err.message);
      }
    }

    if (!memoryStore.bookings.some(b => b.reference === createdBooking.reference)) {
      memoryStore.bookings.unshift(createdBooking);
    }

    // Initialize Paystack Transaction
    const frontendUrl = process.env.FRONTEND_URL || 'https://dupsystimelesstreasure.netlify.app';
    const callbackUrl = `${frontendUrl}/order/${ref}?payment=verify`;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret || paystackSecret.startsWith('sk_test_placeholder')) {
      console.warn('[Paystack] PAYSTACK_SECRET_KEY not set or placeholder. Returning simulated checkout.');
      return res.status(200).json({
        success: true,
        reference: ref,
        authorization_url: `${callbackUrl}&simulated=true`,
        simulated: true,
        message: 'Paystack secret key missing. Set PAYSTACK_SECRET_KEY in backend/.env'
      });
    }

    try {
      const amountInKobo = Math.round(totalAmount * 100);
      const paystackRes = await paystackApiCall('/transaction/initialize', 'POST', {
        email: createdBooking.email,
        amount: amountInKobo,
        reference: ref,
        callback_url: callbackUrl,
        metadata: {
          reference: ref,
          product_name: createdBooking.product_name,
          full_name: createdBooking.full_name,
          address: createdBooking.address,
          phone: createdBooking.phone,
          delivery_zone: createdBooking.delivery_zone,
          delivery_fee: createdBooking.delivery_fee,
          total_amount: createdBooking.total_amount
        }
      });

      if (paystackRes.statusCode === 200 && paystackRes.body.status) {
        return res.json({
          success: true,
          reference: ref,
          authorization_url: paystackRes.body.data.authorization_url,
          access_code: paystackRes.body.data.access_code
        });
      } else {
        console.error('[Paystack Init Error]', paystackRes.body);
        return res.status(400).json({
          error: paystackRes.body.message || 'Failed to initialize Paystack checkout.'
        });
      }
    } catch (err) {
      console.error('[Paystack Init Exception]', err.message);
      return res.status(500).json({ error: 'Paystack server communication failed: ' + err.message });
    }
  });

  // 3. POST /api/paystack/webhook - Webhook confirmation from Paystack
  router.post('/webhook', async (req, res) => {
    // Validate signature
    if (!verifyPaystackSignature(req)) {
      console.warn('[Paystack Webhook] Invalid signature attempt rejected.');
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    if (!event || !event.event) {
      return res.status(400).send('Invalid payload');
    }

    console.log(`[Paystack Webhook Event Received]: ${event.event}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      const ref = data.reference;
      const paystackTxRef = String(data.id || data.reference);

      let booking = null;

      // Find booking in DB or memoryStore
      if (supabase) {
        try {
          const { data: dbData } = await supabase.from('bookings').select('*').eq('reference', ref).single();
          if (dbData) booking = dbData;
        } catch (e) {}
      }

      if (!booking) {
        booking = memoryStore.bookings.find(b => b.reference === ref);
      }

      if (booking) {
        // If already paid, acknowledge
        if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
          console.log(`[Paystack Webhook] Booking ${ref} already confirmed.`);
          return res.status(200).send('Event processed (already confirmed)');
        }

        // Update booking status to confirmed/paid
        let updatedBooking = {
          ...booking,
          status: 'confirmed',
          payment_status: 'paid',
          paystack_ref: paystackTxRef
        };

        if (supabase) {
          try {
            const { data: updatedData } = await supabase
              .from('bookings')
              .update({
                status: 'confirmed',
                payment_status: 'paid',
                paystack_ref: paystackTxRef
              })
              .eq('reference', ref)
              .select();

            if (updatedData && updatedData.length > 0) {
              updatedBooking = updatedData[0];
            }
          } catch (err) {
            console.warn('[Paystack Webhook] Supabase update warning:', err.message);
          }
        }

        // Update memoryStore
        const memIdx = memoryStore.bookings.findIndex(b => b.reference === ref);
        if (memIdx !== -1) {
          memoryStore.bookings[memIdx] = updatedBooking;
        }

        // Trigger Notifications (Email & WhatsApp)
        const magicLink = getMagicLink(req, ref);
        console.log(`[Paystack Webhook] Payment confirmed for ${ref}. Triggering notifications.`);

        sendBookingConfirmationEmail(updatedBooking, magicLink);
        notifyPaymentConfirmed(updatedBooking, magicLink);

        return res.status(200).send('Webhook processed successfully');
      } else {
        console.warn(`[Paystack Webhook] Booking ref ${ref} not found.`);
      }
    }

    res.status(200).send('Event received');
  });

  // 4. GET /api/paystack/verify/:reference - Server-side transaction verification endpoint
  router.get('/verify/:reference', async (req, res) => {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ error: 'Reference code required.' });

    const cleanRef = reference.trim().toUpperCase();
    let booking = null;

    if (supabase) {
      try {
        const { data } = await supabase.from('bookings').select('*').eq('reference', cleanRef).single();
        if (data) booking = data;
      } catch (e) {}
    }

    if (!booking) {
      booking = memoryStore.bookings.find(b => b.reference === cleanRef);
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Check simulated mode
    if (req.query.simulated === 'true' || !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_placeholder')) {
      if (booking.status !== 'confirmed') {
        booking.status = 'confirmed';
        booking.payment_status = 'paid';
        booking.paystack_ref = `SIMULATED_${cleanRef}`;

        if (supabase) {
          try {
            await supabase.from('bookings').update({
              status: 'confirmed',
              payment_status: 'paid',
              paystack_ref: booking.paystack_ref
            }).eq('reference', cleanRef);
          } catch (e) {}
        }

        const magicLink = getMagicLink(req, cleanRef);
        sendBookingConfirmationEmail(booking, magicLink);
        notifyPaymentConfirmed(booking, magicLink);
      }
      return res.json({ verified: true, booking, message: 'Simulated payment verification successful.' });
    }

    // Call Paystack Verify API
    try {
      const paystackRes = await paystackApiCall(`/transaction/verify/${cleanRef}`);

      if (paystackRes.statusCode === 200 && paystackRes.body.status && paystackRes.body.data.status === 'success') {
        const txData = paystackRes.body.data;

        let isNewlyConfirmed = false;
        if (booking.status !== 'confirmed' || booking.payment_status !== 'paid') {
          isNewlyConfirmed = true;
          booking.status = 'confirmed';
          booking.payment_status = 'paid';
          booking.paystack_ref = String(txData.id || txData.reference);

          if (supabase) {
            try {
              const { error: upErr } = await supabase.from('bookings').update({
                status: 'confirmed',
                payment_status: 'paid',
                paystack_ref: booking.paystack_ref
              }).eq('reference', cleanRef);

              if (upErr) {
                await supabase.from('bookings').update({ status: 'confirmed' }).eq('reference', cleanRef);
              }
            } catch (e) {}
          }

          const memIdx = memoryStore.bookings.findIndex(b => b.reference === cleanRef);
          if (memIdx !== -1) memoryStore.bookings[memIdx] = booking;

          if (isNewlyConfirmed) {
            const magicLink = getMagicLink(req, cleanRef);
            sendBookingConfirmationEmail(booking, magicLink);
            notifyPaymentConfirmed(booking, magicLink);
          }
        }

        return res.json({ verified: true, booking });
      } else {
        // Mark payment status as failed if abandon/failed
        booking.payment_status = 'failed';
        if (supabase) {
          try {
            await supabase.from('bookings').update({ payment_status: 'failed' }).eq('reference', cleanRef);
          } catch (e) {}
        }
        return res.json({ verified: false, booking, message: 'Payment not completed or failed.' });
      }
    } catch (err) {
      console.error('[Paystack Verify Exception]', err.message);
      return res.status(500).json({ error: 'Failed to verify transaction with Paystack: ' + err.message });
    }
  });

  return router;
};
