const express = require('express');
const https = require('https');
const { URLSearchParams } = require('url');

const redirect_uri = 'http://localhost:3000/callback';

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 20px;
          }
          h1, h2 {
            color: #333;
          }
          form {
            max-width: 400px;
            margin: 0 auto;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input[type="text"] {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
          }
          input[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          input[type="submit"]:hover {
            background-color: #45a049;
          }
        </style>
      </head>
      <body>
        <h1>To generate your refresh_token:</h1>
        <ol>
           <li>Go to the <a href="https://developer.spotify.com/dashboard/applications" target="_blank">Spotify Developer Dashboard</a>.</li>
           <li>Click "Create an App".</li>
           <li>Fill in the required details:
              <ul>
                <li><strong>App Name:</strong> Choose a name.</li>
                <li><strong>App Description:</strong> Provide a description.</li>
                <li><strong>Redirect URIs:</strong> Enter <code>http://localhost:3000/callback</code> and click "Add".</li>
              </ul>
           </li>
           <li>Accept the terms and click "Save".</li>
        </ol>

        <h2>To obtain the <code>client_id</code> and <code>client_secret</code>:</h2>
        <ol>
           <li>Click "Settings".</li>
           <li>Note your "Customer ID".</li>
           <li>Click "View Client Secret" to see your "Client Secret".</li>
        </ol>

        <p>Finally, copy and paste both the <code>client_id</code> and <code>client_secret</code> below, then click "Authorize". Log in to Spotify and authorize the application. You will then see a JSON with your <code>refresh_token</code>.</p>

        <form action="/login" method="post">
          <label for="client_id">Client ID:</label>
          <input type="text" id="client_id" name="client_id" required><br><br>
          <label for="client_secret">Client Secret:</label>
          <input type="text" id="client_secret" name="client_secret" required><br><br>
          <input type="submit" value="Authorize">
        </form>
      </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const clientId = req.body.client_id;
  const clientSecret = req.body.client_secret;
  const authURL = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-currently-playing',
    redirect_uri: redirect_uri,
    state: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
  }).toString()}`;
  res.redirect(authURL);
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const state = JSON.parse(req.query.state || '{}');
  const { client_id, client_secret } = state;
  const tokenURL = 'https://accounts.spotify.com/api/token';

  const postData = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirect_uri,
    client_id: client_id,
    client_secret: client_secret
  }).toString();

  const options = {
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  };

  const tokenReq = https.request(options, (tokenRes) => {
    let data = '';
    tokenRes.on('data', (chunk) => { data += chunk; });
    tokenRes.on('end', () => {
      const response = JSON.parse(data);
      res.send(response);
    });
  });

  tokenReq.on('error', (e) => {
    res.send('Error getting tokens: ' + e.message);
  });

  tokenReq.write(postData);
  tokenReq.end();
});

app.listen(PORT, () => {
  console.log(`Server is running, visit: http://localhost:${PORT}`);
});
