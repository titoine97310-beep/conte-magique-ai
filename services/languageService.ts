import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppLanguage = "fr" | "en" | "es";

const LANGUAGE_STORAGE_KEY = "contemagiqueia_language";

export const translations = {
  fr: {
    common: {
      appName: "ConteMagiqueIA",
      close: "Fermer",
      cancel: "Annuler",
      confirm: "Confirmer",
      delete: "Supprimer",
      save: "Enregistrer",
      share: "Partager",
      back: "Retour",
      next: "Suivant",
      loading: "Chargement...",
      error: "Erreur",
    },

    home: {
      introSubtitle: "Des histoires magiques pour les enfants ✨",
      subtitle:
        "Crée des histoires magiques avec l’IA, des images et une narration immersive ✨",
      hello: "Bonjour",
      createStory: "Créer une histoire",
      savedStories: "Mes histoires",
      savedVideos: "🎬 Mes vidéos",
      account: "👤 Mon compte",
      login: "🔐 Se connecter",
      chooseLanguage: "Choisir la langue",
      helpTitle: "Comment ça marche ? ✨",
helpCreateTitle: "📖 Créer une histoire",
helpCreateText:
  "Choisis ton idée, le type d’histoire et ton narrateur.",

helpIllustratedTitle: "🎨 Histoire illustrée",
helpIllustratedText:
  "Pour obtenir des images et créer un dessin animé, choisis une histoire illustrée.",

helpVideoTitle: "🎬 Créer un dessin animé",
helpVideoText:
  "Pour créer un dessin animé, crée d’abord une histoire illustrée. Ouvre ensuite ton histoire et appuie sur « Créer mon dessin animé ».",

helpSavedTitle: "❤️ Retrouver tes créations",
helpSavedText:
  "Retrouve tes histoires dans « Mes histoires » et tes dessins animés dans « Mes vidéos ».",

helpAudioTitle: "🔊 Lecture IA",
helpAudioText:
  "Écoute ton histoire avec le narrateur choisi et utilise le mode dodo pour une lecture plus douce.",

helpLanguageTitle: "🌍 Langue",
helpLanguageText:
  "Choisis Français, English ou Español depuis l’accueil. L’histoire et la narration suivront la langue sélectionnée.",

helpUnderstood: "J’ai compris",
    },

    languages: {
      fr: "Français",
      en: "English",
      es: "Español",
    },

    
      createStory: {

    guestWelcomeTitle: "✨ Bienvenue dans ConteMagiqueIA",
guestWelcomeMessage:
  "Tu peux découvrir gratuitement 2 histoires :\n\n📖 La première en texte\n🎨 La deuxième avec des illustrations\n\nEnsuite, tu pourras créer un compte et recevoir 2 nouvelles histoires texte offertes.",
guestWelcomeButton: "Commencer",

emptyTextPack: "Ton carnet Texte ne contient plus d’histoire.",
emptyIllustratedPack: "Ton carnet Illustré ne contient plus d’histoire.",
textPackChoice: "📖 Texte",
illustratedPackChoice: "🎨 Illustré",

  title: "Parle à l’IA",
  subtitle: "Écris ton idée d’histoire ✨",

  activePack: "Carnet actif",
  textPack: "📖 Carnet Texte",
  illustratedPack: "🎨 Carnet Illustré",
  textShort: "📖 Texte",
  illustratedShort: "🎨 Illustré",
  changePack: "Appuie pour changer de carnet",
  buyPack: "Acheter un carnet",
  choosePack: "Choisir un carnet",
  choosePackMessage:
    "Le carnet choisi sera utilisé pour la prochaine histoire.",
  emptyPack: "Carnet vide",
  remainingStory: "histoire restante",
  remainingStories: "histoires restantes",

  ideaPlaceholder:
    "Ex : un dragon gentil sur une île magique...",

  optionalPhoto: "📸 Photo de référence facultative",
  photoHelp:
    "Utilise une photo nette où les personnes ou éléments importants sont bien visibles.",
  addPhoto: "📷 Ajouter une photo à mon histoire",
  changePhoto: "📷 Changer la photo",
  removePhoto: "Supprimer la photo",
  photoAdded: "Photo de référence ajoutée ✓",
  photoTitle: "📷 Ajouter une photo",
  photoDescription:
    "Ajoute une photo de référence pour personnaliser les illustrations : enfant, parent, famille, frères et sœurs, animal, doudou ou autre élément important.",
  takePhoto: "Prendre une photo",
  chooseGallery: "Choisir dans la galerie",
  permissionRequired: "Autorisation nécessaire",
  galleryPermission:
    "Autorise l'accès aux photos pour choisir une photo.",
  cameraPermission:
    "Autorise l'accès à l'appareil photo pour prendre une photo.",
  photoSelectionError:
    "Impossible de sélectionner la photo.",
  cameraError:
    "Impossible de prendre la photo.",

  cartoonActivated: "Style Cartoon activé 🎨",
  realisticPhotoBlocked:
    "Le style Réaliste est indisponible lorsqu'une photo est utilisée.",
  styleUnavailable: "Style indisponible",

  imageStyleTitle: "Style des images",
  cartoon: "🎨 Cartoon",
  fantasy: "🧙 Fantasy",
  realistic: "🌍 Réaliste",
  comic: "📖 BD",

  storyTypeTitle: "Type d’histoire",
  funny: "🤣 Drôle",
  adventure: "⚔️ Aventure",
  magic: "🧙 Magique",
  mystery: "👻 Mystère",

  lengthTitle: "Longueur",
  short: "⚡ Courte",
  medium: "📖 Moyenne",
  long: "🌙 Longue",
  comingSoon: "Bientôt",

  narratorTitle: "Qui raconte l’histoire ?",
  eliseSubtitle: "Douce et expressive",
  arthurSubtitle: "Chaleureux et rassurant",
  merlinSubtitle: "Mystérieux et magique",
  lunaSubtitle: "Joyeuse et féerique",
  bedtimeSubtitle: "Lent et apaisant",

  generate: "Générer l’histoire",
  generating: "Génération...",
  creatingStory: "Création de l’histoire...",
  creatingImage: "Création de l’image",

  backHome: "Retour accueil",

  missingIdea: "Écris une idée avant de générer une histoire.",
  profileNotFound: "Profil introuvable",
  profileNotFoundMessage:
    "Ton compte est connecté, mais ton profil n’a pas été trouvé.",

  packsFinished: "📚 Tes carnets sont terminés",
  packsFinishedMessage:
    "Tu n’as plus d’histoire disponible. Choisis un nouveau carnet pour continuer.",
  later: "Plus tard",
  viewPacks: "Voir les carnets",

  surpriseTitle: "🎨 Une surprise t’attend",
  surpriseMessage:
    "Cette deuxième histoire sera illustrée. Après cette aventure, tu pourras créer un compte et recevoir 2 histoires texte offertes.",
  discoverIllustrations: "Découvrir les illustrations",

  generationError: "Impossible de générer l’histoire.",

  readStory: "Lire mon histoire",
  buyAnotherPack: "Acheter un carnet",
},

    savedStories: {
  title: "Mes histoires",
  all: "Toutes",
  favorites: "Favoris ❤️",
  loading: "Chargement de tes histoires…",
  empty: "Aucune histoire sauvegardée pour l’instant.",
  emptyFavorites: "Aucune histoire favorite pour l’instant.",
  defaultStoryTitle: "Histoire magique",
  scene: "scène",
  scenes: "scènes",
  read: "Lire",
  delete: "Supprimer",
  createVideo: "🎬 Créer le dessin animé",
  backHome: "Retour accueil",

  videoUnavailableTitle: "Dessin animé indisponible",
  videoUnavailableMessage:
    "Seules les histoires de 4 ou 6 scènes peuvent être transformées en dessin animé.",

  favoriteSyncError:
    "Le favori n'a pas pu être synchronisé.",
  favoriteUpdateError:
    "Impossible de modifier ce favori pour le moment.",

  loginRequired: "Connexion requise",
  loginRequiredShare:
    "Connecte-toi pour partager cette histoire.",

  shareTitle: "Une histoire ConteMagiqueIA",
  shareMessage:
    "✨ Découvre cette histoire créée avec ConteMagiqueIA !",
  shareImpossible: "Partage impossible",
  shareError:
    "L'histoire n'a pas pu être partagée.",

  deleteTitle: "Supprimer",
  deleteConfirm:
    "Tu veux vraiment supprimer cette histoire ?",
  cloudDeleteError:
    "La suppression dans le cloud a échoué.",
  deleteError:
    "Impossible de supprimer cette histoire.",
},

    savedVideos: {
  title: "🎬 Mes vidéos",
  loading: "Chargement de tes vidéos...",
  loadingErrorTitle: "Chargement impossible",
  loadingErrorMessage: "Tes vidéos n'ont pas pu être chargées.",

  emptyTitle: "Aucune vidéo",
  emptyMessage:
    "Tes dessins animés créés ou reçus apparaîtront ici.",

  unknownDate: "Date inconnue",

  scene: "scène",
  scenes: "scènes",

  receivedBadge: "🎁 Reçue",
  receivedVideo: "🎁 Dessin animé reçu",
  animatedVideo: "🎬 Dessin animé",

  watch: "▶️ Regarder",
  share: "📤 Partager",
  remove: "🗑️ Retirer",
  delete: "🗑️ Supprimer",

  shareTitle: "Dessin animé ConteMagiqueIA",
  shareMessage:
    "🎬 Découvre ce dessin animé créé avec ConteMagiqueIA ! ✨",

  loginRequired: "Connexion requise",
  loginRequiredShare:
    "Connecte-toi pour partager cette vidéo.",

  shareImpossible: "Partage impossible",
  shareError:
    "La vidéo n'a pas pu être partagée.",
  shareLinkMissing:
    "Le lien de partage de cette vidéo est introuvable.",

  removeConfirmTitle: "Retirer cette vidéo ?",
  deleteConfirmTitle: "Supprimer cette vidéo ?",

  removeConfirmMessage:
    "Cette vidéo sera retirée de Mes vidéos. La vidéo originale de son créateur ne sera pas supprimée.",
  deleteConfirmMessage:
    "Cette vidéo sera supprimée de Mes vidéos.",

  removeAction: "Retirer",
  deleteAction: "Supprimer",

  removedTitle: "Vidéo retirée",
  removedMessage:
    "La vidéo a été retirée de Mes vidéos. L'originale n'a pas été supprimée.",

  deletedTitle: "Vidéo supprimée",
  deletedMessage:
    "Le dessin animé a bien été supprimé de Mes vidéos.",

  deleteImpossible: "Suppression impossible",
  removeError:
    "La vidéo n'a pas pu être retirée. Réessaie dans quelques instants.",
  deleteError:
    "La vidéo n'a pas pu être supprimée. Réessaie dans quelques instants.",
},

    player: {
  title: "Ton histoire",
  scene: "Scène",

  textStory: "Histoire texte",
  textStoryFullscreen: "Cette histoire est disponible sans image.",
  readingWithoutImage: "Lecture sans image",

  styleMagic: "✨ Style magique",
  realistic: "🌍 Réaliste",
  comic: "📖 BD",

  forest: "🌳 Forêt",
  ocean: "🌊 Mer",
  night: "🌙 Nuit",
  danger: "⚠️ Danger",
  calm: "🕊️ Calme",
  victory: "🏆 Victoire",
  magic: "✨ Magie",

  readAI: "Lire IA",
  readingAI: "Lecture IA...",
  autoPlay: "Lecture auto",
  autoPlaying: "En cours...",
  fullscreen: "Plein écran",

  nightMode: "Mode nuit",
  nightOn: "Nuit ON",
  replay: "Rejouer",

  bedtimeMode: "Mode dodo",
  bedtimeShort: "Dodo",

  ambienceOn: "Ambiance ON",
  ambienceOff: "Ambiance OFF",

  previous: "Retour",
  next: "Suite",
  stop: "Stop",
  home: "Accueil",

  report: "Signaler",
  reportTitle: "Signaler ce contenu",
  reportSubtitle:
    "Choisis le motif qui correspond le mieux au problème rencontré.",
  reportSending: "Envoi...",
  reportSentTitle: "Signalement envoyé",
  reportSentMessage:
    "Merci. Ce contenu a bien été signalé et pourra être examiné.",
  reportError:
    "Impossible d'envoyer le signalement pour le moment. Réessaie plus tard.",

  reportInappropriate: "Contenu inapproprié ou choquant",
  reportViolence: "Violence ou contenu dangereux",
  reportSexual: "Contenu à caractère sexuel",
  reportOther: "Autre problème",

  createVideo: "Créer mon dessin animé",
  videoCreating: "Création en cours...",
  createAnimation: "Créer le dessin animé",

  videoUnavailableTitle: "Dessin animé indisponible",
  videoUnavailableMessage:
    "Seules les histoires de 4 ou 6 scènes peuvent être transformées en dessin animé pour le moment.",

  missingImagesTitle: "Illustrations manquantes",
  missingImagesMessage:
    "Toutes les scènes doivent avoir une illustration avant de créer le dessin animé.",

  noVideoCreditTitle: "Aucun crédit vidéo",
  noVideoCreditMessage:
    "Tu n'as pas encore de crédit pour créer un dessin animé.",
  getCredit: "Obtenir un crédit",

  creditCheckError:
    "Impossible de vérifier tes crédits vidéo. Réessaie dans quelques instants.",

  creditPendingTitle: "Crédit en cours d’activation",
  creditPendingMessage:
    "Ton achat a bien été validé, mais ton crédit n'est pas encore visible. Retourne dans ton histoire dans quelques secondes puis appuie sur « Créer mon dessin animé ».",

  purchaseCreditError:
    "Ton achat est conservé, mais le crédit vidéo n'a pas pu être vérifié. Réessaie depuis ton histoire.",

  loginRequired: "Connexion requise",
  loginRequiredMessage:
    "Connecte-toi pour créer ton dessin animé.",

  videoCreatedTitle: "Dessin animé créé 🎉",
  videoCreatedMessage: "scènes ont été animées avec succès.",
  later: "Plus tard",
  watchVideo: "🎬 Regarder la vidéo",

  videoCreationImpossible: "Création impossible",
  videoCreationError:
    "Une erreur est survenue pendant la création du dessin animé.",

  videoModalTitle: "🎬 Créer mon dessin animé",
  storyContains: "Ton histoire contient",
  scenes: "scènes.",
  estimatedDuration: "Durée estimée : environ",
  seconds: "secondes.",
  oneVideoCredit: "1 crédit vidéo",

  cancel: "Annuler",
},

    continueAdventure: {
  backHome: "← Accueil",

  title: "Continue l’aventure",
  subtitle:
    "Tu as découvert les premières histoires de ConteMagiqueIA. La magie ne fait que commencer.",

  welcomeGift: "Ton cadeau de bienvenue",
  welcomeGiftDescription:
    "Crée gratuitement ton compte et reçois ton premier carnet.",

  freePackTitle: "Un carnet offert",
  freePackText:
    "Commence une nouvelle collection d’aventures.",

  twoStoriesTitle: "2 nouvelles histoires",
  twoStoriesText:
    "Crée deux histoires personnalisées supplémentaires.",

  savedStoriesTitle: "Tes histoires sauvegardées",
  savedStoriesText:
    "Retrouve facilement les aventures que tu as créées.",

  createFreeAccount: "Créer mon compte gratuitement",
  alreadyHaveAccount: "J’ai déjà un compte",

  noCardRequired:
    "🔒 Aucune carte bancaire n’est demandée.",
},

    account: {
  title: "Mon compte",
  logout: "Se déconnecter",

  home: "← Accueil",
  welcomeBack: "Bon retour ✨",
  createAccountTitle: "Crée ton compte ✨",
  loginSubtitle: "Connecte-toi pour continuer l’aventure",
  registerSubtitle: "Rejoins l’univers de ConteMagiqueIA",

  login: "Se connecter",
  createAccount: "Créer un compte",
  createMyAccount: "Créer mon compte",

  firstName: "Prénom",
  email: "Adresse e-mail",
  password: "Mot de passe",
  forgotPassword: "Mot de passe oublié ?",

  acceptLegal:
    "J’ai lu et j’accepte les CGU et je reconnais avoir pris connaissance de la politique de confidentialité.",
  readTerms: "Lire les CGU",
  privacyPolicy: "Politique de confidentialité",

  noAccount: "Pas encore de compte ? ",
  alreadyAccount: "Tu as déjà un compte ? ",

  missingInfo: "Informations manquantes",
  loginMissingInfo:
    "Entre ton adresse e-mail et ton mot de passe.",
  registerMissingInfo: "Remplis tous les champs.",

  passwordTooShort: "Mot de passe trop court",
  passwordMinLength:
    "Le mot de passe doit contenir au moins 6 caractères.",

  validationRequired: "Validation requise",
  legalRequired:
    "Tu dois accepter les CGU et la politique de confidentialité.",

  loginImpossible: "Connexion impossible",
  registerImpossible: "Création impossible",

  invalidEmail: "L’adresse e-mail n’est pas valide.",
  missingPassword: "Entre ton mot de passe.",
  weakPassword:
    "Le mot de passe doit contenir au moins 6 caractères.",
  emailAlreadyUsed:
    "Un compte existe déjà avec cette adresse e-mail.",
  invalidCredential:
    "L’adresse e-mail ou le mot de passe est incorrect.",
  userNotFound:
    "Aucun compte ne correspond à cette adresse e-mail.",
  wrongPassword: "Le mot de passe est incorrect.",
  tooManyRequests:
    "Trop de tentatives. Réessaie dans quelques minutes.",
  networkError: "Problème de connexion Internet.",
  defaultLoginError: "Impossible de se connecter.",
  defaultRegisterError: "Impossible de créer le compte.",

  welcomeGift: "Bienvenue 🎁",
  welcomeGiftMessage:
    "Ton compte est prêt et tu as reçu 2 histoires texte gratuites. Tu peux aussi acheter un carnet dès maintenant.",
  createStory: "Créer une histoire",
  viewPacks: "Voir les carnets",

  forgotPasswordTitle: "Mot de passe oublié ?",
forgotPasswordSubtitle:
  "Entre ton e-mail pour recevoir un lien de réinitialisation.",
forgotPasswordEmail: "E-mail",
forgotPasswordSend: "Envoyer le lien",
forgotPasswordBack: "Retour",

forgotPasswordMissingEmail:
  "Entre ton adresse e-mail.",
forgotPasswordSentTitle: "E-mail envoyé 📩",
forgotPasswordSentMessage:
  "Si ce compte existe, tu recevras un lien pour réinitialiser ton mot de passe.",
forgotPasswordSendError:
  "Impossible d’envoyer l’e-mail.",

  profileLoading: "Chargement de ton compte...",
profileLoadImpossible: "Chargement impossible",
profileLoadError:
  "Impossible de récupérer les informations de ton compte pour le moment.",

nameRequired: "Nom obligatoire",
nameRequiredMessage: "Entre un nom avant d’enregistrer.",
nameChanged: "Nom modifié",
nameChangedMessage: "Ton nom affiché a bien été enregistré.",
nameChangeError: "Impossible de modifier ton nom pour le moment.",

mailUnavailable: "Application de messagerie indisponible",
contactAt: "Tu peux nous contacter à l'adresse :",
genericError: "Une erreur est survenue",

deleteAccount: "Supprimer mon compte",
deleteAccountConfirm:
  "Cette action est définitive.\n\nTon profil et les données liées à ton compte seront supprimés.\n\nVeux-tu vraiment continuer ?",
noConnectedUser: "Aucun utilisateur connecté n’a été trouvé.",
recentLoginRequired: "Reconnexion nécessaire",
recentLoginMessage:
  "Pour des raisons de sécurité, déconnecte-toi puis reconnecte-toi avant de supprimer ton compte.",
deleteAccountError:
  "La suppression du compte n’a pas pu être terminée.",

logoutConfirm:
  "Veux-tu vraiment te déconnecter de ton compte ?",
logoutError:
  "Impossible de te déconnecter pour le moment.",

you: "à toi",
notProvided: "Non renseigné",
notAvailable: "Non disponible",

roleAdmin: "Administrateur",
roleUser: "Utilisateur",
roleGuest: "Invité",

noStoryRemaining: "Aucune histoire restante",
oneStoryRemaining: "1 histoire restante",
storiesRemaining: "histoires restantes",

noPurchase: "Aucun achat",
onePurchase: "1 achat",
purchases: "achats",

hello: "Bonjour",
profileSubtitle:
  "Retrouve ici les informations de ton compte ConteMagiqueIA.",

incompleteProfile: "Profil incomplet",
incompleteProfileMessage:
  "Ton compte Firebase existe, mais son profil Firestore n’a pas été trouvé.",

myInformation: "Mes informations",
displayName: "Nom affiché",
edit: "Modifier",
accountCreated: "Compte créé le",
accountType: "Type de compte",

myPacks: "Mes carnets",
textPack: "Carnet Texte",
textPackDescription: "Histoires sans illustration",
illustratedPack: "Carnet Illustré",
illustratedPackDescription: "Histoires avec texte et images",
buyPack: "Acheter un carnet",

myActivity: "Mon activité",
lastLogin: "Dernière connexion",
lastStoryCreated: "Dernière histoire créée",
noStoryCreated: "Aucune histoire créée",

myPurchases: "Mes achats",
mySpace: "Mon espace",
myStories: "Mes histoires",

legalCenter: "Centre juridique",
legalCenterSubtitle:
  "CGU, confidentialité, mentions légales...",
contactUs: "Nous contacter",

version: "Version",

editNameTitle: "Modifier mon nom",
displayNamePlaceholder: "Ton nom affiché",
},

    videoPlayer: {
  title: "🎬 Mon dessin animé",

  loading: "Chargement du dessin animé...",

  videoNotFound: "Vidéo introuvable",
  videoNotFoundMessage:
    "Aucune adresse vidéo n'a été transmise à cette page.",

  back: "← Retour",

  pause: "⏸️ Pause",
  play: "▶️ Lire",
  replay: "🔄 Rejouer",

  error: "Erreur",
  playbackError: "Lecture impossible",
  playbackErrorMessage:
    "Impossible de lire le dessin animé.",

  technicalDetails: "⚠️ Détail technique",
},

    premium: {
  back: "← Retour",
  title: "Continue la magie ✨",
  subtitle:
    "Choisis ton carnet et continue à créer des histoires personnalisées.",

  benefitNarration: "🔊 Narration IA immersive",
  benefitBedtime: "🌙 Mode dodo magique",
  benefitSaved: "💾 Histoires sauvegardées",
  benefitIllustrations: "🎨 Illustrations selon le carnet",

  storeConnecting: "Connexion à",

  textPackTitle: "Carnet Texte",
  textPackDescription:
    "15 histoires en texte seul. Idéal pour profiter de la narration sans générer d’illustrations.",
  chooseTextPack: "Choisir le carnet texte",

  mostMagical: "Le plus magique",
  illustratedPackTitle: "Carnet Illustré",
  illustratedPackDescription:
    "15 histoires complètes avec texte et illustrations. L’expérience la plus immersive de ConteMagiqueIA.",
  chooseIllustratedPack: "Choisir le carnet illustré",

  fourScenes: "🎬 4 scènes",
  shortVideoTitle: "Dessin animé Court",
  shortVideoDescription:
    "Transforme une histoire illustrée de 4 scènes en dessin animé d’environ 20 secondes.",
  buyShortVideo: "🎬 Acheter le dessin animé Court",

  sixScenes: "🎬 6 scènes",
  mediumVideoTitle: "Dessin animé Moyen",
  mediumVideoDescription:
    "Transforme une histoire illustrée de 6 scènes en dessin animé d’environ 30 secondes.",
  buyMediumVideo: "🎬 Acheter le dessin animé Moyen",

  securePayment: "Paiement sécurisé par",
  packContains: "Chaque carnet contient 15 créations.",

  shortVideoActivated: "Dessin animé Court activé 🎬",
  mediumVideoActivated: "Dessin animé Moyen activé 🎬",
  shortVideoAdded:
    "Ton crédit vidéo de 4 scènes a bien été ajouté. Choisis maintenant l'histoire que tu veux transformer en dessin animé.",
  mediumVideoAdded:
    "Ton crédit vidéo de 6 scènes a bien été ajouté. Choisis maintenant l'histoire que tu veux transformer en dessin animé.",
  chooseStory: "Choisir mon histoire",

  textPackActivated: "Carnet Texte activé 🎉",
  textPackAdded:
    "15 histoires en texte ont été ajoutées à ton compte.",

  illustratedPackActivated: "Carnet Illustré activé 🎉",
  illustratedPackAdded:
    "15 histoires illustrées ont été ajoutées à ton compte.",

  createStory: "Créer une histoire",

  purchaseValidated: "Achat validé 🎉",
  purchaseAdded:
    "Ton achat a été ajouté à ton compte.",

  purchaseNotCompleted: "Achat non finalisé",
  purchaseValidationError:
    "Impossible de valider l'achat. Ne relance pas immédiatement le paiement.",

  paymentImpossible: "Paiement impossible",
  paymentError:
    "Le paiement n'a pas pu être effectué.",

  accountRequired: "Compte requis",
  accountRequiredMessage:
    "Crée gratuitement ton compte pour acheter et conserver tes carnets.",
  createAccount: "Créer mon compte",
  alreadyHaveAccount: "J’ai déjà un compte",

  storeUnavailable: "indisponible",
  storeNotReady:
    "La connexion à la boutique n'est pas encore prête. Réessaie dans quelques secondes.",

  productUnavailable: "Produit indisponible",
  productUnavailableMessage:
    "Ce produit n'est pas disponible pour le moment.",

  storeOpenError:
    "Impossible d'ouvrir la boutique.",
},
  },


  en: {
    common: {
      appName: "ConteMagiqueIA",
      close: "Close",
      cancel: "Cancel",
      confirm: "Confirm",
      delete: "Delete",
      save: "Save",
      share: "Share",
      back: "Back",
      next: "Next",
      loading: "Loading...",
      error: "Error",
    },

    home: {
      introSubtitle: "Magical stories for children ✨",
      subtitle:
        "Create magical stories with AI, images and immersive narration ✨",
      hello: "Hello",
      createStory: "Create a story",
      savedStories: "My stories",
      savedVideos: "🎬 My videos",
      account: "👤 My account",
      login: "🔐 Sign in",
      chooseLanguage: "Choose language",
      helpTitle: "How does it work? ✨",
helpCreateTitle: "📖 Create a story",
helpCreateText:
  "Choose your idea, story type and narrator.",

helpIllustratedTitle: "🎨 Illustrated story",
helpIllustratedText:
  "To get images and create an animated story, choose an illustrated story.",

helpVideoTitle: "🎬 Create an animated story",
helpVideoText:
  "To create an animated story, first create an illustrated story. Then open your story and tap “Create my animated story”.",

helpSavedTitle: "❤️ Find your creations",
helpSavedText:
  "Find your stories in “My stories” and your animated stories in “My videos”.",

helpAudioTitle: "🔊 AI narration",
helpAudioText:
  "Listen to your story with your chosen narrator and use bedtime mode for a softer reading experience.",

helpLanguageTitle: "🌍 Language",
helpLanguageText:
  "Choose Français, English or Español from the home screen. Your stories and narration will use the selected language.",

helpUnderstood: "Got it",
    },

    languages: {
      fr: "Français",
      en: "English",
      es: "Español",
    },

    createStory: {
    guestWelcomeTitle: "✨ Welcome to ConteMagiqueIA",
guestWelcomeMessage:
  "You can discover 2 stories for free:\n\n📖 Your first story in text\n🎨 Your second story with illustrations\n\nThen, you can create an account and receive 2 additional text stories for free.",
guestWelcomeButton: "Start",

emptyTextPack: "Your Text pack has no stories left.",
emptyIllustratedPack: "Your Illustrated pack has no stories left.",
textPackChoice: "📖 Text",
illustratedPackChoice: "🎨 Illustrated",

  title: "Talk to AI",
  subtitle: "Write your story idea ✨",

  activePack: "Active notebook",
  textPack: "📖 Text Notebook",
  illustratedPack: "🎨 Illustrated Notebook",
  textShort: "📖 Text",
  illustratedShort: "🎨 Illustrated",
  changePack: "Tap to change notebook",
  buyPack: "Buy a notebook",
  choosePack: "Choose a notebook",
  choosePackMessage:
    "The selected notebook will be used for your next story.",

  emptyPack: "Empty notebook",

  remainingStory: "story remaining",
  remainingStories: "stories remaining",

  ideaPlaceholder:
    "Example: a friendly dragon on a magical island...",

  optionalPhoto: "📸 Optional reference photo",
  photoHelp:
    "Use a clear photo where the important people or elements are clearly visible.",

  addPhoto: "📷 Add a photo to my story",
  changePhoto: "📷 Change photo",
  removePhoto: "Remove photo",
  photoAdded: "Reference photo added ✓",

  photoTitle: "📷 Add a photo",
  photoDescription:
    "Add a reference photo to personalize the illustrations: child, parent, family, siblings, pet, comfort toy or another important element.",

  takePhoto: "Take a photo",
  chooseGallery: "Choose from gallery",

  permissionRequired: "Permission required",
  galleryPermission:
    "Allow access to your photos to choose an image.",
  cameraPermission:
    "Allow camera access to take a photo.",

  photoSelectionError:
    "Unable to select the photo.",
  cameraError:
    "Unable to take the photo.",

  cartoonActivated: "Cartoon style enabled 🎨",
  realisticPhotoBlocked:
    "Realistic style is unavailable when a photo is used.",
  styleUnavailable: "Style unavailable",

  imageStyleTitle: "Image style",

  cartoon: "🎨 Cartoon",
  fantasy: "🧙 Fantasy",
  realistic: "🌍 Realistic",
  comic: "📖 Comic",

  storyTypeTitle: "Story type",

  funny: "🤣 Funny",
  adventure: "⚔️ Adventure",
  magic: "🧙 Magical",
  mystery: "👻 Mystery",

  lengthTitle: "Length",

  short: "⚡ Short",
  medium: "📖 Medium",
  long: "🌙 Long",
  comingSoon: "Coming soon",

  narratorTitle: "Who tells the story?",

  eliseSubtitle: "Gentle and expressive",
  arthurSubtitle: "Warm and reassuring",
  merlinSubtitle: "Mysterious and magical",
  lunaSubtitle: "Cheerful and enchanting",
  bedtimeSubtitle: "Slow and soothing",

  generate: "Generate story",
  generating: "Generating...",
  creatingStory: "Creating the story...",
  creatingImage: "Creating image",

  backHome: "Back to home",

  missingIdea:
    "Write an idea before generating a story.",

  profileNotFound: "Profile not found",
  profileNotFoundMessage:
    "Your account is connected, but your profile could not be found.",

  packsFinished: "📚 Your notebooks are finished",
  packsFinishedMessage:
    "You have no stories remaining. Choose a new notebook to continue.",

  later: "Later",
  viewPacks: "View notebooks",

  surpriseTitle: "🎨 A surprise awaits you",
  surpriseMessage:
    "This second story will be illustrated. After this adventure, you can create an account and receive 2 free text stories.",

  discoverIllustrations:
    "Discover the illustrations",

  generationError:
    "Unable to generate the story.",

  readStory: "Read my story",
  buyAnotherPack: "Buy a notebook",
},

    savedStories: {
  title: "My stories",
  all: "All",
  favorites: "Favorites ❤️",
  loading: "Loading your stories…",
  empty: "No saved stories yet.",
  emptyFavorites: "No favorite stories yet.",
  defaultStoryTitle: "Magical story",
  scene: "scene",
  scenes: "scenes",
  read: "Read",
  delete: "Delete",
  createVideo: "🎬 Create animated story",
  backHome: "Back to home",

  videoUnavailableTitle: "Animated story unavailable",
  videoUnavailableMessage:
    "Only stories with 4 or 6 scenes can be turned into an animated story.",

  favoriteSyncError:
    "The favorite could not be synchronized.",
  favoriteUpdateError:
    "Unable to update this favorite right now.",

  loginRequired: "Sign in required",
  loginRequiredShare:
    "Sign in to share this story.",

  shareTitle: "A ConteMagiqueIA story",
  shareMessage:
    "✨ Discover this story created with ConteMagiqueIA!",
  shareImpossible: "Unable to share",
  shareError:
    "The story could not be shared.",

  deleteTitle: "Delete",
  deleteConfirm:
    "Do you really want to delete this story?",
  cloudDeleteError:
    "Cloud deletion failed.",
  deleteError:
    "Unable to delete this story.",
},

    savedVideos: {
  title: "🎬 My videos",
  loading: "Loading your videos...",
  loadingErrorTitle: "Unable to load",
  loadingErrorMessage: "Your videos could not be loaded.",

  emptyTitle: "No videos",
  emptyMessage:
    "Your created or received animated stories will appear here.",

  unknownDate: "Unknown date",

  scene: "scene",
  scenes: "scenes",

  receivedBadge: "🎁 Received",
  receivedVideo: "🎁 Received animated story",
  animatedVideo: "🎬 Animated story",

  watch: "▶️ Watch",
  share: "📤 Share",
  remove: "🗑️ Remove",
  delete: "🗑️ Delete",

  shareTitle: "ConteMagiqueIA animated story",
  shareMessage:
    "🎬 Discover this animated story created with ConteMagiqueIA! ✨",

  loginRequired: "Sign in required",
  loginRequiredShare:
    "Sign in to share this video.",

  shareImpossible: "Unable to share",
  shareError:
    "The video could not be shared.",
  shareLinkMissing:
    "The sharing link for this video could not be found.",

  removeConfirmTitle: "Remove this video?",
  deleteConfirmTitle: "Delete this video?",

  removeConfirmMessage:
    "This video will be removed from My videos. The creator's original video will not be deleted.",
  deleteConfirmMessage:
    "This video will be deleted from My videos.",

  removeAction: "Remove",
  deleteAction: "Delete",

  removedTitle: "Video removed",
  removedMessage:
    "The video has been removed from My videos. The original video was not deleted.",

  deletedTitle: "Video deleted",
  deletedMessage:
    "The animated story has been deleted from My videos.",

  deleteImpossible: "Unable to delete",
  removeError:
    "The video could not be removed. Please try again in a few moments.",
  deleteError:
    "The video could not be deleted. Please try again in a few moments.",
},

    player: {
  title: "Your story",
  scene: "Scene",

  textStory: "Text story",
  textStoryFullscreen: "This story is available without images.",
  readingWithoutImage: "Reading without images",

  styleMagic: "✨ Magical style",
  realistic: "🌍 Realistic",
  comic: "📖 Comic",

  forest: "🌳 Forest",
  ocean: "🌊 Ocean",
  night: "🌙 Night",
  danger: "⚠️ Danger",
  calm: "🕊️ Calm",
  victory: "🏆 Victory",
  magic: "✨ Magic",

  readAI: "AI narration",
  readingAI: "AI narration...",
  autoPlay: "Auto play",
  autoPlaying: "Playing...",
  fullscreen: "Fullscreen",

  nightMode: "Night mode",
  nightOn: "Night ON",
  replay: "Replay",

  bedtimeMode: "Bedtime mode",
  bedtimeShort: "Bedtime",

  ambienceOn: "Ambience ON",
  ambienceOff: "Ambience OFF",

  previous: "Back",
  next: "Next",
  stop: "Stop",
  home: "Home",

  report: "Report",
  reportTitle: "Report this content",
  reportSubtitle:
    "Choose the reason that best matches the issue.",
  reportSending: "Sending...",
  reportSentTitle: "Report sent",
  reportSentMessage:
    "Thank you. This content has been reported and may be reviewed.",
  reportError:
    "Unable to send the report right now. Please try again later.",

  reportInappropriate: "Inappropriate or shocking content",
  reportViolence: "Violence or dangerous content",
  reportSexual: "Sexual content",
  reportOther: "Other issue",

  createVideo: "Create my animated story",
  videoCreating: "Creating...",
  createAnimation: "Create animation",

  videoUnavailableTitle: "Animation unavailable",
  videoUnavailableMessage:
    "Only stories with 4 or 6 scenes can currently be turned into an animated story.",

  missingImagesTitle: "Missing illustrations",
  missingImagesMessage:
    "All scenes must have an illustration before creating the animated story.",

  noVideoCreditTitle: "No video credit",
  noVideoCreditMessage:
    "You do not have a video credit yet.",
  getCredit: "Get a credit",

  creditCheckError:
    "Unable to check your video credits. Please try again in a few moments.",

  creditPendingTitle: "Credit activation in progress",
  creditPendingMessage:
    "Your purchase has been confirmed, but your credit is not visible yet. Return to your story in a few seconds and tap “Create my animated story”.",

  purchaseCreditError:
  "Your purchase has been saved, but the video credit could not be verified. Try again from your story.",

  loginRequired: "Sign in required",
  loginRequiredMessage:
    "Sign in to create your animated story.",

  videoCreatedTitle: "Animated story created 🎉",
  videoCreatedMessage: "scenes were animated successfully.",
  later: "Later",
  watchVideo: "🎬 Watch video",

  videoCreationImpossible: "Unable to create",
  videoCreationError:
    "An error occurred while creating the animated story.",

  videoModalTitle: "🎬 Create my animated story",
  storyContains: "Your story contains",
  scenes: "scenes.",
  estimatedDuration: "Estimated duration: about",
  seconds: "seconds.",
  oneVideoCredit: "1 video credit",

  cancel: "Cancel",
},

    continueAdventure: {
  backHome: "← Home",

  title: "Continue the adventure",
  subtitle:
    "You've discovered the first ConteMagiqueIA stories. The magic is only beginning.",

  welcomeGift: "Your welcome gift",
  welcomeGiftDescription:
    "Create your free account and receive your first story pack.",

  freePackTitle: "A free story pack",
  freePackText:
    "Start a new collection of adventures.",

  twoStoriesTitle: "2 new stories",
  twoStoriesText:
    "Create two more personalized stories.",

  savedStoriesTitle: "Your saved stories",
  savedStoriesText:
    "Easily find the adventures you've created.",

  createFreeAccount: "Create my free account",
  alreadyHaveAccount: "I already have an account",

  noCardRequired:
    "🔒 No credit card required.",
},

    account: {
  title: "My account",
  logout: "Sign out",

  home: "← Home",
  welcomeBack: "Welcome back ✨",
  createAccountTitle: "Create your account ✨",
  loginSubtitle: "Sign in to continue the adventure",
  registerSubtitle: "Join the world of ConteMagiqueIA",

  login: "Sign in",
  createAccount: "Create an account",
  createMyAccount: "Create my account",

  firstName: "First name",
  email: "Email address",
  password: "Password",
  forgotPassword: "Forgot your password?",

  acceptLegal:
    "I have read and accept the Terms of Use and acknowledge that I have read the Privacy Policy.",
  readTerms: "Read the Terms of Use",
  privacyPolicy: "Privacy Policy",

  noAccount: "Don't have an account yet? ",
  alreadyAccount: "Already have an account? ",

  missingInfo: "Missing information",
  loginMissingInfo:
    "Enter your email address and password.",
  registerMissingInfo: "Complete all fields.",

  passwordTooShort: "Password too short",
  passwordMinLength:
    "The password must contain at least 6 characters.",

  validationRequired: "Confirmation required",
  legalRequired:
    "You must accept the Terms of Use and Privacy Policy.",

  loginImpossible: "Unable to sign in",
  registerImpossible: "Unable to create account",

  invalidEmail: "The email address is not valid.",
  missingPassword: "Enter your password.",
  weakPassword:
    "The password must contain at least 6 characters.",
  emailAlreadyUsed:
    "An account already exists with this email address.",
  invalidCredential:
    "The email address or password is incorrect.",
  userNotFound:
    "No account matches this email address.",
  wrongPassword: "The password is incorrect.",
  tooManyRequests:
    "Too many attempts. Please try again in a few minutes.",
  networkError: "Internet connection problem.",
  defaultLoginError: "Unable to sign in.",
  defaultRegisterError: "Unable to create the account.",

  welcomeGift: "Welcome 🎁",
  welcomeGiftMessage:
    "Your account is ready and you've received 2 free text stories. You can also purchase a story pack now.",
  createStory: "Create a story",
  viewPacks: "View story packs",

  forgotPasswordTitle: "Forgot your password?",
forgotPasswordSubtitle:
  "Enter your email address to receive a password reset link.",
forgotPasswordEmail: "Email",
forgotPasswordSend: "Send reset link",
forgotPasswordBack: "Back",

forgotPasswordMissingEmail:
  "Enter your email address.",
forgotPasswordSentTitle: "Email sent 📩",
forgotPasswordSentMessage:
  "If this account exists, you will receive a link to reset your password.",
forgotPasswordSendError:
  "Unable to send the email.",

  profileLoading: "Loading your account...",
profileLoadImpossible: "Unable to load",
profileLoadError:
  "Unable to retrieve your account information right now.",

nameRequired: "Name required",
nameRequiredMessage: "Enter a name before saving.",
nameChanged: "Name updated",
nameChangedMessage: "Your display name has been saved.",
nameChangeError: "Unable to update your name right now.",

mailUnavailable: "Email app unavailable",
contactAt: "You can contact us at:",
genericError: "An error occurred",

deleteAccount: "Delete my account",
deleteAccountConfirm:
  "This action is permanent.\n\nYour profile and the data linked to your account will be deleted.\n\nDo you really want to continue?",
noConnectedUser: "No signed-in user was found.",
recentLoginRequired: "Sign-in required",
recentLoginMessage:
  "For security reasons, sign out and sign in again before deleting your account.",
deleteAccountError:
  "Your account could not be deleted.",

logoutConfirm:
  "Do you really want to sign out of your account?",
logoutError:
  "Unable to sign out right now.",

you: "you",
notProvided: "Not provided",
notAvailable: "Not available",

roleAdmin: "Administrator",
roleUser: "User",
roleGuest: "Guest",

noStoryRemaining: "No stories remaining",
oneStoryRemaining: "1 story remaining",
storiesRemaining: "stories remaining",

noPurchase: "No purchases",
onePurchase: "1 purchase",
purchases: "purchases",

hello: "Hello",
profileSubtitle:
  "Find your ConteMagiqueIA account information here.",

incompleteProfile: "Incomplete profile",
incompleteProfileMessage:
  "Your Firebase account exists, but its Firestore profile could not be found.",

myInformation: "My information",
displayName: "Display name",
edit: "Edit",
accountCreated: "Account created on",
accountType: "Account type",

myPacks: "My story packs",
textPack: "Text Story Pack",
textPackDescription: "Stories without illustrations",
illustratedPack: "Illustrated Story Pack",
illustratedPackDescription: "Stories with text and images",
buyPack: "Buy a story pack",

myActivity: "My activity",
lastLogin: "Last sign-in",
lastStoryCreated: "Last story created",
noStoryCreated: "No story created",

myPurchases: "My purchases",
mySpace: "My space",
myStories: "My stories",

legalCenter: "Legal center",
legalCenterSubtitle:
  "Terms of Use, privacy policy, legal information...",
contactUs: "Contact us",

version: "Version",

editNameTitle: "Edit my name",
displayNamePlaceholder: "Your display name",
},

    videoPlayer: {
  title: "🎬 My animated story",

  loading: "Loading animated story...",

  videoNotFound: "Video not found",
  videoNotFoundMessage:
    "No video address was provided to this page.",

  back: "← Back",

  pause: "⏸️ Pause",
  play: "▶️ Play",
  replay: "🔄 Replay",

  error: "Error",
  playbackError: "Unable to play video",
  playbackErrorMessage:
    "Unable to play the animated story.",

  technicalDetails: "⚠️ Technical details",
},

    premium: {
  back: "← Back",
  title: "Keep the magic going ✨",
  subtitle:
    "Choose your pack and keep creating personalized stories.",

  benefitNarration: "🔊 Immersive AI narration",
  benefitBedtime: "🌙 Magical bedtime mode",
  benefitSaved: "💾 Saved stories",
  benefitIllustrations: "🎨 Illustrations depending on the pack",

  storeConnecting: "Connecting to",

  textPackTitle: "Text Story Pack",
  textPackDescription:
    "15 text-only stories. Perfect for enjoying narration without generating illustrations.",
  chooseTextPack: "Choose the text story pack",

  mostMagical: "The most magical",
  illustratedPackTitle: "Illustrated Story Pack",
  illustratedPackDescription:
    "15 complete stories with text and illustrations. The most immersive ConteMagiqueIA experience.",
  chooseIllustratedPack: "Choose the illustrated story pack",

  fourScenes: "🎬 4 scenes",
  shortVideoTitle: "Short Animated Story",
  shortVideoDescription:
    "Turn a 4-scene illustrated story into an animated story of about 20 seconds.",
  buyShortVideo: "🎬 Buy the Short Animated Story",

  sixScenes: "🎬 6 scenes",
  mediumVideoTitle: "Medium Animated Story",
  mediumVideoDescription:
    "Turn a 6-scene illustrated story into an animated story of about 30 seconds.",
  buyMediumVideo: "🎬 Buy the Medium Animated Story",

  securePayment: "Secure payment via",
  packContains: "Each pack contains 15 creations.",

  shortVideoActivated: "Short Animated Story activated 🎬",
  mediumVideoActivated: "Medium Animated Story activated 🎬",
  shortVideoAdded:
    "Your 4-scene video credit has been added. Now choose the story you want to turn into an animated story.",
  mediumVideoAdded:
    "Your 6-scene video credit has been added. Now choose the story you want to turn into an animated story.",
  chooseStory: "Choose my story",

  textPackActivated: "Text Story Pack activated 🎉",
  textPackAdded:
    "15 text stories have been added to your account.",

  illustratedPackActivated: "Illustrated Story Pack activated 🎉",
  illustratedPackAdded:
    "15 illustrated stories have been added to your account.",

  createStory: "Create a story",

  purchaseValidated: "Purchase confirmed 🎉",
  purchaseAdded:
    "Your purchase has been added to your account.",

  purchaseNotCompleted: "Purchase not completed",
  purchaseValidationError:
    "Unable to validate the purchase. Do not immediately try the payment again.",

  paymentImpossible: "Payment unavailable",
  paymentError:
    "The payment could not be completed.",

  accountRequired: "Account required",
  accountRequiredMessage:
    "Create your free account to purchase and keep your story packs.",
  createAccount: "Create my account",
  alreadyHaveAccount: "I already have an account",

  storeUnavailable: "unavailable",
  storeNotReady:
    "The connection to the store is not ready yet. Please try again in a few seconds.",

  productUnavailable: "Product unavailable",
  productUnavailableMessage:
    "This product is currently unavailable.",

  storeOpenError:
    "Unable to open the store.",
},
  },

  es: {
    common: {
      appName: "ConteMagiqueIA",
      close: "Cerrar",
      cancel: "Cancelar",
      confirm: "Confirmar",
      delete: "Eliminar",
      save: "Guardar",
      share: "Compartir",
      back: "Volver",
      next: "Siguiente",
      loading: "Cargando...",
      error: "Error",
    },

    home: {
      introSubtitle: "Historias mágicas para niños ✨",
      subtitle:
        "Crea historias mágicas con IA, imágenes y una narración inmersiva ✨",
      hello: "Hola",
      createStory: "Crear una historia",
      savedStories: "Mis historias",
      savedVideos: "🎬 Mis vídeos",
      account: "👤 Mi cuenta",
      login: "🔐 Iniciar sesión",
      chooseLanguage: "Elegir idioma",
      helpTitle: "¿Cómo funciona? ✨",
helpCreateTitle: "📖 Crear una historia",
helpCreateText:
  "Elige tu idea, el tipo de historia y el narrador.",

helpIllustratedTitle: "🎨 Historia ilustrada",
helpIllustratedText:
  "Para obtener imágenes y crear un dibujo animado, elige una historia ilustrada.",

helpVideoTitle: "🎬 Crear un dibujo animado",
helpVideoText:
  "Para crear un dibujo animado, primero crea una historia ilustrada. Después abre tu historia y pulsa «Crear mi dibujo animado».",

helpSavedTitle: "❤️ Encuentra tus creaciones",
helpSavedText:
  "Encuentra tus historias en «Mis historias» y tus dibujos animados en «Mis vídeos».",

helpAudioTitle: "🔊 Narración IA",
helpAudioText:
  "Escucha tu historia con el narrador elegido y utiliza el modo dormir para una lectura más suave.",

helpLanguageTitle: "🌍 Idioma",
helpLanguageText:
  "Elige Français, English o Español desde la pantalla de inicio. La historia y la narración utilizarán el idioma seleccionado.",

helpUnderstood: "Entendido",
    },

    languages: {
      fr: "Français",
      en: "English",
      es: "Español",
    },

    createStory: {
    guestWelcomeTitle: "✨ Bienvenido a ConteMagiqueIA",
guestWelcomeMessage:
  "Puedes descubrir 2 historias gratis:\n\n📖 La primera en texto\n🎨 La segunda con ilustraciones\n\nDespués, podrás crear una cuenta y recibir 2 historias de texto adicionales gratis.",
guestWelcomeButton: "Empezar",

emptyTextPack: "Tu paquete de Texto ya no contiene historias.",
emptyIllustratedPack: "Tu paquete Ilustrado ya no contiene historias.",
textPackChoice: "📖 Texto",
illustratedPackChoice: "🎨 Ilustrado",

  title: "Habla con la IA",
  subtitle: "Escribe tu idea para la historia ✨",

  activePack: "Cuaderno activo",
  textPack: "📖 Cuaderno de texto",
  illustratedPack: "🎨 Cuaderno ilustrado",
  textShort: "📖 Texto",
  illustratedShort: "🎨 Ilustrado",
  changePack: "Pulsa para cambiar de cuaderno",
  buyPack: "Comprar un cuaderno",
  choosePack: "Elegir un cuaderno",
  choosePackMessage:
    "El cuaderno seleccionado se utilizará para la próxima historia.",

  emptyPack: "Cuaderno vacío",

  remainingStory: "historia restante",
  remainingStories: "historias restantes",

  ideaPlaceholder:
    "Ej.: un dragón amable en una isla mágica...",

  optionalPhoto:
    "📸 Foto de referencia opcional",

  photoHelp:
    "Utiliza una foto clara en la que las personas o elementos importantes sean visibles.",

  addPhoto:
    "📷 Añadir una foto a mi historia",

  changePhoto: "📷 Cambiar la foto",
  removePhoto: "Eliminar la foto",

  photoAdded:
    "Foto de referencia añadida ✓",

  photoTitle: "📷 Añadir una foto",

  photoDescription:
    "Añade una foto de referencia para personalizar las ilustraciones: niño, padre, familia, hermanos, mascota, peluche u otro elemento importante.",

  takePhoto: "Hacer una foto",
  chooseGallery: "Elegir de la galería",

  permissionRequired: "Permiso necesario",

  galleryPermission:
    "Permite el acceso a las fotos para elegir una imagen.",

  cameraPermission:
    "Permite el acceso a la cámara para hacer una foto.",

  photoSelectionError:
    "No se pudo seleccionar la foto.",

  cameraError:
    "No se pudo hacer la foto.",

  cartoonActivated:
    "Estilo Cartoon activado 🎨",

  realisticPhotoBlocked:
    "El estilo Realista no está disponible cuando se utiliza una foto.",

  styleUnavailable:
    "Estilo no disponible",

  imageStyleTitle:
    "Estilo de las imágenes",

  cartoon: "🎨 Cartoon",
  fantasy: "🧙 Fantasía",
  realistic: "🌍 Realista",
  comic: "📖 Cómic",

  storyTypeTitle:
    "Tipo de historia",

  funny: "🤣 Divertida",
  adventure: "⚔️ Aventura",
  magic: "🧙 Mágica",
  mystery: "👻 Misterio",

  lengthTitle: "Duración",

  short: "⚡ Corta",
  medium: "📖 Media",
  long: "🌙 Larga",
  comingSoon: "Próximamente",

  narratorTitle:
    "¿Quién cuenta la historia?",

  eliseSubtitle:
    "Dulce y expresiva",

  arthurSubtitle:
    "Cálido y tranquilizador",

  merlinSubtitle:
    "Misterioso y mágico",

  lunaSubtitle:
    "Alegre y encantadora",

  bedtimeSubtitle:
    "Lento y relajante",

  generate:
    "Generar historia",

  generating:
    "Generando...",

  creatingStory:
    "Creando la historia...",

  creatingImage:
    "Creando imagen",

  backHome:
    "Volver al inicio",

  missingIdea:
    "Escribe una idea antes de generar una historia.",

  profileNotFound:
    "Perfil no encontrado",

  profileNotFoundMessage:
    "Tu cuenta está conectada, pero no se ha encontrado tu perfil.",

  packsFinished:
    "📚 Tus cuadernos se han terminado",

  packsFinishedMessage:
    "Ya no tienes historias disponibles. Elige un nuevo cuaderno para continuar.",

  later: "Más tarde",
  viewPacks: "Ver cuadernos",

  surpriseTitle:
    "🎨 Te espera una sorpresa",

  surpriseMessage:
    "Esta segunda historia estará ilustrada. Después de esta aventura podrás crear una cuenta y recibir 2 historias de texto gratuitas.",

  discoverIllustrations:
    "Descubrir las ilustraciones",

  generationError:
    "No se pudo generar la historia.",

  readStory:
    "Leer mi historia",

  buyAnotherPack:
    "Comprar un cuaderno",
},

    savedStories: {
  title: "Mis historias",
  all: "Todas",
  favorites: "Favoritas ❤️",
  loading: "Cargando tus historias…",
  empty: "Aún no hay historias guardadas.",
  emptyFavorites: "Aún no hay historias favoritas.",
  defaultStoryTitle: "Historia mágica",
  scene: "escena",
  scenes: "escenas",
  read: "Leer",
  delete: "Eliminar",
  createVideo: "🎬 Crear el dibujo animado",
  backHome: "Volver al inicio",

  videoUnavailableTitle: "Dibujo animado no disponible",
  videoUnavailableMessage:
    "Solo las historias de 4 o 6 escenas pueden convertirse en un dibujo animado.",

  favoriteSyncError:
    "No se pudo sincronizar el favorito.",
  favoriteUpdateError:
    "No se pudo modificar este favorito en este momento.",

  loginRequired: "Inicio de sesión necesario",
  loginRequiredShare:
    "Inicia sesión para compartir esta historia.",

  shareTitle: "Una historia de ConteMagiqueIA",
  shareMessage:
    "✨ Descubre esta historia creada con ConteMagiqueIA!",
  shareImpossible: "No se pudo compartir",
  shareError:
    "No se pudo compartir la historia.",

  deleteTitle: "Eliminar",
  deleteConfirm:
    "¿Quieres eliminar realmente esta historia?",
  cloudDeleteError:
    "No se pudo eliminar la historia de la nube.",
  deleteError:
    "No se pudo eliminar esta historia.",
},

    savedVideos: {
  title: "🎬 Mis vídeos",
  loading: "Cargando tus vídeos...",
  loadingErrorTitle: "No se pudo cargar",
  loadingErrorMessage: "No se pudieron cargar tus vídeos.",

  emptyTitle: "Ningún vídeo",
  emptyMessage:
    "Tus dibujos animados creados o recibidos aparecerán aquí.",

  unknownDate: "Fecha desconocida",

  scene: "escena",
  scenes: "escenas",

  receivedBadge: "🎁 Recibido",
  receivedVideo: "🎁 Dibujo animado recibido",
  animatedVideo: "🎬 Dibujo animado",

  watch: "▶️ Ver",
  share: "📤 Compartir",
  remove: "🗑️ Retirar",
  delete: "🗑️ Eliminar",

  shareTitle: "Dibujo animado ConteMagiqueIA",
  shareMessage:
    "🎬 ¡Descubre este dibujo animado creado con ConteMagiqueIA! ✨",

  loginRequired: "Inicio de sesión necesario",
  loginRequiredShare:
    "Inicia sesión para compartir este vídeo.",

  shareImpossible: "No se pudo compartir",
  shareError:
    "No se pudo compartir el vídeo.",
  shareLinkMissing:
    "No se encontró el enlace para compartir este vídeo.",

  removeConfirmTitle: "¿Retirar este vídeo?",
  deleteConfirmTitle: "¿Eliminar este vídeo?",

  removeConfirmMessage:
    "Este vídeo se retirará de Mis vídeos. El vídeo original de su creador no será eliminado.",
  deleteConfirmMessage:
    "Este vídeo se eliminará de Mis vídeos.",

  removeAction: "Retirar",
  deleteAction: "Eliminar",

  removedTitle: "Vídeo retirado",
  removedMessage:
    "El vídeo se ha retirado de Mis vídeos. El original no se ha eliminado.",

  deletedTitle: "Vídeo eliminado",
  deletedMessage:
    "El dibujo animado se ha eliminado correctamente de Mis vídeos.",

  deleteImpossible: "No se pudo eliminar",
  removeError:
    "No se pudo retirar el vídeo. Inténtalo de nuevo en unos instantes.",
  deleteError:
    "No se pudo eliminar el vídeo. Inténtalo de nuevo en unos instantes.",
},

    player: {
  title: "Tu historia",
  scene: "Escena",

  textStory: "Historia de texto",
  textStoryFullscreen: "Esta historia está disponible sin imágenes.",
  readingWithoutImage: "Lectura sin imágenes",

  styleMagic: "✨ Estilo mágico",
  realistic: "🌍 Realista",
  comic: "📖 Cómic",

  forest: "🌳 Bosque",
  ocean: "🌊 Mar",
  night: "🌙 Noche",
  danger: "⚠️ Peligro",
  calm: "🕊️ Calma",
  victory: "🏆 Victoria",
  magic: "✨ Magia",

  readAI: "Narración IA",
  readingAI: "Narración IA...",
  autoPlay: "Lectura automática",
  autoPlaying: "En curso...",
  fullscreen: "Pantalla completa",

  nightMode: "Modo noche",
  nightOn: "Noche ON",
  replay: "Repetir",

  bedtimeMode: "Modo dormir",
  bedtimeShort: "Dormir",

  ambienceOn: "Ambiente ON",
  ambienceOff: "Ambiente OFF",

  previous: "Volver",
  next: "Siguiente",
  stop: "Parar",
  home: "Inicio",

  report: "Reportar",
  reportTitle: "Reportar este contenido",
  reportSubtitle:
    "Elige el motivo que mejor corresponda al problema encontrado.",
  reportSending: "Enviando...",
  reportSentTitle: "Reporte enviado",
  reportSentMessage:
    "Gracias. Este contenido ha sido reportado y podrá ser revisado.",
  reportError:
    "No se pudo enviar el reporte en este momento. Inténtalo de nuevo más tarde.",

  reportInappropriate: "Contenido inapropiado o impactante",
  reportViolence: "Violencia o contenido peligroso",
  reportSexual: "Contenido sexual",
  reportOther: "Otro problema",

  createVideo: "Crear mi dibujo animado",
  videoCreating: "Creando...",
  createAnimation: "Crear el dibujo animado",

  videoUnavailableTitle: "Dibujo animado no disponible",
  videoUnavailableMessage:
    "Por ahora, solo las historias de 4 o 6 escenas pueden convertirse en dibujo animado.",

  missingImagesTitle: "Faltan ilustraciones",
  missingImagesMessage:
    "Todas las escenas deben tener una ilustración antes de crear el dibujo animado.",

  noVideoCreditTitle: "Sin crédito de vídeo",
  noVideoCreditMessage:
    "Todavía no tienes crédito para crear un dibujo animado.",
  getCredit: "Obtener un crédito",

  creditCheckError:
    "No se pudieron verificar tus créditos de vídeo. Inténtalo de nuevo en unos instantes.",

  creditPendingTitle: "Activación del crédito en curso",
  creditPendingMessage:
    "Tu compra ha sido confirmada, pero tu crédito todavía no aparece. Vuelve a tu historia en unos segundos y pulsa «Crear mi dibujo animado».",

  purchaseCreditError:
    "Tu compra se ha guardado, pero no se pudo verificar el crédito de vídeo. Inténtalo de nuevo desde tu historia.",

  loginRequired: "Inicio de sesión necesario",
  loginRequiredMessage:
    "Inicia sesión para crear tu dibujo animado.",

  videoCreatedTitle: "Dibujo animado creado 🎉",
  videoCreatedMessage: "escenas se animaron correctamente.",
  later: "Más tarde",
  watchVideo: "🎬 Ver vídeo",

  videoCreationImpossible: "No se pudo crear",
  videoCreationError:
    "Se produjo un error durante la creación del dibujo animado.",

  videoModalTitle: "🎬 Crear mi dibujo animado",
  storyContains: "Tu historia contiene",
  scenes: "escenas.",
  estimatedDuration: "Duración estimada: aproximadamente",
  seconds: "segundos.",
  oneVideoCredit: "1 crédito de vídeo",

  cancel: "Cancelar",
},

    videoPlayer: {
  title: "🎬 Mi dibujo animado",

  loading: "Cargando el dibujo animado...",

  videoNotFound: "Vídeo no encontrado",
  videoNotFoundMessage:
    "No se ha proporcionado ninguna dirección de vídeo a esta página.",

  back: "← Volver",

  pause: "⏸️ Pausa",
  play: "▶️ Reproducir",
  replay: "🔄 Volver a reproducir",

  error: "Error",
  playbackError: "No se pudo reproducir el vídeo",
  playbackErrorMessage:
    "No se pudo reproducir el dibujo animado.",

  technicalDetails: "⚠️ Detalles técnicos",
},

    continueAdventure: {
  backHome: "← Inicio",

  title: "Continúa la aventura",
  subtitle:
    "Has descubierto las primeras historias de ConteMagiqueIA. La magia acaba de comenzar.",

  welcomeGift: "Tu regalo de bienvenida",
  welcomeGiftDescription:
    "Crea tu cuenta gratis y recibe tu primer pack de historias.",

  freePackTitle: "Un pack de regalo",
  freePackText:
    "Comienza una nueva colección de aventuras.",

  twoStoriesTitle: "2 nuevas historias",
  twoStoriesText:
    "Crea dos historias personalizadas adicionales.",

  savedStoriesTitle: "Tus historias guardadas",
  savedStoriesText:
    "Encuentra fácilmente las aventuras que has creado.",

  createFreeAccount: "Crear mi cuenta gratis",
  alreadyHaveAccount: "Ya tengo una cuenta",

  noCardRequired:
    "🔒 No se requiere tarjeta bancaria.",
},

    account: {
  title: "Mi cuenta",
  logout: "Cerrar sesión",

  home: "← Inicio",
  welcomeBack: "Bienvenido de nuevo ✨",
  createAccountTitle: "Crea tu cuenta ✨",
  loginSubtitle: "Inicia sesión para continuar la aventura",
  registerSubtitle: "Únete al universo de ConteMagiqueIA",

  login: "Iniciar sesión",
  createAccount: "Crear una cuenta",
  createMyAccount: "Crear mi cuenta",

  firstName: "Nombre",
  email: "Correo electrónico",
  password: "Contraseña",
  forgotPassword: "¿Has olvidado tu contraseña?",

  acceptLegal:
    "He leído y acepto las Condiciones de Uso y reconozco haber leído la Política de Privacidad.",
  readTerms: "Leer las Condiciones de Uso",
  privacyPolicy: "Política de Privacidad",

  noAccount: "¿Aún no tienes una cuenta? ",
  alreadyAccount: "¿Ya tienes una cuenta? ",

  missingInfo: "Faltan datos",
  loginMissingInfo:
    "Introduce tu correo electrónico y tu contraseña.",
  registerMissingInfo: "Completa todos los campos.",

  passwordTooShort: "Contraseña demasiado corta",
  passwordMinLength:
    "La contraseña debe contener al menos 6 caracteres.",

  validationRequired: "Confirmación necesaria",
  legalRequired:
    "Debes aceptar las Condiciones de Uso y la Política de Privacidad.",

  loginImpossible: "No se pudo iniciar sesión",
  registerImpossible: "No se pudo crear la cuenta",

  invalidEmail: "El correo electrónico no es válido.",
  missingPassword: "Introduce tu contraseña.",
  weakPassword:
    "La contraseña debe contener al menos 6 caracteres.",
  emailAlreadyUsed:
    "Ya existe una cuenta con este correo electrónico.",
  invalidCredential:
    "El correo electrónico o la contraseña son incorrectos.",
  userNotFound:
    "No existe ninguna cuenta con este correo electrónico.",
  wrongPassword: "La contraseña es incorrecta.",
  tooManyRequests:
    "Demasiados intentos. Inténtalo de nuevo en unos minutos.",
  networkError: "Problema de conexión a Internet.",
  defaultLoginError: "No se pudo iniciar sesión.",
  defaultRegisterError: "No se pudo crear la cuenta.",

  welcomeGift: "Bienvenido 🎁",
  welcomeGiftMessage:
    "Tu cuenta está lista y has recibido 2 historias de texto gratis. También puedes comprar un pack de historias ahora.",
  createStory: "Crear una historia",
  viewPacks: "Ver los packs",

  forgotPasswordTitle: "¿Has olvidado tu contraseña?",
forgotPasswordSubtitle:
  "Introduce tu correo electrónico para recibir un enlace de restablecimiento.",
forgotPasswordEmail: "Correo electrónico",
forgotPasswordSend: "Enviar el enlace",
forgotPasswordBack: "Volver",

forgotPasswordMissingEmail:
  "Introduce tu correo electrónico.",
forgotPasswordSentTitle: "Correo enviado 📩",
forgotPasswordSentMessage:
  "Si esta cuenta existe, recibirás un enlace para restablecer tu contraseña.",
forgotPasswordSendError:
  "No se pudo enviar el correo electrónico.",

  profileLoading: "Cargando tu cuenta...",
profileLoadImpossible: "No se pudo cargar",
profileLoadError:
  "No se pudo recuperar la información de tu cuenta en este momento.",

nameRequired: "Nombre obligatorio",
nameRequiredMessage: "Introduce un nombre antes de guardar.",
nameChanged: "Nombre actualizado",
nameChangedMessage: "Tu nombre visible se ha guardado correctamente.",
nameChangeError: "No se pudo modificar tu nombre en este momento.",

mailUnavailable: "Aplicación de correo no disponible",
contactAt: "Puedes contactarnos en:",
genericError: "Se ha producido un error",

deleteAccount: "Eliminar mi cuenta",
deleteAccountConfirm:
  "Esta acción es definitiva.\n\nTu perfil y los datos vinculados a tu cuenta serán eliminados.\n\n¿Realmente quieres continuar?",
noConnectedUser: "No se encontró ningún usuario conectado.",
recentLoginRequired: "Es necesario volver a iniciar sesión",
recentLoginMessage:
  "Por motivos de seguridad, cierra sesión y vuelve a iniciarla antes de eliminar tu cuenta.",
deleteAccountError:
  "No se pudo eliminar tu cuenta.",

logoutConfirm:
  "¿Realmente quieres cerrar sesión en tu cuenta?",
logoutError:
  "No se pudo cerrar la sesión en este momento.",

you: "tú",
notProvided: "No indicado",
notAvailable: "No disponible",

roleAdmin: "Administrador",
roleUser: "Usuario",
roleGuest: "Invitado",

noStoryRemaining: "No quedan historias",
oneStoryRemaining: "Queda 1 historia",
storiesRemaining: "historias restantes",

noPurchase: "Ninguna compra",
onePurchase: "1 compra",
purchases: "compras",

hello: "Hola",
profileSubtitle:
  "Encuentra aquí la información de tu cuenta de ConteMagiqueIA.",

incompleteProfile: "Perfil incompleto",
incompleteProfileMessage:
  "Tu cuenta de Firebase existe, pero no se encontró su perfil de Firestore.",

myInformation: "Mi información",
displayName: "Nombre visible",
edit: "Modificar",
accountCreated: "Cuenta creada el",
accountType: "Tipo de cuenta",

myPacks: "Mis packs",
textPack: "Pack de Texto",
textPackDescription: "Historias sin ilustraciones",
illustratedPack: "Pack Ilustrado",
illustratedPackDescription: "Historias con texto e imágenes",
buyPack: "Comprar un pack",

myActivity: "Mi actividad",
lastLogin: "Último inicio de sesión",
lastStoryCreated: "Última historia creada",
noStoryCreated: "Ninguna historia creada",

myPurchases: "Mis compras",
mySpace: "Mi espacio",
myStories: "Mis historias",

legalCenter: "Centro jurídico",
legalCenterSubtitle:
  "Condiciones de Uso, privacidad, información legal...",
contactUs: "Contactarnos",

version: "Versión",

editNameTitle: "Modificar mi nombre",
displayNamePlaceholder: "Tu nombre visible",
},

    premium: {
  back: "← Volver",
  title: "Continúa la magia ✨",
  subtitle:
    "Elige tu pack y sigue creando historias personalizadas.",

  benefitNarration: "🔊 Narración IA inmersiva",
  benefitBedtime: "🌙 Modo dormir mágico",
  benefitSaved: "💾 Historias guardadas",
  benefitIllustrations: "🎨 Ilustraciones según el pack",

  storeConnecting: "Conectando con",

  textPackTitle: "Pack de historias de texto",
  textPackDescription:
    "15 historias solo con texto. Ideal para disfrutar de la narración sin generar ilustraciones.",
  chooseTextPack: "Elegir el pack de texto",

  mostMagical: "El más mágico",
  illustratedPackTitle: "Pack de historias ilustradas",
  illustratedPackDescription:
    "15 historias completas con texto e ilustraciones. La experiencia más inmersiva de ConteMagiqueIA.",
  chooseIllustratedPack: "Elegir el pack ilustrado",

  fourScenes: "🎬 4 escenas",
  shortVideoTitle: "Dibujo animado corto",
  shortVideoDescription:
    "Transforma una historia ilustrada de 4 escenas en un dibujo animado de unos 20 segundos.",
  buyShortVideo: "🎬 Comprar el dibujo animado corto",

  sixScenes: "🎬 6 escenas",
  mediumVideoTitle: "Dibujo animado medio",
  mediumVideoDescription:
    "Transforma una historia ilustrada de 6 escenas en un dibujo animado de unos 30 segundos.",
  buyMediumVideo: "🎬 Comprar el dibujo animado medio",

  securePayment: "Pago seguro mediante",
  packContains: "Cada pack contiene 15 creaciones.",

  shortVideoActivated: "Dibujo animado corto activado 🎬",
  mediumVideoActivated: "Dibujo animado medio activado 🎬",
  shortVideoAdded:
    "Tu crédito de vídeo de 4 escenas se ha añadido correctamente. Ahora elige la historia que quieres transformar en un dibujo animado.",
  mediumVideoAdded:
    "Tu crédito de vídeo de 6 escenas se ha añadido correctamente. Ahora elige la historia que quieres transformar en un dibujo animado.",
  chooseStory: "Elegir mi historia",

  textPackActivated: "Pack de texto activado 🎉",
  textPackAdded:
    "Se han añadido 15 historias de texto a tu cuenta.",

  illustratedPackActivated: "Pack ilustrado activado 🎉",
  illustratedPackAdded:
    "Se han añadido 15 historias ilustradas a tu cuenta.",

  createStory: "Crear una historia",

  purchaseValidated: "Compra confirmada 🎉",
  purchaseAdded:
    "Tu compra se ha añadido a tu cuenta.",

  purchaseNotCompleted: "Compra no finalizada",
  purchaseValidationError:
    "No se pudo validar la compra. No vuelvas a intentar el pago inmediatamente.",

  paymentImpossible: "Pago no disponible",
  paymentError:
    "No se pudo realizar el pago.",

  accountRequired: "Cuenta necesaria",
  accountRequiredMessage:
    "Crea gratuitamente tu cuenta para comprar y conservar tus packs de historias.",
  createAccount: "Crear mi cuenta",
  alreadyHaveAccount: "Ya tengo una cuenta",

  storeUnavailable: "no disponible",
  storeNotReady:
    "La conexión con la tienda todavía no está lista. Inténtalo de nuevo en unos segundos.",

  productUnavailable: "Producto no disponible",
  productUnavailableMessage:
    "Este producto no está disponible en este momento.",

  storeOpenError:
    "No se pudo abrir la tienda.",
},
  },
} as const;

export async function saveLanguage(
  language: AppLanguage
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      language
    );
  } catch (error) {
    console.log(
      "Erreur sauvegarde langue :",
      error
    );
  }
}

export async function loadLanguage(): Promise<AppLanguage> {
  try {
    const savedLanguage = await AsyncStorage.getItem(
      LANGUAGE_STORAGE_KEY
    );

    if (
      savedLanguage === "fr" ||
      savedLanguage === "en" ||
      savedLanguage === "es"
    ) {
      return savedLanguage;
    }

    return "fr";
  } catch (error) {
    console.log(
      "Erreur chargement langue :",
      error
    );

    return "fr";
  }
}

export function getLanguageFlag(
  language: AppLanguage
): string {
  if (language === "en") {
    return "🇬🇧";
  }

  if (language === "es") {
    return "🇪🇸";
  }

  return "🇫🇷";
}

export function getTranslations(
  language: AppLanguage
) {
  return translations[language];
}