const admin = require('firebase-admin');

const initializeFirebase = () => {
  try {
    // Agar pehle se apps hain, toh dobara initialize mat karo
    if (admin.apps.length > 0) {
      console.log('ℹ️  Firebase Admin already initialized, skipping...');
      return admin.app();
    }
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('✅ Firebase Admin initialized with service account file');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('✅ Firebase Admin initialized with service account JSON from env');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('✅ Firebase Admin initialized with individual variables');
    } else {
      admin.initializeApp();
      console.log('✅ Firebase Admin initialized with default credentials');
    }
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err.message);
  }
};

module.exports = { admin, initializeFirebase };
