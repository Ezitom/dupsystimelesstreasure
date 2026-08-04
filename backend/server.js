const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dupsy_timeless_treasure_admin_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Database] Supabase client initialized.');
  } catch (err) {
    console.warn('[Database] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Database] Supabase env variables not configured. Operating with in-memory fallback store.');
}

app.get('/api/setup-logo', (req, res) => {
  try {
    const fs = require('fs');
    const child_process = require('child_process');
    const logoSrc = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\2c362c6b-99a8-4b24-9fe2-4e9a28fa865e\\media__1785373163223.jpg';
    const logoDest = path.join(__dirname, '..', 'frontend', 'images', 'logo.jpg');
    const favPng = path.join(__dirname, '..', 'frontend', 'images', 'favicon.png');
    const favIco = path.join(__dirname, '..', 'frontend', 'favicon.ico');
    const favIcoImages = path.join(__dirname, '..', 'frontend', 'images', 'favicon.ico');

    if (fs.existsSync(logoSrc)) {
      fs.copyFileSync(logoSrc, logoDest);

      const pyScript = `from PIL import Image
import shutil
img = Image.open(r"${logoDest.replace(/\\/g, '\\\\')}")
w, h = img.size
left = int(w * 0.40)
top = int(h * 0.27)
right = int(w * 0.60)
bottom = int(h * 0.45)
diamond = img.crop((left, top, right, bottom))
diamond.save(r"${favPng.replace(/\\/g, '\\\\')}", "PNG")
diamond.save(r"${favIco.replace(/\\/g, '\\\\')}", "ICO")
shutil.copy(r"${favIco.replace(/\\/g, '\\\\')}", r"${favIcoImages.replace(/\\/g, '\\\\')}")
print("Favicon generated successfully.")
`;
      const pyPath = path.join(__dirname, 'crop_favicon.py');
      fs.writeFileSync(pyPath, pyScript);
      child_process.execSync(`python "${pyPath}"`);
      return res.json({ status: 'ok', message: 'Logo and favicon generated successfully!' });
    }
    return res.status(404).json({ error: 'Source logo not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// In-Memory Fallback Store
const memoryStore = {
  products: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'The Sovereign Solitaire Ring',
      category: 'rings',
      price: 1850.00,
      material: '18k Solid Yellow Gold & Diamond',
      image_url: '/images/sovereign-ring.jpg',
      description: 'An exquisite hand-crafted 18k solid yellow gold band holding a flawless round brilliant diamond cut for maximum brilliance.',
      availability: true,
      created_at: new Date().toISOString()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Celestial Horizon Pendant',
      category: 'necklaces',
      price: 2400.00,
      material: '18k Solid Yellow Gold',
      image_url: '/images/celestial-pendant.jpg',
      description: 'An elegant pendant featuring handcrafted golden geometric curves framing a radiant center gemstone cut.',
      availability: true,
      created_at: new Date().toISOString()
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Aura Linked Cuff Bracelet',
      category: 'bracelets',
      price: 1250.00,
      material: '14k Yellow Gold',
      image_url: '/images/aura-cuff.jpg',
      description: 'Solid luxury linked cuff designed for effortless daily elegance and subtle wrist statement.',
      availability: true,
      created_at: new Date().toISOString()
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Elysian Drop Earrings',
      category: 'earrings',
      price: 980.00,
      material: '18k Gold & Freshwater Pearl',
      image_url: '/images/elysian-earrings.jpg',
      description: 'Suspended luxury drop earrings featuring lustrous natural pearls cradled in textured solid gold hardware.',
      availability: true,
      created_at: new Date().toISOString()
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Royal Heritage Signet Ring',
      category: 'rings',
      price: 1600.00,
      material: '18k Yellow Gold & Onyx',
      image_url: '/images/heritage-ring.jpg',
      description: 'A bold statement signet piece featuring deep black onyx set in carved yellow gold.',
      availability: true,
      created_at: new Date().toISOString()
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Bespoke Custom Atelier Piece',
      category: 'custom',
      price: 3500.00,
      material: 'Custom Gold & Selected Gemstones',
      image_url: '/images/custom-atelier.jpg',
      description: 'Commission a one of a kind masterpiece designed in collaboration with master goldsmith Dupsy.',
      availability: true,
      created_at: new Date().toISOString()
    }
  ],
  bookings: [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      reference: 'DTT-884920',
      product_id: '11111111-1111-1111-1111-111111111111',
      product_name: 'The Sovereign Solitaire Ring',
      full_name: 'Elena Rostova',
      phone: '+1 555 234 5678',
      email: 'elena@example.com',
      address: '742 Evergreen Terrace, Springfield',
      preferred_date: '2026-08-15',
      category: 'rings',
      notes: 'Please prepare ring size 6.5 in velvet presentation box.',
      status: 'confirmed',
      payment_link: 'https://checkout.stripe.com/pay/cs_test_dupsy884920',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  messages: [],
  deliveryZones: require('./config/deliveryZones.json')
};

// Authentication Middleware for Products/Auth
function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

// --- API ROUTES --- //

// 1. Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign({ role: 'admin', username }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token, username });
  } else {
    return res.status(401).json({ error: 'Invalid credentials. Check admin username and password.' });
  }
});

app.get('/api/auth/verify', authenticateAdminToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// 2. Bookings Router
const bookingsRouter = require('./routes/bookings')(supabase, memoryStore);
app.use('/api/bookings', bookingsRouter);

// 2b. Paystack Router
const paystackRouter = require('./routes/paystack')(supabase, memoryStore);
app.use('/api/paystack', paystackRouter);

// 2c. Delivery Zones Routes (Public List + Admin CRUD)
app.get('/api/delivery-zones', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('delivery_zones').select('*').order('zone_name', { ascending: true });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Database Fallback] Delivery zones fetch error:', err.message);
    }
  }
  res.json(memoryStore.deliveryZones);
});

