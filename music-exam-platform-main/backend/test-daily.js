const apiKey = '8a2ea853eea8e6ae7f816a7462845b085fd5ac7b32d1c5b6999592d255119e94';
const roomName = 'music-exam-platform';
const exp = Math.floor(Date.now() / 1000) + 3600;

fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
        properties: {
            room_name: roomName,
            is_owner: true,
            user_name: "Test User",
            user_id: "12345",
            exp: exp
        }
    })
}).then(async r => {
    console.log("Status:", r.status, r.statusText);
    console.log("Body:", await r.text());
}).catch(e => console.error("Fetch Error:", e));
