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
  const getDriveClient = (accessToken?: string) => {
    // Determine if we should use user token or system token
    const hasValidUserToken = accessToken && accessToken !== 'null' && accessToken !== 'undefined';

    if (hasValidUserToken) {
      console.log('[API] Initializing Drive Client with User OAuth Token');
      try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        return google.drive({ version: 'v3', auth });
      } catch (e) {
        console.error('[API] Error creating User Drive client, falling back to System:', e);
      }
    }

    // Fallback to Service Account (System Identity)
    if (driveClient) return driveClient;

    console.log('[API] Initializing Drive Client with System Service Account');
    const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.google_service_account_json;
    if (!serviceAccountVar) {
      console.error('[API] Critical: GOOGLE_SERVICE_ACCOUNT_JSON missing');
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }

    try {
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
      throw new Error('Invalid Google Service Account JSON. Ensure it is correct in the environment.');
    }
  };

  // --- API Routes ---

  // Health check to verify environment variables
  app.get('/api/health', (req, res) => {
    console.log('[API] Health check requested');
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.google_service_account_json;
    let clientEmail = 'not detected';
    
    if (key) {
      try {
        const credentials = key.trim().startsWith('{') 
          ? JSON.parse(key) 
          : JSON.parse(Buffer.from(key, 'base64').toString());
        clientEmail = credentials.client_email;
      } catch (e) {
        clientEmail = 'parse error';
      }
    }

    res.json({
      status: 'ok',
      google_drive_key_detected: !!key,
      service_account_email: clientEmail
    });
  });

  // List Files
  app.get('/api/drive/files', async (req, res) => {
    const folderId = req.query.folderId as string || ROOT_FOLDER_ID;
    console.log(`[API] Listing files for folder: ${folderId}`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      const drive = getDriveClient();
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, modifiedTime, size, thumbnailLink)',
        orderBy: 'folder,name',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      console.log(`[API] Successfully listed ${response.data.files?.length || 0} files`);
      res.json({ files: response.data.files || [] });
    } catch (error: any) {
      console.error('[API] Drive List Error:', error.message || error);
      res.status(500).json({ error: error.message || 'Internal Server Error during File Listing' });
    }
  });

  // Upload File
  app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const folderId = req.body.folderId || ROOT_FOLDER_ID;
    const customName = req.body.name;

    console.log(`[API] Uploading file: ${file?.originalname} to folder: ${folderId}`);

    if (!file) {
      console.warn('[API] Upload attempt with no file');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Get token from header if it exists
      const authHeader = req.headers.authorization;
      const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

      const drive = getDriveClient(userAccessToken);
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
        supportsAllDrives: true,
      });

      console.log(`[API] Successfully uploaded: ${response.data.name} (${response.data.id})`);
      res.json(response.data);
    } catch (error: any) {
      console.error('[API] Drive Upload Error:', error.message || error);
      const statusCode = (error.code === 401 || error.code === 403) ? error.code : 500;
      res.status(statusCode).json({ 
        error: error.message || 'Internal Server Error during Upload',
        needsReauth: error.code === 401 || error.code === 403
      });
    }
  });

  // Rename/Patch File (Approval logic)
  app.patch('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { name } = req.body;

    try {
      const authHeader = req.headers.authorization;
      const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

      // Try with User Token first (if available)
      if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
        try {
          const userDrive = getDriveClient(userAccessToken);
          const response = await userDrive.files.update({
            fileId,
            requestBody: { name },
            fields: 'id, name',
            supportsAllDrives: true,
          });
          return res.json(response.data);
        } catch (err: any) {
          console.warn(`[API] Rename with User Token failed: ${err.message}. Trying System fallback...`);
        }
      }

      // Fallback to Service Account
      const systemDrive = getDriveClient();
      const response = await systemDrive.files.update({
        fileId,
        requestBody: { name },
        fields: 'id, name',
        supportsAllDrives: true,
      });
      res.json(response.data);
    } catch (error: any) {
      console.error('Drive Rename Error:', error.message);
      const statusCode = (error.code === 401 || error.code === 403) ? error.code : 500;
      res.status(statusCode).json({ 
        error: error.message,
        needsReauth: error.code === 401 || error.code === 403,
        details: "Approval Failed: Ensure the 'Marketing Robot' service account has 'Editor' access to the folder."
      });
    }
  });

  // Delete File (Multi-layered attempt)
  app.delete('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const authHeader = req.headers.authorization;
    const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    console.log(`[API] Attempting to delete file: ${fileId}`);
    
    try {
      // 1. TRY USER PERMISSIONS first (Trash then Untether)
      if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
        const userDrive = getDriveClient(userAccessToken);
        
        // Trash (User)
        try {
          console.log(`[API] Trying User Trash for ${fileId}...`);
          await userDrive.files.update({
            fileId,
            requestBody: { trashed: true },
            supportsAllDrives: true
          });
          // Wait briefly for Drive consistency
          await new Promise(resolve => setTimeout(resolve, 800));
          return res.json({ success: true, method: 'user_trash' });
        } catch (err: any) {
          console.log(`[API] User Trash unsuccessful: ${err.message}`);
        }

        // Untether (User)
        const qFolderId = req.query.folderId as string;
        if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
          try {
            console.log(`[API] Trying User Untether for ${fileId}...`);
            await userDrive.files.update({
              fileId,
              removeParents: qFolderId,
              supportsAllDrives: true
            });
            await new Promise(resolve => setTimeout(resolve, 800));
            return res.json({ success: true, method: 'user_untether' });
          } catch (err: any) {
            console.log(`[API] User Untether unsuccessful: ${err.message}`);
          }
        }
      }

      // 2. TRY SYSTEM PERMISSIONS (Trash then Untether)
      const adminDrive = getDriveClient();

      // Trash (System)
      try {
        console.log(`[API] Trying System Trash for ${fileId}...`);
        await adminDrive.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true
        });
        await new Promise(resolve => setTimeout(resolve, 800));
        return res.json({ success: true, method: 'system_trash' });
      } catch (err: any) {
        console.log(`[API] System Trash unsuccessful: ${err.message}`);
      }

      // Untether Targeted (System)
      const qFolderId = req.query.folderId as string;
      if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
        try {
          console.log(`[API] Trying System Untether (Targeted) for ${fileId}...`);
          await adminDrive.files.update({
            fileId,
            removeParents: qFolderId,
            supportsAllDrives: true
          });
          await new Promise(resolve => setTimeout(resolve, 800));
          return res.json({ success: true, method: 'system_untether_targeted' });
        } catch (err: any) {
          console.log(`[API] System Untether (Targeted) unsuccessful: ${err.message}`);
        }
      }

      // Untether Discovery (System) - More aggressive: remove all current parents
      try {
        console.log(`[API] Trying System Untether (Discovery) for ${fileId}...`);
        const fileInfo = await adminDrive.files.get({
          fileId,
          fields: 'parents',
          supportsAllDrives: true
        });
        const parents = fileInfo.data.parents || [];
        if (parents.length > 0) {
          await adminDrive.files.update({
            fileId,
            removeParents: parents.join(','),
            supportsAllDrives: true
          });
          await new Promise(resolve => setTimeout(resolve, 800));
          return res.json({ success: true, method: 'system_untether_discovered' });
        }
      } catch (err: any) {
        console.log(`[API] System Untether (Discovery) unsuccessful: ${err.message}`);
      }

      // 3. LAST DITCH: SYSTEM PERMANENT DELETE
      try {
        console.log(`[API] Final Attempt: System Permanent Delete for ${fileId}...`);
        await adminDrive.files.delete({ fileId, supportsAllDrives: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err: any) {
        console.error(`[API] Final Attempt Failed: ${err.message}`);
      }

      // Final Verification Check
      try {
        console.log(`[API] Final Verification: Checking if ${fileId} is still in ${qFolderId || 'any parent'}...`);
        const verifyDrive = getDriveClient();
        const check = await verifyDrive.files.get({
          fileId,
          fields: 'parents, trashed',
          supportsAllDrives: true
        });
        
        const stillInFolder = qFolderId ? check.data.parents?.includes(qFolderId) : (check.data.parents && check.data.parents.length > 0);
        
        if (check.data.trashed === false && stillInFolder) {
          console.error(`[API] Verification Failed: File ${fileId} still exists and is not trashed.`);
          throw new Error("The file could not be removed. This is likely a Google Drive permission restriction. Only the original owner can delete this file, or the 'Marketing Robot' needs 'Manager' access to the Shared Drive.");
        }
        console.log(`[API] Verification Passed: File ${fileId} is either trashed or removed from folder.`);
        return res.json({ success: true, method: 'verified_removal' });
      } catch (err: any) {
        if (err.code === 404) {
          console.log(`[API] Verification Passed: File ${fileId} is completely gone (404).`);
          return res.json({ success: true, method: 'not_found_on_verify' });
        }
        throw err;
      }
    } catch (error: any) {
      console.error('[API] Drive Delete Final Error:', error.message);
      res.status(500).json({ 
        error: error.message,
        details: "Authorization Restriction: Google Drive often prevents non-owners from deleting files. If you are a supervisor, ensure the 'Marketing Robot' (Service Account) has 'Manager' or 'Editor' permissions on the folder."
      });
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

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server started at http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
