# Live Chat Widget

A complete, self-hosted live chat solution built with Node.js and WebSockets. It includes a server, a client-side chat widget for your website, and an admin panel for support agents.

## Features

- **Real-time Communication**: Instant message delivery using WebSockets.
- **Admin Panel**: A dedicated interface for support agents to view and respond to user chats.
- **Simple Integration**: Easily add the chat widget to any website with a simple JavaScript snippet.
- **REST API**: Programmatically send messages to users.
- **Webhook Support**: Integrate with external systems (like a CRM or notification service) by receiving instant notifications for new messages.
- **Secure**: Designed to work behind Nginx with SSL encryption.

---


## Server Installation and Setup

This guide provides instructions for deploying the chat server on a Debian/Ubuntu-based Linux distribution.

### Step 1: Install Node.js and Nginx

First, update your system packages and install the latest LTS version of Node.js and the Nginx web server.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Add Node.js repository (v20.x) and install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

### Step 2: Place SSL Certificates

For secure communication (WSS), you need SSL certificates. This guide uses Cloudflare Origin Certificates, but any valid certificate will work.

1.  **Create the certificate file**:
    ```bash
    sudo nano /etc/ssl/certs/chat.yourdomain.com.pem
    ```
    Paste your certificate content (e.g., Cloudflare Origin Certificate) into this file. Save and exit.

2.  **Create the private key file**:
    ```bash
    sudo nano /etc/ssl/private/chat.yourdomain.com.key
    ```
    Paste your private key content into this file. Save and exit.

### Step 3: Configure Nginx as a Reverse Proxy

Configure Nginx to handle SSL and forward traffic, including WebSocket connections, to the Node.js application.

1.  **Create an Nginx configuration file**:
    ```bash
    sudo nano /etc/nginx/sites-available/chat.yourdomain.com
    ```

2.  **Paste the following configuration**, replacing `chat.yourdomain.com` with your actual domain and ensuring the `proxy_pass` port matches your Node.js application's port (e.g., 8080).

    ```nginx
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name chat.yourdomain.com;
        return 301 https://$host$request_uri;
    }

    # Main HTTPS server configuration
    server {
        listen 443 ssl;
        server_name chat.yourdomain.com;

        # Paths to your SSL certificates
        ssl_certificate /etc/ssl/certs/chat.yourdomain.com.pem;
        ssl_certificate_key /etc/ssl/private/chat.yourdomain.com.key;

        # SSL optimizations
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            proxy_pass http://localhost:8080; # Port where your Node.js app runs
            proxy_http_version 1.1;

            # Required headers for WebSocket connections
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # Forward real client IP address
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header CF-Connecting-IP $http_cf_connecting_ip; # If using Cloudflare

            # Increase timeout for long-lived connections
            proxy_read_timeout 86400s; # 24 hours
            proxy_send_timeout 86400s;
        }
    }
    ```

3.  **Activate the site and restart Nginx**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/chat.yourdomain.com /etc/nginx/sites-enabled/
    sudo nginx -t  # Test the configuration
    sudo systemctl restart nginx
    ```

### Step 4: Set Up the Node.js Application

1.  **Create a directory for the application and navigate into it**:
    ```bash
    mkdir ~/chat-server
    cd ~/chat-server
    ```
    *Note: Place the application files (`index.js`, `admin.html`, etc.) in this directory.*

2.  **Initialize the project and install dependencies**:
    ```bash
    npm init -y
    npm install ws # Or other dependencies from your package.json
    ```

### Step 5: Run the Application with PM2

Use [PM2](https://pm2.keymetrics.io/), a process manager for Node.js, to keep your application running continuously.

1.  **Install PM2 globally**:
    ```bash
    sudo npm install -g pm2
    ```

2.  **Start your application**:
    ```bash
    # Replace index.js with your main application file
    pm2 start index.js --name "chat-widget"
    ```

3.  **Enable PM2 to start on server reboot**:
    ```bash
    pm2 save
    pm2 startup
    ```
    *(Run the command that `pm2 startup` outputs to register it with systemd).*

### Step 6: Configure Firewall (UFW)

Ensure that your server's firewall allows web traffic.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---


## API Documentation

The application provides a REST API for sending messages and a Webhook system for receiving them.

### Authentication

-   **Base URL**: `https://chat.yourdomain.com/`
-   **API Token**: `MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6` (Example)

*Note: The API token can be changed in the Admin Panel -> Settings -> API Token.*

### Sending Messages (API)

This API allows you to programmatically send messages from the support team to a specific user on the website.

#### 1. Get Chat ID (`targetId`)

Before sending a message, you need the user's `session_id`, which serves as the `targetId`.

-   **Request**: `GET /?get-all-chats-api=true&token=YOUR_API_TOKEN`

    ```http
    https://chat.yourdomain.com/?get-all-chats-api=true&token=MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6
    ```