// POST /api/delivery-zones (Admin Only - Add Location / Zone)
app.post('/api/delivery-zones', authenticateAdminToken, async (req, res) => {
  const { zone_name, fee } = req.body;
  if (!zone_name || fee === undefined || fee === null) {
    return res.status(400).json({ error: 'Location name and fee are required.' });
  }

  const parsedFee = parseFloat(fee);
  if (isNaN(parsedFee) || parsedFee < 0) {
    return res.status(400).json({ error: 'Fee must be a valid non-negative number.' });
  }

  const zoneId = 'zone-' + zone_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || String(Date.now());
  const newZone = {
    id: zoneId,
    zone_name: zone_name.trim(),
    fee: parsedFee,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('delivery_zones').insert([newZone]).select();
      if (!error && data && data.length > 0) {
        const idx = memoryStore.deliveryZones.findIndex(z => z.id === zoneId || z.zone_name.toLowerCase() === newZone.zone_name.toLowerCase());
        if (idx !== -1) memoryStore.deliveryZones[idx] = data[0];
        else memoryStore.deliveryZones.push(data[0]);
        return res.status(201).json(data[0]);
      }
    } catch (err) {
      console.warn('[Database Fallback] Delivery zone insert error:', err.message);
    }
  }

  const existingIdx = memoryStore.deliveryZones.findIndex(z => z.id === zoneId || z.zone_name.toLowerCase() === newZone.zone_name.toLowerCase());
  if (existingIdx !== -1) {
    memoryStore.deliveryZones[existingIdx] = newZone;
  } else {
    memoryStore.deliveryZones.push(newZone);
  }

  res.status(201).json(newZone);
});

