import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createDocument, listDocuments } from '@/services/storage';
import { pickImages, scanDocument } from '@/services/scanner';
import type { Document } from '@/types/document';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function LibraryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments])
  );

  const createFromImages = useCallback(async (images: string[]) => {
    if (images.length === 0) return;
    const defaultName = `Document du ${formatDate(Date.now())}`;
    const document = await createDocument(defaultName, images);
    router.push(`/document/${document.id}`);
  }, []);

  const handleScan = useCallback(async () => {
    if (isScanning || isPicking) return;
    setIsScanning(true);
    try {
      const images = await scanDocument();
      await createFromImages(images);
    } catch (error) {
      console.error('[index] Échec du scan:', error);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, isPicking, createFromImages]);

  const handlePickImages = useCallback(async () => {
    if (isScanning || isPicking) return;
    setIsPicking(true);
    try {
      const images = await pickImages();
      await createFromImages(images);
    } catch (error) {
      console.error('[index] Échec de l\'import de photos:', error);
    } finally {
      setIsPicking(false);
    }
  }, [isScanning, isPicking, createFromImages]);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {documents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="scan-outline" size={40} color={colors.tint} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            Aucun document pour l&apos;instant
          </ThemedText>
          <ThemedText type="secondary" style={styles.emptyText}>
            Scannez ou importez des photos pour créer votre premier document, prêt à être
            partagé en PDF.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/document/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
                Shadows.card,
                pressed && styles.cardPressed,
              ]}
            >
              {item.pageUris[0] ? (
                <Image source={{ uri: item.pageUris[0] }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Ionicons name="document-outline" size={24} color={colors.icon} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="secondary">{formatDate(item.createdAt)}</ThemedText>
                <ThemedText type="secondary">
                  {item.pageUris.length} page{item.pageUris.length > 1 ? 's' : ''}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.icon} />
            </Pressable>
          )}
        />
      )}

      <View style={styles.fabRow}>
        <Pressable
          onPress={handlePickImages}
          disabled={isScanning || isPicking}
          style={({ pressed }) => [
            styles.fabSecondary,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Shadows.fab,
            pressed && styles.fabPressed,
          ]}
        >
          {isPicking ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            <>
              <Ionicons name="images-outline" size={20} color={colors.tint} />
              <ThemedText style={[styles.fabLabel, { color: colors.tint }]}>Photos</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleScan}
          disabled={isScanning || isPicking}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.tint },
            Shadows.fab,
            pressed && styles.fabPressed,
          ]}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="scan" size={22} color="#fff" />
              <ThemedText style={styles.fabLabel}>Scanner</ThemedText>
            </>
          )}
        </Pressable>
      </View>
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
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  cardPressed: {
    opacity: 0.7,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radii.sm,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000010',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  fabRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
