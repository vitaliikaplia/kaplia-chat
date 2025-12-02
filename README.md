# Kaplia Chat Widget (Working with WebSockets)

A complete, self-hosted live chat solution built with Node.js and WebSockets. It includes a server, a client-side chat widget for your website, and an admin panel for support agents.

## Project Overview

This chat application is designed to be a lightweight, performant, and easily deployable live support tool for any website. It provides real-time, two-way communication between your website visitors and your support agents through a clean, modern interface. With a focus on simplicity and flexibility, it can be self-hosted on your own server, giving you full control over your data and infrastructure.

The system is also built to be highly extensible, allowing for powerful integrations with automation platforms like **n8n**, CRMs, or other internal tools through its built-in REST API and Webhook support.

## Features

### Core Features
- **Real-time Communication**: Instant message delivery using WebSockets with synchronization across multiple user tabs.
- **Spy Typing (Real-time Preview)**: Admins can see what users are typing in real-time before they hit send, allowing for faster responses.
- **Origin/CORS Control**: Restrict widget usage to specific domains with wildcard support (e.g., `https://*.example.com`). Empty list allows all origins.

### Admin Panel (React + Vite)
- **Modern UI**: Rebuilt with React and Vite for better performance and user experience.
- **User Online/Offline Status**: Real-time indicators showing which users are online (green) or offline (gray/semi-transparent). Online users are sorted to the top of the list.
- **Tab Activity Indicator**: Eye icon shows if user's browser tab is active (green eye) or in background (gray crossed eye).
- **Activity Log (System Messages)**: Comprehensive logging of user activity saved to database:
  - 🟢 User connected (opened page with widget)
  - 🔴 User disconnected (closed page)
  - 👁 Tab became active / 👁‍🗨 Tab went to background
  - 💬 Chat opened / ✖️ Chat closed
  - 🔗 Page navigation with URL tracking
- **Current Page URL**: Shows the current page URL the user is viewing in the chat header.
- **Smart Navigation Detection**: Distinguishes between page navigation and actual tab switches - only logs relevant events.
- **Message Management**: Ability to delete specific messages instantly.
- **Session Management**: View detailed user metadata, System Session IDs, and delete entire chat sessions.
- **Customization**: Configure admin passwords, API tokens, and Webhook settings directly from the UI.
- **Sound Notifications**: 10 different notification sounds to choose from (Chime, Pop, Ding, Bubble, Magic, Xylophone, Water Drop, Bell, Whistle, Coin). Each sound can be previewed before selection.
- **Remember Me**: Option to stay logged in across browser sessions.
- **Auto-Reconnect**: Automatically reconnects when connection is lost (e.g., when browser tab is in background). No duplicate "login successful" notifications on reconnect.
- **Toast Notifications**: Visual feedback for all actions (save, copy, errors, etc.).

### Spam Protection
- **Rate Limiting**: Configure maximum messages per minute per user (default: 20).
- **Message Length Limit**: Set maximum characters per message (default: 1000).
- **Real-time Feedback**: Users receive instant feedback when limits are exceeded.

### Smart Widget
- **Auto-Open**: The widget automatically expands when an admin sends a reply.
- **Link Parsing**: URLs in messages are automatically detected and converted into clickable links.

### Other Features
- **Localization**: Full support for custom Timezones and Date/Time formats to match your business region.
- **Simple Integration**: Easily add the chat widget to any website with a simple JavaScript snippet.
- **REST API & Webhooks**: Programmatically send messages and receive notifications for seamless integration with other services.
- **Secure & Self-Hosted**: Run it on your own infrastructure under Nginx with SSL encryption for maximum privacy and control.
- **Automation-Ready**: Perfectly suited for integration with platforms like n8n, Zapier, or Make.

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
    *Note: Place the application files (`index.js`, `widget.js`, `admin-panel/dist/`, etc.) in this directory.*

2.  **Initialize the project and install dependencies**:
    ```bash
    npm init -y
    npm install ws express better-sqlite3
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

### Initial Login Credentials

For a fresh installation, the following default credentials are created. It is **highly recommended** to change these immediately after your first login via the Admin Panel.

-   **Admin Username**: `admin`
-   **Admin Password**: `1122334455667788`
-   **Default API Token**: `MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6`

---

## Client-side Integration

To integrate the chat widget into your website, simply include the `widget.js` script in your HTML. You can also customize its behavior and appearance by defining a `window.KapliaChatConfig` object before the script.

### Basic HTML Integration

Add the following snippet just before your closing `</body>` tag:

```html
<script>
    window.KapliaChatConfig = {
        defaultLanguage: 'en',
        initialMessages: ['Hello! How can I help you today?'],
        i18n: {
            en: {
                title: 'Live Chat 👋',
                subtitle: 'We are here to help!',
                inputPlaceholder: 'Type your question..',
                sendBtn: 'Send'
            },
            ua: {
                title: 'Онлайн підтримка 👋',
                subtitle: 'Ми готові допомогти!',
                inputPlaceholder: 'Введіть своє запитання..',
                sendBtn: 'Надіслати'
            }
        },
        metadata: {
            // Optional: User data to send with messages
            user_id: 'guest_123',
            user_name: 'Guest User',
            user_email: 'guest@example.com'
        }
    };
