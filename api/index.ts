import express from 'express';
import 'dotenv/config';
import { google } from 'googleapis';
import multer from 'multer';
import { Readable } from 'stream';

const ROOT_FOLDER_ID = '1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU';

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

let driveClient: any = null;
const getDriveClient = (accessToken?: string) => {
  // If a user-provided access token is available, use it (solves Quota issue)
  // Ensure it's a real token and not a "null" string from sessionStorage
  if (accessToken && accessToken !== 'null' && accessToken !== 'undefined') {
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

app.get('/api/drive/files', async (req, res) => {
  const folderId = req.query.folderId as string || ROOT_FOLDER_ID;
  try {
    const drive = getDriveClient();
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, modifiedTime, size, thumbnailLink)',
      orderBy: 'folder,name',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    res.json({ files: response.data.files || [] });
  } catch (error: any) {
    console.error('[API] Drive List Error:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal Server Error during File Listing' });
  }
});

app.post('/api/drive/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const folderId = req.body.folderId || ROOT_FOLDER_ID;
  const customName = req.body.name;

  if (!file) {
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

    res.json(response.data);
  } catch (error: any) {
    console.error('[API] Drive Upload Error:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal Server Error during Upload' });
  }
});

app.patch('/api/drive/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const { name } = req.body;

  try {
    const authHeader = req.headers.authorization;
    const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const drive = getDriveClient(userAccessToken);
    const response = await drive.files.update({
      fileId,
      requestBody: { name },
      fields: 'id, name',
      supportsAllDrives: true,
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Drive Rename Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/drive/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const authHeader = req.headers.authorization;
  const userAccessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  try {
    // --- USER TOKEN ATTEMPTS ---
    if (userAccessToken && userAccessToken !== 'null' && userAccessToken !== 'undefined') {
      const userDrive = getDriveClient(userAccessToken);
      
      // Step 1: User Permanent Delete
      try {
        console.log(`[API] Step 1: Trying permanent delete (User) for ${fileId}...`);
        await userDrive.files.delete({ fileId, supportsAllDrives: true });
        return res.json({ success: true, method: 'user_delete' });
      } catch (err: any) {
        console.warn(`[API] Step 1 failed: ${err.message}`);
      }

      // Step 2: User Trash
      try {
        console.log(`[API] Step 2: Trying trash (User) for ${fileId}...`);
        await userDrive.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true
        });
        return res.json({ success: true, method: 'user_trash' });
      } catch (err: any) {
        console.warn(`[API] Step 2 failed: ${err.message}`);
      }

      // Step 3: User Untether
      const qFolderId = req.query.folderId as string;
      if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
        try {
          console.log(`[API] Step 3: Trying untether (User) for ${fileId}`);
          await userDrive.files.update({
            fileId,
            removeParents: qFolderId,
            supportsAllDrives: true
          });
          return res.json({ success: true, method: 'user_untether' });
        } catch (err: any) {
          console.warn(`[API] Step 3 failed: ${err.message}`);
        }
      }
    }

    // --- SERVICE ACCOUNT ATTEMPTS ---
    const adminDrive = getDriveClient();

    // Step 4: Service Permanent Delete
    try {
      console.log(`[API] Step 4: Trying permanent delete (System) for ${fileId}...`);
      await adminDrive.files.delete({ fileId, supportsAllDrives: true });
      return res.json({ success: true, method: 'system_delete' });
    } catch (err: any) {
      console.warn(`[API] Step 4 failed: ${err.message}`);
    }

    // Step 5: Service Trash
    try {
      console.log(`[API] Step 5: Trying trash (System) for ${fileId}...`);
      await adminDrive.files.update({
        fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true
      });
      return res.json({ success: true, method: 'system_trash' });
    } catch (err: any) {
      console.warn(`[API] Step 5 failed: ${err.message}`);
    }

    // Step 6: Service Untether
    const qFolderId = req.query.folderId as string;
    if (qFolderId && qFolderId !== 'undefined' && qFolderId !== 'null') {
      try {
        console.log(`[API] Step 6a: Trying targeted untether (System) for ${fileId}`);
        await adminDrive.files.update({
          fileId,
          removeParents: qFolderId,
          supportsAllDrives: true
        });
        return res.json({ success: true, method: 'system_untether_targeted' });
      } catch (err: any) {
        console.warn(`[API] Step 6a failed: ${err.message}`);
      }
    }

    // Discovery Untether
    try {
      console.log(`[API] Step 6b: Trying discovery untether (System) for ${fileId}`);
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
        return res.json({ success: true, method: 'system_untether_discovered' });
      }
    } catch (err: any) {
      console.warn(`[API] Step 6b failed: ${err.message}`);
    }

    throw new Error("All deletion attempts failed. Personal drive permissions are strictly owner-only.");
  } catch (error: any) {
    console.error('[API] Drive Delete Final Error:', error.message);
    res.status(500).json({ 
      error: `Deletion Failed: ${error.message}`,
      details: "In Personal Drives, only the file OWNER can delete it. Ensure Service Account has 'Editor' access to the folder."
    });
  }
});

export default app;
