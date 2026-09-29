import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteDocument, getDocument, renameDocument } from '@/services/storage';
import { exportToPdf, saveToDownloads } from '@/services/pdf';
import type { Document } from '@/types/document';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const doc = await getDocument(id);
      if (!doc) {
        setNotFound(true);
      } else {
        setDocument(doc);
        setNameDraft(doc.name);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleStartRename = () => {
    if (!document) return;
    setNameDraft(document.name);
    setIsEditingName(true);
  };

  const handleConfirmRename = async () => {
    if (!document) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === document.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      await renameDocument(document.id, trimmed);
      setDocument({ ...document, name: trimmed });
    } catch (error) {
      console.error('[document] Échec du renommage:', error);
      Alert.alert('Erreur', "Impossible de renommer le document.");
    } finally {
      setIsSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleDelete = () => {
    if (!document) return;
    Alert.alert(
      'Supprimer ce document ?',
      'Cette action est définitive et supprimera toutes ses pages.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteDocument(document.id);
              router.replace('/');
            } catch (error) {
              console.error('[document] Échec de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le document.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportPdf = async () => {
    if (!document || isExporting) return;
    setIsExporting(true);
    try {
      const result = await saveToDownloads(document);
      if (result.savedToDownloads) {
        Alert.alert('PDF enregistré', 'Le document a été enregistré dans Téléchargements.');
      } else if (Platform.OS === 'android') {
        Alert.alert(
          'PDF généré',
          "Le PDF a été créé, mais l'accès à Téléchargements a été refusé. Utilisez \"Partager\" pour l'enregistrer ailleurs."
        );
      } else {
        Alert.alert(
          'PDF généré',
          "Le PDF a été créé. Utilisez \"Partager\" pour l'enregistrer sur cet appareil."
        );
      }
    } catch (error) {
      console.error('[document] Échec de l\'export PDF:', error);
      Alert.alert('Erreur', "Impossible de générer le PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!document || isSharing) return;
    setIsSharing(true);
    try {
      const uri = await exportToPdf(document);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Indisponible', 'Le partage n\'est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: document.name,
      });
    } catch (error) {
      console.error('[document] Échec du partage:', error);
      Alert.alert('Erreur', "Impossible de partager le document.");
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (notFound || !document) {
    return (
      <ThemedView style={styles.centered}>
        <Stack.Screen options={{ title: 'Document introuvable' }} />
        <Ionicons name="alert-circle-outline" size={40} color={colors.icon} />
        <ThemedText type="subtitle" style={styles.notFoundText}>
          Ce document n&apos;existe pas ou plus.
        </ThemedText>
        <Pressable
          onPress={() => router.replace('/')}
          style={[styles.backButton, { backgroundColor: colors.tint }]}
        >
          <ThemedText style={styles.backButtonLabel}>Retour à l&apos;accueil</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: document.name }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {isEditingName ? (
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onSubmitEditing={handleConfirmRename}
            onBlur={handleConfirmRename}
            autoFocus
            editable={!isSavingName}
            style={[styles.nameInput, { color: colors.text, borderColor: colors.tint }]}
            returnKeyType="done"
          />
        ) : (
          <Pressable style={styles.nameRow} onPress={handleStartRename}>
            <ThemedText type="subtitle" numberOfLines={1} style={styles.nameText}>
              {document.name}
            </ThemedText>
            <Ionicons name="pencil-outline" size={16} color={colors.icon} />
          </Pressable>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleExportPdf}
            disabled={isExporting || isSharing}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="document-text-outline" size={18} color={colors.tint} />
            )}
            <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
              Exporter en PDF
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleShare}
            disabled={isExporting || isSharing}
            style={[styles.actionButton, { borderColor: colors.border }]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="share-outline" size={18} color={colors.tint} />
            )}
            <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
              Partager
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            disabled={isDeleting}
            style={[styles.actionButton, styles.deleteButton]}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#C0392B" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#C0392B" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.pagesContainer}>
        {document.pageUris.map((uri, index) => (
          <View
            key={uri}
            style={[styles.pageCard, { backgroundColor: colors.surface }, Shadows.card]}
          >
            <Image source={{ uri }} style={styles.pageImage} resizeMode="contain" />
            <ThemedText type="secondary" style={styles.pageLabel}>
              Page {index + 1}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  notFoundText: {
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
  },
  backButtonLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameText: {
    flexShrink: 1,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteButton: {
    borderColor: '#C0392B40',
    paddingHorizontal: 10,
  },
  pagesContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  pageCard: {
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    ...Platform.select({ web: { alignItems: 'center' } }),
  },
  pageImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Radii.sm,
  },
  pageLabel: {
    textAlign: 'center',
  },
});
