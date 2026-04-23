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

    console.log(`[API] Attempting to delete file: ${fileId}`);
    
    try {
      // --- USER TOKEN ATTEMPTS (If available) ---
      if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
        const userDrive = getDriveClient(userAccessToken);
        
        // Step 1: User Permanent Delete
        try {
          console.log(`[API] Step 1: Trying permanent delete (User Token) for ${fileId}...`);
          await userDrive.files.delete({ fileId, supportsAllDrives: true });
          console.log('[API] Success: Permanently deleted by User');
          return res.json({ success: true, method: 'user_delete' });
        } catch (err: any) {
          console.log(`[API] Step 1 (User Delete) skipped: ${err.message}`);
        }

        // Step 2: User Move to Trash
        try {
          console.log(`[API] Step 2: Trying to trash (User Token) for ${fileId}...`);
          await userDrive.files.update({
            fileId,
            requestBody: { trashed: true },
            supportsAllDrives: true
          });
          console.log('[API] Success: Trashed by User');
          return res.json({ success: true, method: 'user_trash' });
        } catch (err: any) {
          console.log(`[API] Step 2 (User Trash) skipped: ${err.message}`);
        }

        // Step 3: User Untether (If folderId provided)
        const qFolderId = req.query.folderId as string;
        if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
          try {
            console.log(`[API] Step 3: Trying to untether from folder ${qFolderId} (User Token)...`);
            await userDrive.files.update({
              fileId,
              removeParents: qFolderId,
              supportsAllDrives: true
            });
            console.log('[API] Success: Unlinked by User');
            return res.json({ success: true, method: 'user_untether' });
          } catch (err: any) {
            console.log(`[API] Step 3 (User Untether) skipped: ${err.message}`);
          }
        }
      }

      // --- SERVICE ACCOUNT ATTEMPTS ---
      console.log('[API] Falling back to Service Account for deletion task...');
      const adminDrive = getDriveClient();

      // Step 4: Service Permanent Delete
      try {
        console.log(`[API] Step 4: Trying permanent delete (Service Account) for ${fileId}...`);
        await adminDrive.files.delete({ fileId, supportsAllDrives: true });
        console.log('[API] Success: Permanently deleted by System');
        return res.json({ success: true, method: 'system_delete' });
      } catch (err: any) {
        console.log(`[API] Step 4 (System Delete) skipped: ${err.message}`);
      }

      // Step 5: Service Move to Trash
      try {
        console.log(`[API] Step 5: Trying to trash (Service Account) for ${fileId}...`);
        await adminDrive.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true
        });
        console.log('[API] Success: Trashed by System');
        return res.json({ success: true, method: 'system_trash' });
      } catch (err: any) {
        console.log(`[API] Step 5 (System Trash) skipped: ${err.message}`);
      }

      // Step 6: Service Untether (Targeted & Discovery)
      const qFolderId = req.query.folderId as string;
      if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
        try {
          console.log(`[API] Step 6a: Trying to untether from folder ${qFolderId} (Service Account)...`);
          await adminDrive.files.update({
            fileId,
            removeParents: qFolderId,
            supportsAllDrives: true
          });
          console.log('[API] Success: Unlinked by System (Targeted)');
          return res.json({ success: true, method: 'system_untether_targeted' });
        } catch (err: any) {
          console.log(`[API] Step 6a (System Untether Targeted) skipped: ${err.message}`);
        }
      }

      // Last Ditch: Discovery Untether
      try {
        console.log(`[API] Step 6b: Trying discovery-based untether for ${fileId}...`);
        const fileInfo = await adminDrive.files.get({
          fileId,
          fields: 'parents, name',
          supportsAllDrives: true
        });
        const parents = fileInfo.data.parents || [];
        if (parents.length > 0) {
          console.log(`[API] Discovered ${parents.length} parents for file "${fileInfo.data.name}". Attempting removal...`);
          await adminDrive.files.update({
            fileId,
            removeParents: parents.join(','),
            supportsAllDrives: true
          });
          console.log('[API] Success: Unlinked by System (Discovered)');
          return res.json({ success: true, method: 'system_untether_discovered' });
        } else {
          console.log('[API] No parents found for discovery-based untether.');
        }
      } catch (err: any) {
        console.log(`[API] Step 6b (System Untether Discovery) skipped: ${err.message}`);
      }

      throw new Error("All deletion and unlinking attempts failed. This happens if neither the current user nor the service account has 'Editor' permissions on the file or its parent folder.");
    } catch (error: any) {
      console.error('[API] Drive Delete Final Error:', error.message);
      const serviceAccountEmail = getDriveClient().credentials?.client_email || 'the service account';
      res.status(500).json({ 
        error: `Action Failed: ${error.message}`,
        details: `Permission Constraint: To manage files uploaded by others, you must ensure two things: 
1. Your Google Account has edit access to the folder.
2. The Service Account (${serviceAccountEmail}) has 'Editor' access to the folder.

If using a Personal Drive (non-Shared), only the owner can permanently delete. Otherwise, with 'Editor' access, the portal can at least 'Unlink' the file to remove it from this view.`
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
