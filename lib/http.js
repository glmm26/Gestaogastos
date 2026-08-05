const path = require('path');

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function sendPdf(res, pdfBuffer, fileName) {
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': pdfBuffer.length,
    'Cache-Control': 'no-store',
  });
  res.end(pdfBuffer);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function parseMultipartFormData(req, maxSize) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      reject(new Error('Envio de arquivo inválido.'));
      return;
    }

    const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
    const chunks = [];
    let totalSize = 0;

    req.on('data', (chunk) => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        const error = new Error('A imagem deve ter no máximo 2MB.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const bodyBuffer = Buffer.concat(chunks);
      const raw = bodyBuffer.toString('latin1');
      const parts = raw.split(boundary).slice(1, -1);
      const fields = {};
      const files = [];

      parts.forEach((part) => {
        const normalizedPart = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
        if (!normalizedPart.trim()) return;

        const headerEndIndex = normalizedPart.indexOf('\r\n\r\n');
        if (headerEndIndex === -1) return;

        const headersText = normalizedPart.slice(0, headerEndIndex);
        const contentText = normalizedPart.slice(headerEndIndex + 4);
        const disposition = headersText.match(/name="([^"]+)"/i);
        if (!disposition) return;

        const fieldName = disposition[1];
        const fileNameMatch = headersText.match(/filename="([^"]*)"/i);
        const contentTypeMatch = headersText.match(/Content-Type:\s*([^\r\n]+)/i);
        const cleanContentText = contentText.replace(/\r\n$/, '');

        if (fileNameMatch && fileNameMatch[1]) {
          files.push({
            fieldName,
            originalName: path.basename(fileNameMatch[1]),
            mimeType: (contentTypeMatch?.[1] || '').trim().toLowerCase(),
            buffer: Buffer.from(cleanContentText, 'latin1'),
          });
          return;
        }

        fields[fieldName] = Buffer.from(cleanContentText, 'latin1').toString('utf-8').trim();
      });

      resolve({ fields, files });
    });

    req.on('error', reject);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) return cookies;
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function serializeCookie(name, value, { maxAgeSeconds, clear = false } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  parts.push(clear ? 'Max-Age=0' : `Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}

module.exports = {
  sendJson,
  sendHtml,
  sendPdf,
  parseBody,
  parseMultipartFormData,
  parseCookies,
  serializeCookie,
};
