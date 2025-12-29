# QR Code Pairing

HAPI supports QR code-based pairing for easy setup with mobile devices, compatible with both the HAPI web app and happy-mobile clients.

## Overview

Instead of manually entering the `CLI_API_TOKEN`, you can pair your mobile device or web browser by scanning a QR code displayed on the CLI. This simplifies the authentication process and makes it more secure.

## How It Works

1. **CLI generates QR code**: The CLI creates a temporary pairing session and displays a QR code
2. **Mobile app scans**: The mobile device scans the QR code using the camera
3. **Authentication exchange**: The pairing token is exchanged for the actual API token
4. **Automatic login**: The mobile device is automatically authenticated with the server

## Usage

### CLI Side

Run the QR pairing command:

```bash
hapi auth qr-pair
```

This will:
- Connect to the HAPI server
- Generate a temporary pairing token
- Display a QR code in your terminal
- Wait for a mobile device to scan it (times out after 5 minutes)

Once scanned successfully, the CLI will confirm and save the credentials to `~/.hapi/settings.json`.

### Mobile/Web Side

1. **Web App**: On the login screen, click the "📷 Scan QR Code to Pair" button
2. **Happy-Mobile**: Use the QR scanner feature in the app

The app will:
- Request camera permissions
- Scan the QR code
- Automatically complete the pairing
- Log you in to the HAPI server

## Protocol

### QR Code Format

The QR code contains a URL in the format:

```
hapi://pair?token=<pairing_token>
```

This URL scheme is compatible with both HAPI and happy-mobile clients.

### API Endpoints

#### 1. Initiate Pairing (Server)

**POST** `/api/pairing/initiate`

Creates a new pairing session and returns a QR code.

**Response:**
```json
{
  "pairingToken": "base64url_encoded_token",
  "pairingUrl": "hapi://pair?token=...",
  "httpUrl": "https://server.com/api/happy/pair?token=...",
  "qrCode": "data:image/png;base64,...",
  "expiresInSeconds": 300
}
```

#### 2. Check Pairing Status (CLI)

**POST** `/api/pairing/check`

Polls for pairing completion.

**Request:**
```json
{
  "pairingToken": "base64url_encoded_token"
}
```

**Response (Pending):**
```json
{
  "status": "pending",
  "expiresAt": 1234567890000
}
```

**Response (Completed):**
```json
{
  "status": "completed",
  "cliApiToken": "actual_api_token",
  "machineId": "machine_identifier"
}
```

#### 3. Complete Pairing (Mobile)

**POST** `/api/pairing/complete`

Called by mobile app after scanning QR code.

**Request:**
```json
{
  "pairingToken": "base64url_encoded_token",
  "cliApiToken": "actual_api_token",
  "machineId": "device_identifier"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pairing completed successfully"
}
```

## Happy-Mobile Compatibility

HAPI includes a compatibility layer for happy-mobile clients at `/api/happy/*`:

### Endpoints

- **POST** `/api/happy/pair` - Happy-mobile pairing endpoint
- **POST** `/api/happy/sync` - Session synchronization
- **GET** `/api/happy/status` - Server status

### Example Happy-Mobile Pairing

**Request:**
```json
{
  "token": "pairing_token_from_qr",
  "deviceId": "mobile_device_id",
  "deviceName": "iPhone 13"
}
```

**Response:**
```json
{
  "success": true,
  "apiToken": "cli_api_token",
  "machineId": "mobile_device_id",
  "message": "Pairing successful"
}
```

## Security

- Pairing tokens expire after 5 minutes
- Tokens can only be used once
- Failed pairing attempts are logged
- The actual `CLI_API_TOKEN` is never exposed in the QR code
- All communication should be over HTTPS in production

## Troubleshooting

### QR Code Not Scanning

- Ensure good lighting
- Hold the device steady
- Make sure the QR code is fully visible on screen
- Try increasing the terminal window size for a larger QR code

### Pairing Timeout

- The pairing session expires after 5 minutes
- Run `hapi auth qr-pair` again to generate a new QR code

### Connection Refused

- Make sure the HAPI server is running
- Check that `HAPI_SERVER_URL` is set correctly
- Verify network connectivity between CLI and server

### Camera Permissions

- The web app needs camera permissions to scan QR codes
- Grant permissions when prompted by your browser
- On iOS, camera access may be restricted in WebView contexts

## Example Workflow

```bash
# On your development machine (where code is)
$ hapi auth qr-pair

🔗 QR Code Pairing

Scan this QR code with your mobile device to pair with HAPI.

[QR CODE DISPLAYED HERE]

Pairing URL: hapi://pair?token=abc123...
Token expires in 300 seconds

Waiting for mobile device to scan...

# [Scan with mobile device]

✓ Pairing successful!
Token saved to /Users/you/.hapi/settings.json
Machine ID: mobile-1234567890
```

Then on your mobile device, you're automatically logged in and can monitor/control sessions.

## See Also

- [CLI Authentication](../cli/README.md#authentication)
- [Server Configuration](../server/README.md#configuration)
- [Web App Login](../web/README.md)