</script>
<script src="https://chat.yourdomain.com/widget.js"></script>
```

*Note: Replace `https://chat.yourdomain.com` with the actual URL of your deployed chat server.*

### Example Client Page

For a full working example of how to embed and configure the chat widget, refer to the `chat-client/chat.html` file in this repository. It demonstrates a basic HTML page with the chat widget integrated, showing how to pass initial configuration and metadata.

## Use Cases & Integrations

### Integration with n8n (or other automation tools)

This chat widget is perfect for building automated support workflows with platforms like **n8n**, Zapier, or Make. By combining Webhooks and the REST API, you can create a seamless, real-time bridge between your website visitors and your backend systems, such as a support team on Telegram.

**Example Workflow: Website Chat -> n8n -> Telegram**

1.  **Receive a Message**: A user sends a message on your website. The chat server instantly fires a **Webhook** with the message content and user metadata.
2.  **Catch the Webhook in n8n**: Create an n8n workflow that starts with a **Webhook node**. Use the URL from this node in the chat's Admin Panel.
3.  **Process and Forward**: The n8n workflow receives the data. You can parse the user's name, email, and message. Then, use the **Telegram node** to forward this message to a private support channel, notifying your team instantly.
4.  **Reply from Telegram**: Your support agent replies in the Telegram channel.
5.  **Send the Reply Back**: An n8n workflow can listen for replies from the agent on Telegram. It then uses the **HTTP Request node** to call the chat's **REST API**, sending the agent's message back to the correct user on the website in real-time.

This creates a powerful, two-way communication channel, allowing your team to manage customer support from a platform like Telegram, while n8n handles the automation in between.

---

## API & Webhook Documentation

The application provides a REST API for sending messages and a Webhook system for receiving them.

### Authentication

-   **Base URL**: `https://chat.yourdomain.com/`
-   **API Token**: Your unique token, which can be managed in the Admin Panel (`Settings -> API Token`).

### Receiving Messages (Webhook)

The server can send an instant notification to a specified URL whenever a user sends a message. This is the primary way to integrate incoming messages with external systems.

#### 1. How to Configure
1.  Go to the Chat Admin Panel.
2.  Navigate to **⚙️ Options -> 🔗 Webhook**.
3.  Enter the full URL of your listener (e.g., your n8n Webhook node URL).
4.  Check the **"Enable sending"** box and click **"Save"**.

#### 2. Request Details
-   **Method**: `POST`
-   **Headers**: `Content-Type: application/json`
-   **Trigger**: Fires immediately when a new message is received from a client.

#### 3. Request Body (JSON Payload)
The server sends a JSON object containing the message text and all available session metadata.

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

### Sending Messages (REST API)

This API allows you to programmatically send messages from a backend system (like an n8n workflow) to a specific user on your website.

#### 1. Get Chat ID (`targetId`)
First, you need the `session_id` of the user. This is typically received from the initial webhook.

-   **Request**: `GET /?get-all-chats-api=true&token=YOUR_API_TOKEN`
    *(This endpoint can also be used to list all active chats.)*

#### 2. Send a Message
-   **Endpoint**: `/?send-message-to-chat-api=true`
-   **Method**: `POST` (recommended) or `GET`
-   **Content-Type**: `application/json` or `application/x-www-form-urlencoded`

**Request Parameters**:

| Parameter                | Type    | Description                                                 |
| ------------------------ | ------- | ----------------------------------------------------------- |
| `send-message-to-chat-api` | `true`  | **Required.** A flag to activate the send message mode.     |
| `token`                  | `string`| **Required.** Your API token.                               |
| `targetId`               | `string`| **Required.** The `session_id` of the user you want to message. |
| `message`                | `string`| **Required.** The text of the message.                      |

**Code Examples**:

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

**Server Responses**:

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

## Admin Panel Development

The admin panel is built with React and Vite. If you want to modify it:

### Prerequisites
- Node.js 18+ installed

### Development

```bash
cd chat-server/admin-panel

# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:5173` by default.

### Building for Production

```bash
cd chat-server/admin-panel
npm run build
```

This creates optimized files in `admin-panel/dist/` directory that are served by the main Node.js server.

### Project Structure

```
admin-panel/
├── src/
│   ├── components/     # React components (Modal, Sidebar, ChatArea, etc.)
│   ├── context/        # React Context for state management
│   ├── hooks/          # Custom hooks (useWebSocket)
│   ├── utils/          # Utilities (notification sounds)
│   ├── App.jsx         # Main application component
│   └── main.jsx        # Entry point
├── dist/               # Production build (served by server)
└── package.json
```

---

## License

MIT License - feel free to use this project for personal or commercial purposes.