import {
    aiContent,
    cguContent,
    childrenContent,
    eulaContent,
    mentionsContent,
    premiumContent,
    privacyContent,
} from "./legal";

export type LegalDocumentId =
  | "cgu"
  | "privacy"
  | "eula"
  | "mentions"
  | "ai"
  | "premium"
  | "children";

export type LegalDocument = {
  id: LegalDocumentId;
  icon: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  version: string;
  updatedAt: string;
  content: string;
};

export const legalDocuments: LegalDocument[] = [
  {
    id: "cgu",
    icon: "📘",
    title: "Conditions Générales d’Utilisation",
    shortTitle: "CGU",
    subtitle:
      "Règles applicables à l’utilisation de ConteMagiqueIA et de ses services.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: cguContent,
  },

  {
    id: "privacy",
    icon: "🔒",
    title: "Politique de confidentialité",
    shortTitle: "Confidentialité",
    subtitle:
      "Informations sur la collecte, l’utilisation et la protection de vos données personnelles.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: privacyContent,
  },

  {
    id: "eula",
    icon: "📜",
    title: "Contrat de licence utilisateur",
    shortTitle: "Licence utilisateur",
    subtitle:
      "Conditions de licence et règles d’utilisation de l’application.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: eulaContent,
  },

  {
    id: "mentions",
    icon: "⚖️",
    title: "Mentions légales",
    shortTitle: "Mentions légales",
    subtitle:
      "Informations relatives à l’éditeur, à l’hébergement et à la responsabilité.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: mentionsContent,
  },

  {
    id: "ai",
    icon: "🤖",
    title: "Politique relative à l’intelligence artificielle",
    shortTitle: "Politique IA",
    subtitle:
      "Principes encadrant l’utilisation de l’intelligence artificielle dans ConteMagiqueIA.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: aiContent,
  },

  {
    id: "premium",
    icon: "💎",
    title: "Conditions des carnets Premium",
    shortTitle: "Conditions Premium",
    subtitle:
      "Conditions applicables à l’achat et à l’utilisation des carnets payants.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: premiumContent,
  },

  {
    id: "children",
    icon: "🛡️",
    title: "Charte de protection des enfants",
    shortTitle: "Protection des enfants",
    subtitle:
      "Engagements de ConteMagiqueIA pour protéger les enfants et accompagner les familles.",
    version: "1.0",
    updatedAt: "10 août 2026",
    content: childrenContent,
  },
];

export function getLegalDocument(
  id: string | string[] | undefined
): LegalDocument | undefined {
  if (!id || Array.isArray(id)) {
    return undefined;
  }

  return legalDocuments.find((document) => document.id === id);
}