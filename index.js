const fs = require('fs');
const axios = require('axios');

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 7.0; Xperia Build/NDE63X) AppleWebKit/601.20 (KHTML, like Gecko)  Chrome/53.0.1617.352 Mobile Safari/602.9";
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const CLIENT_ID = 'you cient id';
const CLIENT_SECRET = 'you client secret';
const REFRESH_TOKEN = 'you refresh token';
const XENFORO_XF_USER_COOKIE = "you xenforo xf_user cookie value";
const SIGNATURE_BBCODE = "[int_rock]Now playing [int_setarosa]\n\n[RIGHT][MEDIA=Spotify]track/{0}[/MEDIA][/RIGHT]";
//const SIGNATUREHTML = "<h1>HTML</h1>";
const SIGNATURE_NO_PLAYNG = "[int_seta]";
const LOGFILE = "error.log"

async function getAccessToken(clientId, clientSecret, refreshToken) {
  const tokenURL = 'https://accounts.spotify.com/api/token';

  const data = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  }

  try {
    const response = await axios.post(tokenURL, data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get access token');
  }
}

async function updateXenforoSignature(cookie, { bbCode, html }) {
  const baseUrl = "https://www.ignboards.com";
  const xfUserCookie = `xf_user=${cookie}`;
  const ses = axios.create({
    maxRedirects: 0,
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: xfUserCookie,
    },
  });
  try {
    const res = await ses.get(`${baseUrl}/help`);
    checkLoggedIn(res.data);
    const xfCsrfCookie = extractXfCsrfCookie(res.headers);
    const xfToken = extractXfToken(res.data);
    data = {
      _xfToken: xfToken,
      signature: bbCode,
      signature_html: html,
      _xfResponseType: "json",
    };
    const resp = await ses.post(`${baseUrl}/account/signature`, data, {
      headers: {
        cookie: `${xfCsrfCookie}; $xf_user=${xfUserCookie}`,
      },
    });
    return resp.data;
  } catch (error) {
    throw new Error(error.message);
  }
}

function checkLoggedIn(htmlString) {
  const loggedInPattern = /data-logged-in="true"/;
  if (!loggedInPattern.test(htmlString)) {
    throw new Error("Not logged in! Please check your cookies.");
  }
}

function extractXfCsrfCookie(header) {
  return header["set-cookie"].map((ck) => ck.split(";")[0]).join("; ");
}

function extractXfToken(htmlString) {
  const xfTokenPattern = /name="_xfToken" value="([^"]+)"/;
  const match = xfTokenPattern.exec(htmlString);
  if (!match) {
    throw new Error("XfToken not found in HTML");
  }
  return match[1];
}

async function NowPlayingSignature() {
  const access_token = await getAccessToken(CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN);
  const response = await axios.get(NOW_PLAYING_ENDPOINT, {
      headers: {
          Authorization: `Bearer ${access_token}`,
      },
  });
  if (response.status === 200 && response.data.item) {
    const song = response.data;
    const songTitle = song.item.name;
    const songArtist = song.item.artists[0].name;
    console.log(`Now playing: ${songTitle} by ${songArtist}`);
    const songId = song.item.id;
    const nowPlaying = SIGNATURE_BBCODE.replace("{0}", songId);
    return nowPlaying
  }
    //Currently not playing
  return  SIGNATURE_NO_PLAYNG;
};

function logError(error) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${error.message}\n`;
    fs.appendFileSync(LOGFILE, logMessage, 'utf8');
}

async function run() {
  try {
    signature = await NowPlayingSignature();
    // console.log(signature)
    await updateXenforoSignature(XENFORO_XF_USER_COOKIE, { bbCode: signature });
  } catch (error) {
    // console.error('Fatal Error:', error.message);
    logError(error);
  }
}

(async () => {
  while (true) {
        await run();
        await new Promise((resolve) => setTimeout(resolve, 60000));
  }
})()
