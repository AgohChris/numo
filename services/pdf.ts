import { Directory, File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import type { Document } from '@/types/document';

function sanitizeFileName(name: string): string {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '-');
  return cleaned.length > 0 ? cleaned : 'Document';
}

function extensionToMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function buildHtml(document: Document): Promise<string> {
  const pagesHtml = await Promise.all(
    document.pageUris.map(async (uri) => {
      const file = new File(uri);
      const base64 = await file.base64();
      const mimeType = extensionToMimeType(uri);
      return `<div class="page"><img src="data:${mimeType};base64,${base64}" /></div>`;
    })
  );

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          html, body { margin: 0; padding: 0; }
          .page {
            width: 100%;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .page:last-child { page-break-after: auto; }
          .page img {
            width: 100%;
            height: auto;
            display: block;
          }
        </style>
      </head>
      <body>
        ${pagesHtml.join('\n')}
      </body>
    </html>
  `;
}

export async function exportToPdf(document: Document): Promise<string> {
  try {
    const html = await buildHtml(document);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const fileName = `${sanitizeFileName(document.name)}.pdf`;
    const exportsDir = new Directory(Paths.cache, 'exports');
    exportsDir.create({ intermediates: true, idempotent: true });

    const namedFile = new File(exportsDir, fileName);
    if (namedFile.exists) {
      namedFile.delete();
    }
    new File(uri).copy(namedFile);

    return namedFile.uri;
  } catch (error) {
    console.error('[pdf] Échec de la génération du PDF:', error);
    throw new Error('Échec de la génération du PDF.');
  }
}

export type SaveToDownloadsResult = {
  savedToDownloads: boolean;
  uri: string;
};

/**
 * Sur Android, écrit le PDF dans le dossier public Téléchargements via le Storage
 * Access Framework (l'utilisateur confirme l'accès une seule fois). Ailleurs (iOS/web),
 * il n'existe pas d'équivalent : on retourne l'URI du cache pour que l'appelant
 * bascule sur le partage.
 */
export async function saveToDownloads(document: Document): Promise<SaveToDownloadsResult> {
  const pdfUri = await exportToPdf(document);

  if (Platform.OS !== 'android') {
    return { savedToDownloads: false, uri: pdfUri };
  }

  try {
    const downloadDirUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadDirUri);

    if (!permissions.granted) {
      return { savedToDownloads: false, uri: pdfUri };
    }

    const fileName = `${sanitizeFileName(document.name)}.pdf`;
    const base64 = await new File(pdfUri).base64();
    const destinationUri = await StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      'application/pdf'
    );
    await StorageAccessFramework.writeAsStringAsync(destinationUri, base64, {
      encoding: 'base64',
    });

    return { savedToDownloads: true, uri: destinationUri };
  } catch (error) {
    console.error('[pdf] Échec de la sauvegarde dans Téléchargements:', error);
    return { savedToDownloads: false, uri: pdfUri };
  }
}
