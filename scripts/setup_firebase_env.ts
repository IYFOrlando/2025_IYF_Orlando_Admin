import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");

const serviceAccount = {
  type: "service_account",
  project_id: "iyf-orlando-academy",
  private_key_id: "aebc065687d31dd83f42103d9f534b8dc485a13e",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDMZ+WQqYv36YqV\nM4F54UzbB6QNeIyTaoRaSMmaYtFhS/Zqz9DIedmQTuuDhRMKxIyMVd29K4C0mBYE\nEv4pd2/PItYIPp74fLODHif7k2XshEc6k+F6loheG/YfXE75fKRXs+Ux+vVcXFkK\nWUtbztvD7ntn/hbYVZ+GcmnAcYa20essgjcd/myk0aXeZ88Gy5GGjJI10GsLARHL\ncP0Ep3qy3ngt08cC6pBfyFYnK/+8UaPNE84Lu/Qb+oOvT1bFje1Hps57XMf9sFMe\nOLvlyF5vaBly+Kj+KY+wXSv9O1w2ppXfE0zxDz+o0EsSUlLjbAfKvwH8yKRqMARQ\nd1KrxADrAgMBAAECggEAYV5ajfsdyCXxFFqZIihPFoUAwkP63tweGO3UTx0kdS8c\nvkupPl5A44uch6Vz6SywcMcUXeDjqeNKlX1AohsZYTfMcdf2nRK15k8Op7nSkwR9\n86ru/RjI899o8g5kNlcH6BkzJAhSKcF5zsKzcZPLvv0SvvpcAohi+cX1lyzdCaeC\nP/+HYwzAsq2OXcp3CDjCkot8STDhDA/YnIL3uowx7C4eYBCmtVo9tewGuz5dK6gT\nb6GMrvDzwJEZ6BSI1RvWpL1Ufide9jw9Ea4hcps2iOrp1i1vRcFk9HOYS+no2ppz\nnWipO/9VKr1B3/Gwkc4ILDTfbDFL0KsukvJR09sRUQKBgQDt06MS6e7YHJJ/sqKp\n6dJYA55Mj+7N1oIo3N52gkTmLUWlaYdtrfysKlyLbXbpxRC884il24l3UrkI1IqD\nCmi5TzMfouPAj651XZO4/B0Beq9zZ7oB5nmwHA4WTjmAgHLcc+YKUcfDwQUPe/wl\n3rvqz5/m5hwg01gnI8LaA/SkUQKBgQDcBns1tuH1yKlqfiSlj4Q8vFpGacrhiMVP\n1YlLR1b16+pan4lGUcS6zNMhYSfwfprnLAe5gmVEGPnSdN5lbqO5DEKFPut4km9x\nofc69J6ZJh/MM/9yChK89pKCZPxh43LYE5VZYXcPg4R+AwjjY18ZTzLOTxcE3eDH\nnoJWNGquewKBgQC4MRH6gw1FeROJLQvINtx+6AaA23SjHMBf73eoJwo/js6C5rFJ\no9eua3yTS6suMD7faGnrspTLwlimWx4PkU88PfelR93GdEE0is3vFetNCvy5j5tC\n/4I9f+z1H45vVIwg6u4+Dcp+dI57yJWnqtK1cCoyhQNB9Q0v+wVdHnUpkQKBgQCu\nUqRDxoX4iedQbGj0k2SeCk0sBJ2tWwOZYQHKFtebODMRYd0NTbOknKuagrN2I5jv\nFz93hwxci71DNT0O+D3XWxNJJrTBbqPFUCHlH/KYPFBtJbV50OlPtbwWe5RKqj5P\nXBS0IDiInhbXD+h24EB0eP8z3g3K2VBCWB/D1PvBCQKBgGeNCVrWp9xbqeCP9SOP\nNt2stQaTXK1USedJA25es7GlHmJHBhrYtXYB28WMv7XtnAKh+6u6MxV9FTXocmZv\ncBAfhpT1sj6wI13CB0QpYOHixNcGuRxNjTMvQ8u6yJpfRRNQFYQzOc8bAqUM3a5+\n4onIwLIPDlwnT49JiM/7zhtK\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-mvrhc@iyf-orlando-academy.iam.gserviceaccount.com",
  client_id: "116825764606272608406",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-mvrhc%40iyf-orlando-academy.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

const envVar = `FIREBASE_SERVICE_ACCOUNT='${JSON.stringify(serviceAccount)}'`;

try {
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  // Remove existing key if present to avoid duplicates
  envContent = envContent.replace(/^FIREBASE_SERVICE_ACCOUNT=.*$/gm, "");

  // Append new key
  // Ensure we start on a new line
  if (envContent && !envContent.endsWith("\n")) {
    envContent += "\n";
  }

  envContent += envVar + "\n";

  fs.writeFileSync(envPath, envContent);
  console.log("Successfully updated .env with FIREBASE_SERVICE_ACCOUNT");
} catch (err) {
  console.error("Error updating .env:", err);
}
