# 2FA Authenticator

[中文文档](./README.md)

A cloud-based 2FA authenticator built on Cloudflare Workers + KV.

## Features

- **TOTP Generation**: Compatible with Google Authenticator, Authy, and other standard TOTP protocols
- **Cloud Sync**: Data stored in Cloudflare KV, accessible across devices
- **End-to-End Encryption**: AES-256-GCM encryption, server only stores ciphertext
- **Zero Registration**: No email/phone required, create account with just a master password
- **QR Code Scanning**: Support camera scanning, image upload, and clipboard paste to recognize QR codes
- **Import/Export**: JSON format backup support for data migration and local backup

## Architecture

```
Browser <--HTTPS--> Cloudflare Worker <--KV API--> KV Storage
   |                    |
   | Client-side        | Only stores
   | encrypt/decrypt    | ciphertext
   | TOTP generation    | API routing
```

**Security Design**:
| Aspect | Measure |
|--------|---------|
| Data Encryption | AES-256-GCM, encrypted on client before transmission |
| Key Derivation | PBKDF2-SHA256, 600,000 iterations |
| User Identification | Password hash (PBKDF2) |

## Deployment Guide

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

### Step 3: Create KV Namespace

```bash
# Navigate to project directory
cd 2fa

# Create production KV
wrangler kv namespace create DATA_KV
# Output like: { binding = "DATA_KV", id = "xxxxxxxxxxxx" }

# Create preview KV
wrangler kv namespace create DATA_KV --preview
# Output like: { binding = "DATA_KV", preview_id = "yyyyyyyyyyyy" }
```

### Step 4: Configure wrangler.toml

Fill in the `id` and `preview_id` from the previous step into `wrangler.toml`:

```toml
name = "2fa-sync"
main = "worker.js"
compatibility_date = "2024-01-01"
assets = { directory = "./public" }

[[kv_namespaces]]
binding = "DATA_KV"
id = "xxxxxxxxxxxx"        # Replace with your id
preview_id = "yyyyyyyyyyyy" # Replace with your preview_id
```

### Step 5: Local Testing (Optional)

```bash
wrangler dev
# Visit http://localhost:8787
```

### Step 6: Deploy

```bash
wrangler deploy
# Output like: Published 2fa-sync (https://2fa-sync.xxx.workers.dev)
```

After deployment, visit the output URL to start using.

## Usage Guide

### First Time Setup (Create Account)

1. Visit the deployed URL
2. Click "First time? Create account"
3. Set a master password (at least 4 characters)
4. Confirm password and click "Set Password"

### Login

1. Enter master password
2. Click "Unlock"

### Add 2FA Key

Click the "+" button in the top right, three methods available:

**Manual Input**:
1. Enter a name (e.g., GitHub)
2. Enter the Base32 format secret key
3. Click "Add"

**Scan QR Code**:
1. Switch to "Scan" tab
2. Click "Start Camera"
3. Point the QR code at the camera, auto-fills when recognized

**Upload Image**:
1. Switch to "Upload" tab
2. Click to select, drag and drop, or paste a screenshot
3. Auto-fills when recognized

### Use Verification Code

- Click the code to copy to clipboard
- The ring on the right shows remaining valid time (30-second cycle)

### Logout

Click the logout button in the top left to clear current session and return to login page.

### Import/Export

**Export Backup**:
1. After login, click the "Export" button at the bottom of the page
2. Download the JSON format backup file (stored in plaintext, keep it safe)

**Import Backup**:
1. Click the "Import" button at the bottom of the page
2. Select a previously exported JSON file
3. Duplicate keys (same name) will be skipped, existing data preserved, only new keys imported

## Important Notes

1. **Password Cannot Be Recovered**: Forgetting password means losing all data - remember your master password
2. **Password = Account**: Same password = same account, use the same password on different devices to sync data
3. **Session Expiry**: Session expires when browser tab is closed, password required to login again
4. **Network Required**: Internet connection required (data stored in cloud)

## Project Structure

```
2fa/
├── public/
│   └── index.html  # Frontend
├── worker.js       # Cloudflare Worker (handles /api/* requests only)
├── wrangler.toml   # Wrangler configuration
└── README.md       # Documentation
```

## License

MIT