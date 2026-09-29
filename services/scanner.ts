import * as ImagePicker from 'expo-image-picker';

const MAX_PAGES = 24;

export async function pickImages(): Promise<string[]> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      console.warn('[scanner] Permission d\'accès aux photos refusée.');
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PAGES,
      quality: 1,
    });

    if (result.canceled || !result.assets) {
      return [];
    }

    return result.assets.map((asset) => asset.uri);
  } catch (error) {
    console.error('[scanner] Échec de la sélection de photos:', error);
    return [];
  }
}

export async function scanDocument(): Promise<string[]> {
  try {
    const {
      default: DocumentScanner,
      ResponseType,
      ScanDocumentResponseStatus,
    } = require('react-native-document-scanner-plugin');

    const { scannedImages, status } = await DocumentScanner.scanDocument({
      maxNumDocuments: MAX_PAGES,
      responseType: ResponseType.ImageFilePath,
    });

    if (status !== ScanDocumentResponseStatus.Success) {
      return [];
    }

    return scannedImages ?? [];
  } catch (error) {
    console.error('[scanner] Échec du scan du document:', error);
    return [];
  }
}
