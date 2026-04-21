import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import multer from 'multer';
import path from 'path';
import { Readable } from 'stream';
import fs from 'fs';

// Constants
const PORT = 3000;
const ROOT_FOLDER_ID = '1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Setup Multer for memory storage
  const upload = multer({ storage: multer.memoryStorage() });

  // Initialize Google Auth
  let driveClient: any = null;
  const getDriveClient = () => {
    if (driveClient) return driveClient;

    const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.google_service_account_json;
    if (!serviceAccountVar) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    try {
      // It might be a base64 string or raw JSON string
      let credentials;
      if (serviceAccountVar.trim().startsWith('{')) {
        credentials = JSON.parse(serviceAccountVar);
      } else {
        credentials = JSON.parse(Buffer.from(serviceAccountVar, 'base64').toString());
      }

      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      driveClient = google.drive({ version: 'v3', auth });
      return driveClient;
    } catch (err) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', err);
      throw new Error('Invalid Google Service Account JSON. Please check your Secret/Environment variables.');
    }
  };

  // --- API Routes ---

  // Health check to verify environment variables
  app.get('/api/health', (req, res) => {
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    res.json({
      status: 'ok',
      google_drive_key_detected: !!key,
      key_preview: key ? `${key.substring(0, 10)}...` : 'not detected'
    });
  });

  // List Files
  app.get('/api/drive/files', async (req, res) => {
    const folderId = req.query.folderId as string || ROOT_FOLDER_ID;
    try {
      const drive = getDriveClient();
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, modifiedTime, size, thumbnailLink)',
        orderBy: 'folder,name',
      });
      res.json({ files: response.data.files });
    } catch (error: any) {
      console.error('Drive List Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload File
  app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const folderId = req.body.folderId || ROOT_FOLDER_ID;
    const customName = req.body.name;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const drive = getDriveClient();
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      const response = await drive.files.create({
        requestBody: {
          name: customName || file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: bufferStream,
        },
        fields: 'id, name',
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('Drive Upload Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Rename/Patch File (Approval logic)
  app.patch('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { name } = req.body;

    try {
      const drive = getDriveClient();
      const response = await drive.files.update({
        fileId,
        requestBody: { name },
        fields: 'id, name',
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Drive Rename Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete File
  app.delete('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    try {
      const drive = getDriveClient();
      await drive.files.delete({ fileId });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Drive Delete Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started at http://localhost:${PORT}`);
  });
}

startServer();
