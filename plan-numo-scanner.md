# Numo, plan d'implémentation de A à Z

## L'idée en une phrase

Une appli mobile de scanner de documents, gratuite et sans pub, entièrement offline, où le moteur de scan (détection des bords, correction de perspective, rendu net) est fourni par les SDK natifs de Google (ML Kit) et Apple (VisionKit), branchés dans un projet Expo via le plugin `react-native-document-scanner-plugin`. Aucun backend.

## Architecture générale

Tout se passe sur le téléphone. Le plugin ouvre le scanner natif et te rend des images recadrées et propres. Ces images sont copiées dans le stockage permanent de l'appli avec `expo-file-system`. Un petit index en JSON (via AsyncStorage) garde la liste des documents et de leurs pages. Quand l'utilisateur veut un PDF, on assemble les images en PDF localement avec `expo-print`, puis on ouvre la feuille de partage native avec `expo-sharing`. C'est tout. Pas de serveur, pas de compte, pas de connexion requise.

Le modèle de données est volontairement simple. Un document a un identifiant, un nom, une date de création, et une liste de chemins d'images (ses pages). Le PDF est généré à la demande, on n'a pas besoin de le stocker en permanence.

## Le point de vigilance à connaître d'avance

Le plugin embarque du code natif, donc il ne tourne pas dans Expo Go. Il faut un dev build (via EAS Build ou `expo prebuild`). Deuxième point: les versions récentes d'Expo activent la "nouvelle architecture" React Native par défaut, et le plugin original peut ne pas la supporter. Si le scanner plante au lancement, la première chose à tester est de mettre `"newArchEnabled": false` dans `app.json`, ou de basculer sur le fork `@dariyd/react-native-document-scanner` qui gère la nouvelle architecture. Garde ce paragraphe sous la main, c'est le seul vrai piège de tout le projet.

## Les phases

Le travail se découpe en huit phases courtes. Chaque phase correspond à un prompt prêt à coller dans ton assistant de code (Claude Code par exemple). Tu avances phase par phase, tu testes, puis tu passes à la suivante. On fait le MVP d'abord (scanner, lister, exporter en PDF, partager), et le confort (renommer, réorganiser, OCR) viendra en itération.

---

## Phase 0, création du projet

Lance la création du projet toi-même avec le template par défaut (expo-router + TypeScript), c'est la base la plus propre et la plus à jour:

```bash
npx create-expo-app@latest numo
cd numo
```

Une fois dedans, tu passes au prompt de la phase 1.

---

## Phase 1, dépendances et configuration

```
Contexte: projet Expo tout neuf (template par défaut expo-router + TypeScript), destiné à une appli de scanner de documents gratuite et offline, sans backend.

Installe et configure les dépendances suivantes:
- react-native-document-scanner-plugin (moteur de scan natif ML Kit / VisionKit)
- expo-file-system (stockage permanent des images scannées)
- expo-print (génération de PDF à partir des images)
- expo-sharing (feuille de partage native)
- @react-native-async-storage/async-storage (index des documents en JSON)

Utilise "npx expo install" pour chaque paquet afin d'avoir les versions compatibles avec le SDK Expo courant.

Ensuite, ajoute react-native-document-scanner-plugin dans le tableau "plugins" de app.json, avec un message de permission caméra en français du type "Nous avons besoin de la caméra pour scanner vos documents".

Rappelle-moi à la fin que ce plugin ne tourne pas dans Expo Go et qu'il faudra un dev build EAS pour tester le scan. Ne configure rien d'autre pour l'instant.
```

---

## Phase 2, la couche de stockage

```
Crée la couche de données de l'appli, en TypeScript, sans aucune dépendance à un backend.

Définis un type Document:
- id: string
- name: string
- createdAt: number (timestamp)
- pageUris: string[] (chemins locaux des images des pages)

Crée un module services/storage.ts qui expose:
- listDocuments(): Promise<Document[]>
- getDocument(id): Promise<Document | null>
- createDocument(name, sourceImageUris): Promise<Document> qui copie chaque image source depuis le cache vers un dossier permanent propre au document sous FileSystem.documentDirectory (par exemple scans/<id>/page-<n>.jpg), puis enregistre le document dans l'index
- renameDocument(id, newName): Promise<void>
- deleteDocument(id): Promise<void> qui supprime aussi le dossier d'images du document
- L'index (le tableau de Document) est persisté dans AsyncStorage sous une clé "numo.documents"

Génère les identifiants avec un utilitaire simple (timestamp + suffixe aléatoire), pas besoin d'une lib d'uuid. Gère proprement les cas où l'index n'existe pas encore (retourne un tableau vide). Ajoute une gestion d'erreur basique avec try/catch et des messages clairs.
```

---

## Phase 3, le service de scan

```
Crée un module services/scanner.ts qui encapsule react-native-document-scanner-plugin.

Expose une fonction scanDocument() qui:
- appelle DocumentScanner.scanDocument avec maxNumDocuments réglé assez haut (par exemple 24) pour permettre le multi-pages
- retourne le tableau des chemins d'images scannées (scannedImages)
- retourne un tableau vide si l'utilisateur annule
- englobe l'appel dans un try/catch et journalise les erreurs

Ce module ne doit rien stocker lui-même, il se contente de lancer le scanner et de renvoyer les images. Le stockage est géré par la couche de la phase 2.
```

---