// PUT /api/delivery-zones/:id (Admin Only - Update Location / Zone)
app.put('/api/delivery-zones/:id', authenticateAdminToken, async (req, res) => {
  const { id } = req.params;
  const { zone_name, fee } = req.body;

  if (!zone_name || fee === undefined || fee === null) {
    return res.status(400).json({ error: 'Location name and fee are required.' });
  }

  const parsedFee = parseFloat(fee);
  if (isNaN(parsedFee) || parsedFee < 0) {
    return res.status(400).json({ error: 'Fee must be a valid non-negative number.' });
  }

  const updatedData = {
    zone_name: zone_name.trim(),
    fee: parsedFee
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('delivery_zones').update(updatedData).eq('id', id).select();
      if (!error && data && data.length > 0) {
        const memIdx = memoryStore.deliveryZones.findIndex(z => z.id === id);
        if (memIdx !== -1) memoryStore.deliveryZones[memIdx] = data[0];
        return res.json(data[0]);
      }
    } catch (err) {
      console.warn('[Database Fallback] Delivery zone update error:', err.message);
    }
  }

  const memIdx = memoryStore.deliveryZones.findIndex(z => z.id === id);
  if (memIdx === -1) {
    return res.status(404).json({ error: 'Delivery location not found.' });
  }

  memoryStore.deliveryZones[memIdx] = { ...memoryStore.deliveryZones[memIdx], ...updatedData };
  res.json(memoryStore.deliveryZones[memIdx]);
});

// DELETE /api/delivery-zones/:id (Admin Only - Delete Location / Zone)
app.delete('/api/delivery-zones/:id', authenticateAdminToken, async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      await supabase.from('delivery_zones').delete().eq('id', id);
    } catch (err) {
      console.warn('[Database Fallback] Delivery zone delete error:', err.message);
    }
  }

  memoryStore.deliveryZones = memoryStore.deliveryZones.filter(z => z.id !== id);
  res.json({ success: true, message: 'Delivery location deleted successfully.' });
});


// Eagerly initialise Twilio client at startup to surface credential errors immediately
require('./services/whatsappService').sendWhatsAppMessage; // triggers getTwilioClient() on first real send
// Force startup validation by invoking the module-level check
(function checkTwilioOnStartup() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNum    = process.env.TWILIO_WHATSAPP_NUMBER;
  const missing    = [];
  if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!authToken)  missing.push('TWILIO_AUTH_TOKEN');
  if (!fromNum)    missing.push('TWILIO_WHATSAPP_NUMBER');
  if (missing.length > 0) {
    console.error(`[Startup] WhatsApp NOT ready — missing env vars: ${missing.join(', ')}`);
  } else {
    console.log('[Startup] Twilio credentials present — WhatsApp ready.');
  }
})();

// 3. Products Routes
app.get('/api/products', async (req, res) => {
  const { category } = req.query;

  if (supabase) {
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      if (!error && data) return res.json(data);
    } catch (err) {
      console.warn('[Database Fallback] Products fetch error:', err.message);
    }
  }

  let list = [...memoryStore.products];
  if (category && category !== 'all') {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  res.json(list);
});

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (!error && data) return res.json(data);
    } catch (err) {
      console.warn('[Database Fallback] Product fetch error:', err.message);
    }
  }

  const product = memoryStore.products.find(p => p.id === id);
  if (product) return res.json(product);
  res.status(404).json({ error: 'Product not found.' });
});

app.post('/api/products', authenticateAdminToken, async (req, res) => {
  const { name, category, price, material, image_url, description, availability } = req.body;

  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: 'Missing required product fields.' });
  }

  const newProduct = {
    id: String(Date.now()),
    name,
    category,
    price: parseFloat(price),
    material: material || 'Gold',
    image_url: image_url || '/images/sovereign-ring.jpg',
    description: description || '',
    availability: availability !== undefined ? Boolean(availability) : true,
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').insert([{
        name: newProduct.name,
        category: newProduct.category,
        price: newProduct.price,
        material: newProduct.material,
        image_url: newProduct.image_url,
        description: newProduct.description,
        availability: newProduct.availability
      }]).select();

      if (!error && data && data.length > 0) {
        return res.status(201).json(data[0]);
      }
    } catch (err) {
      console.warn('[Database Fallback] Product creation error:', err.message);
    }
  }

  memoryStore.products.unshift(newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', authenticateAdminToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, price, material, image_url, description, availability } = req.body;

  if (supabase) {
    try {
      const updates = {
        name,
        category,
        price: parseFloat(price),
        material,
        image_url,
        description,
        availability: Boolean(availability)
      };
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
      if (!error && data && data.length > 0) return res.json(data[0]);
    } catch (err) {
      console.warn('[Database Fallback] Product update error:', err.message);
    }
  }

  const index = memoryStore.products.findIndex(p => p.id === id);
  if (index !== -1) {
    memoryStore.products[index] = {
      ...memoryStore.products[index],
      name,
      category,
      price: parseFloat(price),
      material,
      image_url,
      description,
      availability: Boolean(availability)
    };
    return res.json(memoryStore.products[index]);
  }
  res.status(404).json({ error: 'Product not found.' });
});

