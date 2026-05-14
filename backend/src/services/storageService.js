const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

class StorageService {
  constructor() {
    this.useFirebase = !!process.env.FIREBASE_PROJECT_ID;
    this.bucket = null;
    this.localUploadDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  async initialize() {
    if (this.useFirebase) {
      try {
        // Agar Firebase pehle se initialize hai, toh use hi use karo
        const firebaseApp = admin.apps.length > 0 ? admin.app() : admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        
        this.bucket = firebaseApp.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        console.log('✅ Firebase Storage initialized');
      } catch (err) {
        console.error('⚠️  Firebase initialization failed, falling back to Local Storage:', err.message);
        this.useFirebase = false;
      }
    } else {
      console.log('📂 Using Local File Storage');
    }
  }

  /**
   * Uploads a file and returns its path or URL
   */
  async uploadFile(file) {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    const fileName = `${fileId}${extension}`;

    if (this.useFirebase && this.bucket) {
      const firebaseFile = this.bucket.file(`uploads/${fileName}`);
      await firebaseFile.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });
      return {
        id: fileId,
        path: `uploads/${fileName}`,
        url: await firebaseFile.getSignedUrl({ action: 'read', expires: '03-09-2491' }).then(urls => urls[0]),
        storage: 'firebase'
      };
    } else {
      // Local Storage
      const filePath = path.join(this.localUploadDir, fileName);
      if (file.buffer) {
        fs.writeFileSync(filePath, file.buffer);
      } else if (file.path) {
        fs.renameSync(file.path, filePath);
      }
      
      return {
        id: fileId,
        path: fileName,
        url: `/uploads/${fileName}`,
        storage: 'local'
      };
    }
  }

  async deleteFile(filePath, storageType) {
    if (storageType === 'firebase' && this.bucket) {
      try {
        await this.bucket.file(filePath).delete();
      } catch (err) {
        console.error('Firebase delete failed:', err.message);
      }
    } else {
      const fullPath = path.join(this.localUploadDir, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  }
}

const storageService = new StorageService();
module.exports = storageService;
