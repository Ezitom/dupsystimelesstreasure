const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { sendBookingConfirmationEmail, sendPaymentLinkEmail, sendStatusUpdateEmail } = require('../config/mailer');
const {
  validatePhoneNumber,
  notifyBookingReceived,
  notifyPaymentLinkSent,
  notifyPaymentConfirmed,
  notifyOrderShipped,
  notifyOrderDelivered
} = require('../services/whatsappService');

// Helper: Reference Code Generator
function generateReferenceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'DTT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Authentication Middleware
function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'dupsy_timeless_treasure_admin_secret_key_2026';

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Module export factory function to bind database/memory instance
module.exports = function(supabase, memoryStore) {

  // Helper to construct Magic Link URL
  function getMagicLink(req, reference) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://dupsystimelesstreasure.netlify.app';
    return `${frontendUrl}/order/${reference}`;
  }

  // 1. POST /api/bookings (Public - Create Booking)
  router.post('/', async (req, res) => {
    const { product_id, product_name, full_name, phone, email, address, nearest_park, preferred_date, category, notes } = req.body;

    if (!full_name || !phone || !email || !address || !preferred_date) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    // Validate phone number format — must include country code for WhatsApp delivery
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: phoneValidation.error });
    }

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
      product_name: product_name || 'Custom Consultation',
      full_name,
      phone,
      email,
      address,
      nearest_park: parkStr,
      preferred_date,
      category: category || 'custom',
      notes: formattedNotes,
      status: 'pending',
      payment_link: null,
      pickup_location: parkStr || null,
      pickup_contact_number: null,
      created_at: new Date().toISOString()
    };

    let createdBooking = bookingData;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('bookings').insert([{
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
          status: 'pending'
        }]).select();

        if (!error && data && data.length > 0) {
          createdBooking = data[0];
        }
      } catch (err) {
        console.warn('[Database Fallback] Booking insert error:', err.message);
      }
    }

    // Always update in-memory store
    if (!memoryStore.bookings.some(b => b.reference === createdBooking.reference)) {
      memoryStore.bookings.unshift(createdBooking);
    }

    const magicLink = getMagicLink(req, createdBooking.reference);

    // Send Email Notification
    sendBookingConfirmationEmail(createdBooking, magicLink);

    // Send WhatsApp Notification — booking received
    notifyBookingReceived(createdBooking, magicLink);

    res.status(201).json(createdBooking);
  });

  // 2. GET /api/bookings/ref/:reference (Public Read-Only Magic Link Lookup)
  router.get('/ref/:reference', async (req, res) => {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ error: 'Reference code required.' });
    }

    const cleanRef = reference.trim().toUpperCase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('reference', cleanRef)
          .single();

        if (!error && data) {
          return res.json(data);
        }
      } catch (err) {
        console.warn('[Database Fallback] Ref lookup error:', err.message);
      }
    }

    const booking = memoryStore.bookings.find(b => b.reference === cleanRef);
    if (booking) {
      return res.json(booking);
    }

    res.status(404).json({ error: 'No booking found matching that reference code.' });
  });

  // 3. GET /api/bookings/track (Public Track Order with Contact Verification)
  router.get('/track', async (req, res) => {
    const { reference, identifier } = req.query;

    if (!reference || !identifier) {
      return res.status(400).json({ error: 'Reference code and email/phone are required.' });
    }

    const cleanRef = reference.trim().toUpperCase();
    const cleanId = identifier.trim().toLowerCase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('reference', cleanRef);

        if (!error && data && data.length > 0) {
          const match = data.find(b =>
            b.email.toLowerCase() === cleanId ||
            b.phone.replace(/\s+/g, '').includes(cleanId.replace(/\s+/g, ''))
          );

          if (match) return res.json(match);
        }
      } catch (err) {
        console.warn('[Database Fallback] Track lookup error:', err.message);
      }
    }

    const booking = memoryStore.bookings.find(b =>
      b.reference === cleanRef &&
      (b.email.toLowerCase() === cleanId || b.phone.replace(/\s+/g, '').includes(cleanId.replace(/\s+/g, '')))
    );

    if (booking) return res.json(booking);

    res.status(404).json({ error: 'No matching booking found for the provided reference and contact info.' });
  });

  // 4. GET /api/bookings (Admin Only - List All)
  router.get('/', authenticateAdminToken, async (req, res) => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          // Merge memoryStore bookings with Supabase so no recent bookings are missed
          const dbRefs = new Set(data.map(b => b.reference));
          const memOnly = memoryStore.bookings.filter(b => !dbRefs.has(b.reference));
          const combined = [...memOnly, ...data];
          return res.json(combined);
        }
      } catch (err) {
        console.warn('[Database Fallback] Admin fetch error:', err.message);
      }
    }

    res.json(memoryStore.bookings);
  });



  // 7. PATCH /api/bookings/:id/pickup (Admin Only - Save Pickup Location & Contact)
  router.patch('/:id/pickup', authenticateAdminToken, async (req, res) => {
    const { id } = req.params;
    const { pickup_location, pickup_contact_number } = req.body;

    if (!pickup_location && !pickup_contact_number) {
      return res.status(400).json({ error: 'At least one pickup field (pickup_location or pickup_contact_number) is required.' });
    }

    const updates = {};
    if (pickup_location !== undefined) updates.pickup_location = pickup_location.trim() || null;
    if (pickup_contact_number !== undefined) updates.pickup_contact_number = pickup_contact_number.trim() || null;

    let updatedBooking = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .update(updates)
          .eq('id', id)
          .select();

        if (!error && data && data.length > 0) {
          updatedBooking = data[0];
        }
      } catch (err) {
        console.warn('[Database Fallback] Pickup update error:', err.message);
      }
    }

    if (!updatedBooking) {
      const booking = memoryStore.bookings.find(b => b.id === id);
      if (booking) {
        Object.assign(booking, updates);
        updatedBooking = booking;
      }
    }

    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    console.log(`[Pickup] Updated for booking ${updatedBooking.reference}: location="${updatedBooking.pickup_location}" contact="${updatedBooking.pickup_contact_number}"`);
    res.json(updatedBooking);
  });

  // 6 (continued). Status update route
  router.patch('/:id/status', authenticateAdminToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const cleanStatus = status.toLowerCase();
    let updatedBooking = null;

    // Fetch the current booking first so we can read pickup fields
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .update({ status: cleanStatus })
          .eq('id', id)
          .select();

        if (!error && data && data.length > 0) {
          updatedBooking = data[0];
        }
      } catch (err) {
        console.warn('[Database Fallback] Status update error:', err.message);
      }
    }

    if (!updatedBooking) {
      const booking = memoryStore.bookings.find(b => b.id === id);
      if (booking) {
        booking.status = cleanStatus;
        updatedBooking = booking;
      }
    }

    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Guard: block 'shipped' status if pickup details are missing
    if (cleanStatus === 'shipped') {
      const loc = (updatedBooking.pickup_location || '').trim();
      const con = (updatedBooking.pickup_contact_number || '').trim();
      if (!loc || !con) {
        // Revert the status update in Supabase since we can't allow this
        if (supabase) {
          await supabase.from('bookings').update({ status: updatedBooking.status === 'shipped' ? 'confirmed' : updatedBooking.status }).eq('id', id);
        }
        return res.status(400).json({
          error: 'Cannot mark as Shipped without setting the pickup location and pickup contact number first. Please fill in both fields for this booking before changing the status.'
        });
      }
    }

    const magicLink = getMagicLink(req, updatedBooking.reference);
    const pickupLoc = (updatedBooking.pickup_location || '').trim();
    const pickupCon = (updatedBooking.pickup_contact_number || '').trim();

    // Send status update email (with pickup details for shipped orders)
    sendStatusUpdateEmail(updatedBooking, cleanStatus, magicLink, pickupLoc, pickupCon);

    // Send WhatsApp notification using the correct template per status
    if (cleanStatus === 'confirmed') {
      notifyPaymentConfirmed(updatedBooking, magicLink);
    } else if (cleanStatus === 'shipped') {
      notifyOrderShipped(updatedBooking, magicLink, pickupLoc, pickupCon);
    } else if (cleanStatus === 'delivered') {
      notifyOrderDelivered(updatedBooking, magicLink);
    }
    // 'pending' status changes do not generate a WhatsApp notification

    res.json(updatedBooking);
  });

  return router;
};