-   **Success Response (200 OK)**:
    A JSON array of active chat sessions.

    ```json
    [
      {
        "session_id": "user_k92lx8",
        "metadata": {
            "user_name": "Vitaliy",
            "user_email": "dev@test.com"
        },
        "updated_at": "2023-10-27 10:00:00"
      }
    ]
    ```
    Copy the required `session_id` (e.g., `user_k92lx8`) to use as your `targetId`.

#### 2. Send a Message

You can send a message using either a GET or a POST request. POST is recommended for longer messages or those containing special characters.

**Endpoint**: `/?send-message-to-chat-api=true`

**Request Parameters**:

| Parameter                | Type    | Description                                                 |
| ------------------------ | ------- | ----------------------------------------------------------- |
| `send-message-to-chat-api` | `true`  | **Required.** A flag to activate the send message mode.     |
| `token`                  | `string`| **Required.** Your API token.                               |
| `targetId`               | `string`| **Required.** The `session_id` of the user you want to message. |
| `message`                | `string`| **Required.** The text of the message.                      |

**Method A: GET Request (for quick tests)**

```http
https://chat.yourdomain.com/?send-message-to-chat-api=true&token=YOUR_API_TOKEN&targetId=user_k92lx8&message=Hello%20from%20the%20API
```

**Method B: POST Request (Recommended)**

-   **Endpoint**: `https://chat.yourdomain.com/?send-message-to-chat-api=true`
-   **Content-Type**: `application/json` or `application/x-www-form-urlencoded`

**PHP (cURL) Example:**
```php
<?php

$url = 'https://chat.yourdomain.com/?send-message-to-chat-api=true';
$token = 'MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6';

$data = [
    'token'    => $token,
    'targetId' => 'user_k92lx8', // The chat ID to send to
    'message'  => 'Hello from a PHP script! 🚀'
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    echo "Success: " . $response;
} else {
    echo "Error ($httpCode): " . $response;
}
?>
```

**JavaScript (Fetch) Example:**
```javascript
const sendMessage = async (chatId, text) => {
    const url = 'https://chat.yourdomain.com/?send-message-to-chat-api=true';
    const data = {
        token: 'MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6',
        targetId: chatId,
        message: text
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        console.log(result);
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

// Usage
sendMessage('user_k92lx8', 'Hello from the JS console!');
```

#### 3. Server Responses

-   **Success (200 OK)**:
    ```json
    {
        "status": "success",
        "sent_to": "user_k92lx8"
    }
    ```
-   **Authorization Error (403 Forbidden)**:
    ```json
    {
        "error": "Invalid Token"
    }
    ```
-   **Bad Request (400 Bad Request)**:
    ```json
    {
        "error": "Missing targetId or message"
    }
    ```

---


### Receiving Messages (Webhook)

The server can send an instant notification to a specified URL whenever a user sends a message in the chat widget.

#### 1. Request Details

-   **Method**: `POST`
-   **Headers**: `Content-Type: application/json`
-   **Trigger**: Fires immediately when a new message is received from a client.

#### 2. Request Body (JSON Payload)

The server sends a JSON object containing the message text and session data.

**Example Payload:**
```json
{
  "session_data": [
    {
      "session_id": "user_am6ysq",
      "metadata": {
        "user_session": "Ukraine, Kyiv Oblast, Olenivka (31.43.52.185), Mac, Google Chrome",
        "user_id": "2",
        "user_name": "Vitaliy Kaplia",
        "user_email": "vitalii.kaplia@gmail.com"
      },
      "updated_at": "2025-11-27 06:35:27"
    }
  ],
  "message_text": "Hello, I have a question about my order!"
}
```

#### 3. PHP Handler Example

Here is a basic PHP script to receive and process the webhook data.

```php
<?php
// Get the raw POST data from the request
$json = file_get_contents('php://input');

// Decode the JSON data
$data = json_decode($json, true);

if ($data && isset($data['message_text'])) {
    $message = $data['message_text'];
    $sessionInfo = $data['session_data'][0];

    $userId = $sessionInfo['metadata']['user_id'] ?? 'Guest';
    $userName = $sessionInfo['metadata']['user_name'] ?? 'Unknown';

    // YOUR CUSTOM LOGIC HERE:
    // 1. Save the message to a CRM
    // 2. Send a notification to Telegram or Slack
    // 3. Write to a log file

    $logEntry = "User $userName ($userId) wrote: $message\n";
    file_put_contents('webhook_log.txt', $logEntry, FILE_APPEND);

    // It's important to return a 200 OK response
    http_response_code(200);
    echo json_encode(['status' => 'received']);
} else {
    // Respond with an error if data is missing
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
}
?>
```

#### 4. How to Configure the Webhook

1.  Go to the Chat Admin Panel.
2.  Navigate to **⚙️ Options -> 🔗 Webhook**.
3.  Enter the full URL of your handler script (e.g., `https://yoursite.com/api/chat-webhook.php`).
4.  Check the **"Enable sending"** box.
5.  Click **"Save"**.

```