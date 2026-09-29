import { Directory, File, Paths } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Document } from '@/types/document';

const INDEX_KEY = 'numo.documents';
const SCANS_DIR_NAME = 'scans';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readIndex(): Promise<Document[]> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[storage] Impossible de lire l\'index des documents:', error);
    return [];
  }
}

async function writeIndex(documents: Document[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error('[storage] Impossible d\'écrire l\'index des documents:', error);
    throw new Error('Échec de la sauvegarde de l\'index des documents.');
  }
}

export async function listDocuments(): Promise<Document[]> {
  const documents = await readIndex();
  return documents.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getDocument(id: string): Promise<Document | null> {
  const documents = await readIndex();
  return documents.find((doc) => doc.id === id) ?? null;
}

export async function createDocument(
  name: string,
  sourceImageUris: string[]
): Promise<Document> {
  if (sourceImageUris.length === 0) {
    throw new Error('Impossible de créer un document sans pages.');
  }

  const id = generateId();

  try {
    const docDir = new Directory(Paths.document, SCANS_DIR_NAME, id);
    docDir.create({ intermediates: true, idempotent: true });

    const pageUris: string[] = [];
    for (let i = 0; i < sourceImageUris.length; i++) {
      const sourceFile = new File(sourceImageUris[i]);
      const destFile = new File(docDir, `page-${i}.jpg`);
      sourceFile.copy(destFile);
      pageUris.push(destFile.uri);
    }

    const document: Document = {
      id,
      name,
      createdAt: Date.now(),
      pageUris,
    };

    const documents = await readIndex();
    documents.push(document);
    await writeIndex(documents);

    return document;
  } catch (error) {
    console.error('[storage] Impossible de créer le document:', error);
    throw new Error('Échec de la création du document.');
  }
}

export async function renameDocument(id: string, newName: string): Promise<void> {
  try {
    const documents = await readIndex();
    const index = documents.findIndex((doc) => doc.id === id);
    if (index === -1) {
      throw new Error('Document introuvable.');
    }
    documents[index] = { ...documents[index], name: newName };
    await writeIndex(documents);
  } catch (error) {
    console.error('[storage] Impossible de renommer le document:', error);
    throw new Error('Échec du renommage du document.');
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const documents = await readIndex();
    const remaining = documents.filter((doc) => doc.id !== id);

    const docDir = new Directory(Paths.document, SCANS_DIR_NAME, id);
    if (docDir.exists) {
      docDir.delete();
    }

    await writeIndex(remaining);
  } catch (error) {
    console.error('[storage] Impossible de supprimer le document:', error);
    throw new Error('Échec de la suppression du document.');
  }
}