app.delete('/api/products/:id', authenticateAdminToken, async (req, res) => {
  const { id } = req.params;

  if (supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (err) {
      console.warn('[Database Fallback] Product delete error:', err.message);
    }
  }

  const index = memoryStore.products.findIndex(p => p.id === id);
  if (index !== -1) {
    memoryStore.products.splice(index, 1);
    return res.json({ success: true, message: 'Product deleted.' });
  }
  res.status(404).json({ error: 'Product not found.' });
});

const { sendContactFormEmail } = require('./config/mailer');

// Diagnostic Test Email Route
app.get('/api/test-email', async (req, res) => {
  try {
    const result = await sendContactFormEmail({
      name: 'Email Diagnostic Test',
      email: 'test@example.com',
      phone: '+234 800 000 0000',
      subject: 'Email Notification Test',
      message: 'This is a diagnostic email from Dupsy\'s Timeless Treasure server.'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Contact Route
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please fill in all required fields (Name, Email, and Message).' });
  }

  const contactEntry = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : '',
    subject: subject ? subject.trim() : 'General Inquiry',
    message: message.trim(),
    date: new Date().toISOString()
  };

  memoryStore.messages.unshift(contactEntry);
  console.log(`[Contact Message] Received from ${contactEntry.name} (${contactEntry.email}): ${contactEntry.subject}`);

  // Send Email Notification to Admin via Nodemailer
  let emailSent = false;
  try {
    const mailResult = await sendContactFormEmail(contactEntry);
    if (mailResult && mailResult.success) {
      emailSent = true;
    } else if (mailResult && mailResult.error) {
      console.warn('[Contact Email Warning]', mailResult.error);
    }
  } catch (err) {
    console.error('[Contact Email Exception]', err.message);
  }

  res.json({
    success: true,
    message: 'Thank you for reaching out! Your message has been sent successfully, and our management team will get back to you as soon as possible.',
    email_dispatched: emailSent
  });
});

// --- CLEAN URLS & STATIC FILE SERVING / HEALTH CHECK --- //

// Root Path: Always return Backend API status message
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: "Dupsy's Timeless Treasure Backend API",
    message: "Backend server is running successfully.",
    timestamp: new Date().toISOString()
  });
});

const fs = require('fs');
const frontendPath = path.join(__dirname, '../frontend');
const hasFrontend = fs.existsSync(frontendPath);

if (hasFrontend) {
  // Explicit route: /order/:reference resolves to frontend/order.html
  app.get('/order/:reference', (req, res) => {
    res.sendFile(path.join(frontendPath, 'order.html'));
  });

  app.get('/order', (req, res) => {
    res.sendFile(path.join(frontendPath, 'order.html'));
  });

  // 301 Redirect Middleware: Any request ending in .html gets a 301 redirect to path without .html
  app.use((req, res, next) => {
    if (req.path.endsWith('.html') && !req.path.startsWith('/api')) {
      let cleanPath = req.path.slice(0, -5);
      if (cleanPath === '/index') cleanPath = '/';
      const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      return res.redirect(301, cleanPath + queryString);
    }
    next();
  });

  // Serve frontend static directory
  app.use(express.static(frontendPath, { extensions: ['html'] }));

  // Catch-all for HTML requests to serve clean paths
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Dupsy's Timeless Treasure Server Running`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Clean URLs, Twilio WhatsApp & Email Notifications Active`);
  console.log(`=================================================`);
});
