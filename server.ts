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
    // If a user-provided access token is available, use it (solves Quota issue)
    // Ensure it's a real token and not a "null" string from sessionStorage
    if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') {
      console.log('[API] Using User OAuth Token for request');
      try {
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });
        return google.drive({ version: 'v3', auth });
      } catch (e) {
        console.error('[API] Error setting user credentials:', e);
      }
    }

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
      const serviceAccountEmail = getDriveClient().credentials?.client_email || 'the service account';
      res.status(500).json({ 
        error: error.message || 'Internal Server Error during Upload',
        details: error.message?.includes('sufficient permissions') 
          ? `Permission Error: To upload files here, ensure the Service Account (${serviceAccountEmail}) has 'Editor' access to this folder.`
          : undefined
      });
    }
  });

  // Rename/Patch File (Approval logic)
  app.patch('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { name } = req.body;
    const authHeader = req.headers.authorization;
    const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    console.log(`[API] Attempting to rename/patch file: ${fileId} to "${name}"`);

    try {
      // --- USER TOKEN ATTEMPT ---
      if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
        try {
          console.log(`[API] Trying rename (User Token) for ${fileId}...`);
          const userDrive = getDriveClient(userAccessToken);
          const response = await userDrive.files.update({
            fileId,
            requestBody: { name },
            fields: 'id, name',
            supportsAllDrives: true,
          });
          console.log('[API] Success: Renamed by User');
          return res.json(response.data);
        } catch (err: any) {
          console.log(`[API] User rename skipped: ${err.message}`);
        }
      }

      // --- SERVICE ACCOUNT FALLBACK ---
      console.log('[API] Falling back to Service Account for rename task...');
      const adminDrive = getDriveClient();
      const response = await adminDrive.files.update({
        fileId,
        requestBody: { name },
        fields: 'id, name',
        supportsAllDrives: true,
      });
      console.log('[API] Success: Renamed by System');
      res.json(response.data);
    } catch (error: any) {
      console.error('[API] Drive Rename Final Error:', error.message);
      const serviceAccountEmail = getDriveClient().credentials?.client_email || 'the service account';
      res.status(500).json({ 
        error: `Rename Failed: ${error.message}`,
        details: `To approve/rename files uploaded by others, the Service Account (${serviceAccountEmail}) must be given 'Editor' permissions on the folder/file.`
      });
    }
  });

  // Delete File
  app.delete('/api/drive/files/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const authHeader = req.headers.authorization;
    const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const qFolderId = req.query.folderId as string;
    
    // Normalize folderId
    const targetFolderId = (!qFolderId || qFolderId === 'undefined' || qFolderId === 'null') 
      ? ROOT_FOLDER_ID 
      : qFolderId;
  
    console.log(`[DELETE] Request for fileId: ${fileId}, targetFolderId: ${targetFolderId}`);
    console.log(`[DELETE] Has user token: ${!!(userAccessToken && userAccessToken !== 'null')}`);
  
    const errors: string[] = [];
  
    // Helper to attempt a delete operation
    const tryOp = async (label: string, fn: () => Promise<any>) => {
      try {
        const result = await fn();
        console.log(`[DELETE] SUCCESS ${label} | fileId: ${fileId}`);
        return { success: true, method: label, result };
      } catch (err: any) {
        const msg = err?.errors?.[0]?.message || err.message || 'unknown error';
        console.log(`[DELETE] FAILED ${label} | fileId: ${fileId} | Error: ${msg}`);
        errors.push(`${label}: ${msg}`);
        return null;
      }
    };
  
    try {
      // --- USER TOKEN ATTEMPTS ---
      if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
        const userDrive = getDriveClient(userAccessToken);
  
        // 1. User Permanent Delete
        const r1 = await tryOp('user_permanent_delete', () =>
          userDrive.files.delete({ fileId, supportsAllDrives: true })
        );
        if (r1) return res.json(r1);
  
        // 2. User Trash
        const r2 = await tryOp('user_trash', () =>
          userDrive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
        );
        if (r2) return res.json(r2);

        // 3. User Untether (Remove from folder)
        const r3 = await tryOp('user_remove_from_folder', () =>
          userDrive.files.update({
            fileId,
            removeParents: targetFolderId,
            supportsAllDrives: true
          })
        );
        if (r3) return res.json(r3);
      }
  
      // --- SERVICE ACCOUNT ATTEMPTS ---
      const adminDrive = getDriveClient();
  
      // 4. System Untether (Targeted) - Often works when delete/trash fails due to ownership
      const r4 = await tryOp('system_remove_from_folder', () =>
        adminDrive.files.update({
          fileId,
          removeParents: targetFolderId,
          supportsAllDrives: true,
          fields: 'id, parents'
        })
      );
      if (r4) return res.json(r4);

      // 5. System Trash
      const r5 = await tryOp('system_trash', () =>
        adminDrive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
      );
      if (r5) return res.json(r5);

      // 6. System Permanent Delete
      const r6 = await tryOp('system_permanent_delete', () =>
        adminDrive.files.delete({ fileId, supportsAllDrives: true })
      );
      if (r6) return res.json(r6);
  
      // 7. Discovery Untether (Remove from ALL parents)
      const r7 = await tryOp('system_discovery_untether', async () => {
        const fileInfo = await adminDrive.files.get({
          fileId,
          fields: 'parents',
          supportsAllDrives: true
        });
        const parents = fileInfo.data.parents || [];
        if (parents.length > 0) {
          return await adminDrive.files.update({
            fileId,
            removeParents: parents.join(','),
            supportsAllDrives: true
          });
        }
        throw new Error("File has no parents to remove.");
      });
      if (r7) return res.json(r7);
  
      // All failed
      console.log(`[DELETE] All attempts failed for ${fileId}. Errors:`, errors);
  
      let serviceEmail = 'the service account email found in your environment variables';
      try {
        const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.google_service_account_json;
        if (key) {
          const creds = JSON.parse(key.trim().startsWith('{') ? key : Buffer.from(key, 'base64').toString());
          serviceEmail = creds.client_email;
        }
      } catch (e) {}
  
      return res.status(500).json({
        error: 'Permission Denied',
        details: errors,
        hint: `Google Drive restriction: Standard users cannot delete files they don't own. 
        
        To allow the portal to manage these files, you MUST:
        1. Copy this email: ${serviceEmail}
        2. Share your Drive folder with it as an 'Editor'.`
      });
  
    } catch (error: any) {
      console.log(`[DELETE] Unexpected error for ${fileId}:`, error.message);
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
