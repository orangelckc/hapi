# QR Code Pairing - Integration Testing Guide

This guide walks through manual testing of the QR code pairing feature.

## Prerequisites

1. HAPI server running (either locally or deployed)
2. HAPI CLI installed
3. Mobile device or web browser with camera access

## Test Scenarios

### Scenario 1: Basic QR Code Pairing (CLI → Web)

**Steps:**

1. Start the HAPI server:
   ```bash
   hapi server
   # Note the server URL, e.g., http://localhost:3006
   ```

2. In another terminal, set the server URL and initiate QR pairing:
   ```bash
   export HAPI_SERVER_URL="http://localhost:3006"
   hapi auth qr-pair
   ```

3. You should see:
   - A QR code displayed in the terminal
   - Pairing URL (hapi://pair?token=...)
   - "Waiting for mobile device to scan..." message

4. Open a web browser and navigate to `http://localhost:3006`

5. On the login screen, click "📷 Scan QR Code to Pair"

6. Allow camera permissions if prompted

7. Point the camera at the QR code in the terminal

8. Verify:
   - ✓ QR code is recognized
   - ✓ Web app shows "Pairing successful!" or similar message
   - ✓ CLI shows "✓ Pairing successful!"
   - ✓ You are automatically logged into the web app
   - ✓ Token is saved to `~/.hapi/settings.json`

**Expected Results:**
- Pairing completes within 2-5 seconds
- Both CLI and web confirm success
- User is logged in automatically

---

### Scenario 2: QR Code Expiration

**Steps:**

1. Start QR pairing:
   ```bash
   hapi auth qr-pair
   ```

2. Wait 5+ minutes WITHOUT scanning

3. Verify:
   - ✓ CLI shows "✗ Pairing timeout - QR code expired"
   - ✓ Subsequent scan attempts fail with "expired" error

**Expected Results:**
- Timeout occurs after 5 minutes
- User must run `hapi auth qr-pair` again

---

### Scenario 3: Manual Cancellation

**Steps:**

1. Start QR pairing:
   ```bash
   hapi auth qr-pair
   ```

2. Press Ctrl+C before scanning

3. Verify:
   - ✓ CLI shows "Pairing cancelled"
   - ✓ Process exits cleanly

**Expected Results:**
- Clean exit with informative message

---

### Scenario 4: Network Error Handling

**Steps:**

1. Ensure HAPI server is NOT running

2. Try to initiate pairing:
   ```bash
   hapi auth qr-pair
   ```

3. Verify:
   - ✓ CLI shows connection error
   - ✓ Helpful error message mentions server URL
   - ✓ Suggests checking server status

**Expected Results:**
- Clear error message
- Helpful troubleshooting hints

---

### Scenario 5: Happy-Mobile Compatibility

**Note:** This requires the happy-mobile app. If not available, this can be simulated.

**Steps:**

1. Start QR pairing on CLI

2. Scan with happy-mobile app

3. Verify:
   - ✓ happy-mobile recognizes `hapi://pair?token=...` URL
   - ✓ Pairing completes via `/api/happy/pair` endpoint
   - ✓ happy-mobile receives API token
   - ✓ CLI confirms pairing

**Expected Results:**
- happy-mobile successfully pairs with HAPI server
- Sessions are visible in happy-mobile app

---

### Scenario 6: Multiple Pairing Attempts

**Steps:**

1. Complete a successful pairing (Scenario 1)

2. Run `hapi auth qr-pair` again

3. Scan with a different device or browser

4. Verify:
   - ✓ New QR code is generated
   - ✓ Previous token is no longer valid
   - ✓ New pairing succeeds
   - ✓ Token in settings.json is updated

**Expected Results:**
- Each pairing session is independent
- Tokens are properly updated

---

## API Endpoint Tests

### Test Pairing Endpoints with curl

1. **Initiate Pairing:**
   ```bash
   curl -X POST http://localhost:3006/api/pairing/initiate \
     -H "Content-Type: application/json"
   ```
   
   Expected response:
   ```json
   {
     "pairingToken": "...",
     "pairingUrl": "hapi://pair?token=...",
     "httpUrl": "http://localhost:3006/api/happy/pair?token=...",
     "qrCode": "data:image/png;base64,...",
     "expiresInSeconds": 300
   }
   ```

2. **Check Pairing Status:**
   ```bash
   TOKEN="<pairing_token_from_above>"
   curl -X POST http://localhost:3006/api/pairing/check \
     -H "Content-Type: application/json" \
     -d "{\"pairingToken\": \"$TOKEN\"}"
   ```
   
   Expected response (before scan):
   ```json
   {
     "status": "pending",
     "expiresAt": 1234567890000
   }
   ```

3. **Complete Pairing:**
   ```bash
   curl -X POST http://localhost:3006/api/pairing/complete \
     -H "Content-Type: application/json" \
     -d '{
       "pairingToken": "'$TOKEN'",
       "cliApiToken": "test-token",
       "machineId": "test-device"
     }'
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "message": "Pairing completed successfully"
   }
   ```

---

## Troubleshooting

### QR Code Not Displaying

- Check terminal supports Unicode/extended ASCII
- Try increasing terminal window size
- Verify server is reachable

### Camera Not Working

- Check browser/app has camera permissions
- Try a different browser
- Ensure HTTPS is used (camera API requires secure context)

### Pairing Hangs

- Check network connectivity
- Verify server logs for errors
- Ensure no firewall blocking requests

### Token Not Saved

- Check file permissions on `~/.hapi/` directory
- Verify disk space
- Check CLI error output

---

## Success Criteria

All scenarios should pass with:
- ✓ Clear user feedback at each step
- ✓ Proper error handling
- ✓ Security (tokens expire, single use)
- ✓ Happy-mobile compatibility
- ✓ Consistent behavior across devices

---

## Automated Testing

For CI/CD, consider:
- Unit tests for pairing token generation
- Integration tests with mock QR scanner
- API endpoint tests
- Expiration logic tests

See `/tmp/test-pairing.js` for a basic unit test example.
