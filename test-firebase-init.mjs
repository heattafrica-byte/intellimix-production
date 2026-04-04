#!/usr/bin/env node
import pkg from "firebase-admin";
const admin = pkg;
const { credential } = pkg;

console.log("firebase-admin imported successfully");

const keyJson = process.env.FIREBASE_ADMIN_KEY;
if (!keyJson) {
  console.error("FIREBASE_ADMIN_KEY not set");
  process.exit(1);
}

try {
  console.log("Step 1: Parsing FIREBASE_ADMIN_KEY...");
  const credentials = JSON.parse(keyJson);
  console.log("✅ Parsed successfully");
  console.log("Project ID:", credentials.project_id);
  console.log("Client Email:", credentials.client_email);
  
  console.log("\nStep 2: Creating service account credential...");
  const cred = credential.cert(credentials);
  console.log("✅ Credential created");
  
  console.log("\nStep 3: Checking for existing apps...");
  console.log("Existing apps:", admin.apps.length);
  
  console.log("\nStep 4: Calling admin.initializeApp()...");
  admin.initializeApp({
    credential: cred,
    projectId: credentials.project_id,
  });
  console.log("✅ App initialized");
  
  console.log("\nStep 5: Getting auth instance...");
  const auth = admin.auth();
  console.log("✅ Auth instance retrieved");
  console.log("Auth object type:", typeof auth);
  
  console.log("\n✅ Firebase Admin SDK initialized successfully!");
  process.exit(0);
} catch (error) {
  console.error("\n❌ Error:", error);
  console.error("Full error object:", {
    name: error?.name,
    message: error?.message,
    code: error?.code,
  });
  process.exit(1);
}