## Phase 4, la structure de navigation et le thème

```
Mets en place la structure expo-router de l'appli avec deux écrans:
- app/index.tsx: l'écran d'accueil (la bibliothèque de documents)
- app/document/[id].tsx: l'écran de visualisation d'un document

Configure app/_layout.tsx avec un Stack expo-router, titres en français ("Mes documents" pour l'accueil).

Applique une direction visuelle simple mais soignée, pas un thème générique par défaut. Palette sobre et lisible orientée productivité: un fond très clair presque blanc cassé, un bleu encre profond comme couleur principale d'action, un gris neutre pour le texte secondaire, et une seule couleur d'accent chaude discrète pour les actions positives. Typographie: une police de titre avec du caractère et une police de corps très lisible, échelle de tailles claire. Coins arrondis doux, ombres légères. Tout doit rester épuré, l'appli sert à scanner vite, pas à décorer.

Ne mets pas encore de logique dans les écrans, juste la structure, le thème et des placeholders.
```

---

## Phase 5, l'écran bibliothèque

```
Implémente l'écran d'accueil app/index.tsx (la bibliothèque).

Comportement:
- Au montage, charge la liste des documents via listDocuments() de la couche de stockage
- Affiche chaque document dans une carte avec sa vignette (première page), son nom et sa date formatée en français
- Un appui sur une carte navigue vers app/document/[id]
- Un état vide accueillant quand il n'y a aucun document, avec une invitation claire à scanner
- Un bouton d'action flottant "Scanner" bien visible en bas

Le bouton Scanner:
- appelle scanDocument() du service de scan
- si des images reviennent, crée un document via createDocument (avec un nom par défaut du type "Document du <date>") puis navigue vers l'écran de visualisation du nouveau document
- si l'utilisateur annule, ne fait rien

Recharge la liste quand on revient sur l'écran (utilise useFocusEffect d'expo-router). Gère un état de chargement propre.
```

---

## Phase 6, l'écran de visualisation

```
Implémente app/document/[id].tsx, l'écran de visualisation d'un document.

Comportement:
- Charge le document via getDocument(id)
- Affiche ses pages en liste verticale déroulante, chaque image lisible en grand
- Dans l'en-tête, un champ ou une action pour renommer le document (appelle renameDocument puis met à jour l'affichage)
- Une action pour supprimer le document, avec une confirmation, qui appelle deleteDocument puis revient à l'accueil
- Prévois un emplacement dans l'en-tête pour un bouton "Exporter en PDF" et un bouton "Partager" que l'on branchera à la phase suivante (laisse-les visibles mais non fonctionnels pour l'instant)

Gère le cas où le document n'existe pas (message clair et retour à l'accueil).
```

---

## Phase 7, export PDF et partage

```
Branche l'export PDF et le partage sur l'écran de visualisation.

Crée un module services/pdf.ts avec une fonction exportToPdf(document): Promise<string> qui:
- lit chaque image de pageUris et l'encode en base64 avec expo-file-system
- construit un HTML où chaque page est une image data-URI en pleine largeur, une page PDF par image (utilise du CSS page-break pour séparer les pages)
- appelle Print.printToFileAsync avec ce HTML pour produire un PDF, et retourne l'URI du fichier PDF généré

Sur l'écran de visualisation:
- le bouton "Exporter en PDF" appelle exportToPdf puis affiche une confirmation
- le bouton "Partager" appelle exportToPdf puis Sharing.shareAsync sur l'URI du PDF, pour ouvrir la feuille de partage native (WhatsApp, mail, etc.)
- gère les états de chargement (génération du PDF) et les erreurs proprement
```

---

## Phase 8, identité de l'appli et build

```
Finalise l'identité de l'appli et prépare le build.

- Dans app.json, mets le nom d'affichage "Numo", un slug "numo", et un identifiant de package Android cohérent (par exemple org.neopy.numo)
- Génère ou intègre une icône et un splash screen aux bonnes dimensions, dans l'esprit visuel de l'appli (fond clair, symbole simple évoquant un document numérisé)
- Configure EAS Build: crée eas.json avec un profil "development" (dev client, pour tester le scan sur un vrai téléphone) et un profil "production" (APK ou AAB)
- Donne-moi les commandes exactes pour: se connecter à EAS, lancer un build de développement Android, l'installer sur mon téléphone, puis lancer le build de production
```

---

## Après le MVP

Une fois ces huit phases terminées, tu as une appli complète et publiable: scanner, bibliothèque, visualisation, export PDF, partage, le tout gratuit et sans pub. Les évolutions naturelles ensuite, dans l'ordre où elles apportent le plus de valeur, sont la réorganisation et la suppression de pages individuelles dans un document, le regroupement en dossiers, puis l'OCR pour rendre les PDF cherchables (toujours gratuitement via la reconnaissance de texte de ML Kit). Rien de tout ça n'est nécessaire pour publier une première version utile.

## Résumé du flux de travail

Tu crées le projet (phase 0), puis tu donnes les prompts un par un à ton assistant de code. Après la phase 1 tu ne peux pas encore tester le scan dans Expo Go, il te faut le dev build de la phase 8 (tu peux d'ailleurs faire un premier dev build juste après la phase 1 pour valider que le scanner natif s'ouvre bien, avant même d'avoir l'interface). Le reste des écrans se teste ensuite dans ce dev client au fur et à mesure.
