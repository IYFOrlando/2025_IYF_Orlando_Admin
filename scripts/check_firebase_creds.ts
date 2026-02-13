import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log(
  "FIREBASE_SERVICE_ACCOUNT env var length:",
  serviceAccountEnv?.length,
);

try {
  const serviceAccount = JSON.parse(serviceAccountEnv || "{}");
  console.log("Parsed Service Account Keys:", Object.keys(serviceAccount));
  console.log("Has project_id:", !!serviceAccount.project_id);
  console.log("Project ID:", serviceAccount.project_id);
  console.log("Has private_key:", !!serviceAccount.private_key);
  console.log("Has client_email:", !!serviceAccount.client_email);
} catch (e) {
  console.error("Error parsing JSON:", e.message);
}
