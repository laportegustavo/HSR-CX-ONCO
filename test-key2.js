const fs = require('fs');

try {
    const jsonStr = fs.readFileSync('/Users/macbookprolaporte/Downloads/cx-onco-hsr-c1f4e26881a3.json', 'utf8');
    const json = JSON.parse(jsonStr);
    const rawKey = json.private_key;

    // Simulate Vercel env variable by replacing real newlines with \n literal text
    // And simulate user pasting it WITHOUT headers, just the base64 part
    const simulatedVercelKey = "\\n" + rawKey.replace(/-----.*?-----/g, '').replace(/\n/g, '') + "END";
    
    console.log("simulatedVercelKey starts with:", simulatedVercelKey.substring(0, 30));

    // Run bulletproof regex
    const base64Body = simulatedVercelKey.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
    const lines = base64Body.match(/.{1,64}/g)?.join('\n') || '';
    const private_key = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;

    // Try to actually use it with crypto
    const crypto = require('crypto');
    try {
        const sign = crypto.createSign('SHA256');
        sign.update('test');
        sign.sign(private_key); // this will throw DECODER unsupported if the regex failed to make a valid PEM
        console.log("Bulletproof Regex produced a VALID PEM key that crypto accepts!");
    } catch (e) {
        console.error("CRYPTO FAILED:", e.message);
    }

} catch (e) {
    console.error("Test script failed:", e);
}
