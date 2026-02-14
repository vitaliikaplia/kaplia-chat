const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
// Auto-deploy v3
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const SECRET = process.env.DEPLOY_SECRET || 'CHANGE_ME';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');
const LOG_FILE = path.join(__dirname, 'deploy.log');
const BRANCH = 'master';

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(line.trim());
}

function verifySignature(payload, signature) {
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/deploy') {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        // Verify GitHub signature
        const signature = req.headers['x-hub-signature-256'];
        if (!verifySignature(body, signature)) {
            log('ERROR: Invalid signature');
            res.writeHead(403);
            res.end('Invalid signature');
            return;
        }

        // Parse payload
        let payload;
        try {
            payload = JSON.parse(body);
        } catch (e) {
            log('ERROR: Invalid JSON');
            res.writeHead(400);
            res.end('Invalid JSON');
            return;
        }

        // Only deploy on push to master
        if (payload.ref !== `refs/heads/${BRANCH}`) {
            log(`Skipped: push to ${payload.ref}, not ${BRANCH}`);
            res.writeHead(200);
            res.end('Skipped: not target branch');
            return;
        }

        const pusher = payload.pusher?.name || 'unknown';
        const commitMsg = payload.head_commit?.message || 'no message';
        log(`Deploy triggered by ${pusher}: ${commitMsg}`);

        // Respond immediately
        res.writeHead(200);
        res.end('Deploy started');

        // Run deploy script
        exec(`bash ${DEPLOY_SCRIPT}`, { cwd: __dirname, timeout: 120000 }, (error, stdout, stderr) => {
            if (error) {
                log(`DEPLOY FAILED: ${error.message}`);
                if (stderr) log(`STDERR: ${stderr}`);
            } else {
                log('DEPLOY SUCCESS');
            }
            if (stdout) log(`OUTPUT: ${stdout}`);
        });
    });
});

server.listen(PORT, () => {
    log(`Deploy webhook listening on port ${PORT}`);
});
