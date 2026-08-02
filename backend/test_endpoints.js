const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- Testing Endpoints ---');

  // Test 1: Clean URL /about
  const aboutRes = await testEndpoint('/about');
  console.log('GET /about -> status:', aboutRes.statusCode, aboutRes.body.includes('Atelier Story') ? 'PASS' : 'FAIL');

  // Test 2: .html Redirect /about.html -> /about
  const redirectRes = await testEndpoint('/about.html');
  console.log('GET /about.html -> status:', redirectRes.statusCode, 'Location:', redirectRes.headers.location);

  // Test 3: API Products
  const productsRes = await testEndpoint('/api/products');
  console.log('GET /api/products -> status:', productsRes.statusCode, 'Count:', JSON.parse(productsRes.body).length);

  // Test 4: Booking creation
  const postData = JSON.stringify({
    product_name: 'The Sovereign Solitaire Ring',
    full_name: 'Test Client',
    phone: '+1 555 000 1111',
    email: 'client@example.com',
    address: '100 Gold St',
    preferred_date: '2026-09-01',
    category: 'rings',
    notes: 'Unit test booking'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/bookings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', async () => {
      const booking = JSON.parse(body);
      console.log('POST /api/bookings -> status:', res.statusCode, 'Ref:', booking.reference);

      // Test 5: Track booking
      const trackRes = await testEndpoint(`/api/bookings/track?reference=${booking.reference}&identifier=${booking.email}`);
      console.log('GET /api/bookings/track -> status:', trackRes.statusCode, 'Found Ref:', JSON.parse(trackRes.body).reference);
    });
  });

  req.write(postData);
  req.end();
}

runTests().catch(console.error);
