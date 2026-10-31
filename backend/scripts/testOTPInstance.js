/**
 * Test OTP Instance Script
 *
 * Tests ONLY the OTP WhatsApp instance to verify it's:
 * 1. Connected and ready
 * 2. Can send messages to a specified phone number
 *
 * Usage: node scripts/testOTPInstance.js [phone_number]
 * Example: node scripts/testOTPInstance.js 918899966757
 */

import 'dotenv/config';
import {
  getOTPInstanceStatus,
  sendOTPMessage,
} from '../src/utils/otpWhatsapp.js';

const TEST_OTP = '123456'; // Test OTP for demonstration

console.log('='.repeat(60));
console.log('[OTP INSTANCE TEST] Starting OTP instance verification...');
console.log('='.repeat(60));

// Get OTP instance name from config
const OTP_INSTANCE_NAME = process.env.EVOLUTION_OTP_INSTANCE || 'centralclaidsstance';
const PHONE_TO_TEST = process.argv[2] || process.env.CENTRAL_WHATSAPP_NUMBER || '';

console.log(`\n[CONFIG]`);
console.log(`  OTP Instance: ${OTP_INSTANCE_NAME}`);
console.log(`  API URL: ${process.env.EVOLUTION_API_URL}`);
console.log(`  Test Phone: ${PHONE_TO_TEST || 'Not configured - provide as argument'}`);
console.log('');

async function testOTPInstance() {
  console.log('─'.repeat(60));
  console.log('[STEP 1] Checking OTP instance connection status...');
  console.log('─'.repeat(60));

  try {
    // Check connection status
    const status = await getOTPInstanceStatus();

    console.log(`\n[RESULT] Instance: ${status.instanceName}`);
    console.log(`[RESULT] State: ${status.state}`);
    console.log(`[RESULT] Connected: ${status.connected ? 'YES ✓' : 'NO ✗'}`);

    if (status.connected) {
      console.log('\n✓ OTP instance is connected and ready!');
    } else {
      console.log('\n✗ OTP instance is NOT connected.');
      console.log('  Please ensure the instance is logged in and connected.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Failed to check OTP instance status:', error.message);
    process.exit(1);
  }

  // Test sending OTP message
  if (PHONE_TO_TEST) {
    console.log('\n' + '─'.repeat(60));
    console.log('[STEP 2] Sending test OTP message...');
    console.log('─'.repeat(60));

    console.log(`\n[SENDING] To: ${PHONE_TO_TEST}`);
    console.log(`[SENDING] OTP: ${TEST_OTP}`);
    console.log(`[SENDING] Via Instance: ${OTP_INSTANCE_NAME} (OTP ONLY)`);

    try {
      const result = await sendOTPMessage(PHONE_TO_TEST, TEST_OTP);

      if (result.success) {
        console.log('\n✓ OTP message sent successfully!');
        console.log(`  Message ID: ${result.waMessageId}`);
        console.log(`  Sent Via: ${result.sentVia}`);
      } else {
        console.log('\n✗ Failed to send OTP message.');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n✗ Error sending OTP message:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n' + '─'.repeat(60));
    console.log('[STEP 2] SKIPPED - No phone number provided');
    console.log('─'.repeat(60));
    console.log('\n  To test sending OTP, provide a phone number:');
    console.log('  node scripts/testOTPInstance.js 918899966757');
  }

  console.log('\n' + '='.repeat(60));
  console.log('[TEST COMPLETE] OTP instance verification finished!');
  console.log('='.repeat(60));
}

// Run the test
testOTPInstance().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
