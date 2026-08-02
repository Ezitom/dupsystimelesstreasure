const mailer = require('./backend/config/mailer');

async function test() {
  console.log('--- Testing Gmail SMTP Nodemailer Dispatch ---');
  const testBooking = {
    full_name: 'Ebenezer Oni',
    reference: 'DTT-TEST' + Math.floor(1000 + Math.random() * 9000),
    product_name: 'Sovereign Solitaire Ring',
    category: 'Rings',
    preferred_date: '2026-08-05',
    address: 'No 15 Luxury Atelier Way, Victoria Island, Lagos',
    email: 'oniebenezer1@gmail.com'
  };
  const magicLink = 'http://localhost:5000/order/' + testBooking.reference;
  const result = await mailer.sendBookingConfirmationEmail(testBooking, magicLink);
  console.log('Email Send Dispatch Result:');
  console.log(JSON.stringify(result, null, 2));
}

test();
