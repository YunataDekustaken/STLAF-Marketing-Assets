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
const getDriveClient = () => {
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
    console.error('[API] Drive Upload Error:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal Server Error during Upload' });
  }
});

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

export default app;
