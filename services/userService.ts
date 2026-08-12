import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import type { PackType, UserProfile } from "../types/user";
import { db } from "./firebase";

type CreateUserProfileParams = {
  uid: string;
  displayName: string;
  email: string;

  legal?: {
    termsAccepted: boolean;
    termsVersion: string;
    privacyAcknowledged: boolean;
    privacyVersion: string;
  };
};

const USERS_COLLECTION = "users";

function getUserReference(uid: string) {
  return doc(db, USERS_COLLECTION, uid);
}

/**
 * Crée le profil Firestore d'un nouvel utilisateur.
 * Si le profil existe déjà, il n'est pas écrasé.
 */
export async function createUserProfile({
  uid,
  displayName,
  email,
  legal,
}: CreateUserProfileParams): Promise<UserProfile> {
  const userReference = getUserReference(uid);
  const existingProfile = await getDoc(userReference);

  if (existingProfile.exists()) {
    return existingProfile.data() as UserProfile;
  }

  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    uid,
    displayName: displayName.trim(),
    email: email.trim().toLowerCase(),
    role: "user",

    packs: {
      text: {
        storiesRemaining: 0,
        purchases: 0,
      },

      illustrated: {
        storiesRemaining: 0,
        purchases: 0,
      },
    },

    legal: {
      termsAccepted: legal?.termsAccepted ?? false,
      termsVersion: legal?.termsVersion ?? "",
      privacyAcknowledged:
        legal?.privacyAcknowledged ?? false,
      privacyVersion: legal?.privacyVersion ?? "",
      acceptedAt: legal?.termsAccepted ? now : null,
    },

    createdAt: now,
    lastLogin: now,
    lastStoryCreatedAt: null,
  };

  await setDoc(userReference, newProfile);

  return newProfile;
}

/**
 * Récupère le profil Firestore d'un utilisateur.
 */
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userSnapshot = await getDoc(
    getUserReference(uid)
  );

  if (!userSnapshot.exists()) {
    return null;
  }

  return userSnapshot.data() as UserProfile;
}

/**
 * Met à jour la date de dernière connexion.
 */
export async function updateLastLogin(
  uid: string
): Promise<void> {
  await updateDoc(getUserReference(uid), {
    lastLogin: new Date().toISOString(),
  });
}

/**
 * Met à jour le nom affiché.
 */
export async function updateUserDisplayName(
  uid: string,
  displayName: string
): Promise<void> {
  const cleanedDisplayName =
    displayName.trim();

  if (!cleanedDisplayName) {
    throw new Error(
      "Le nom ne peut pas être vide."
    );
  }

  await updateDoc(getUserReference(uid), {
    displayName: cleanedDisplayName,
  });
}

/**
 * Ajoute des histoires à un carnet.
 *
 * countAsPurchase :
 * - true = achat comptabilisé
 * - false = cadeau ou ajout gratuit
 */
export async function addStories(
  uid: string,
  packType: PackType,
  amount: number,
  countAsPurchase = true
): Promise<number> {
  if (
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Le nombre d'histoires à ajouter doit être un entier supérieur à zéro."
    );
  }

  const userReference =
    getUserReference(uid);

  return runTransaction(
    db,
    async (transaction) => {
      const userSnapshot =
        await transaction.get(
          userReference
        );

      if (!userSnapshot.exists()) {
        throw new Error(
          "Profil utilisateur introuvable."
        );
      }

      const profile =
        userSnapshot.data() as UserProfile;

      const currentPack =
        profile.packs?.[packType];

      if (!currentPack) {
        throw new Error(
          "Carnet utilisateur introuvable."
        );
      }

      const newStoriesRemaining =
        currentPack.storiesRemaining +
        amount;

      const updates: Record<
        string,
        number
      > = {
        [`packs.${packType}.storiesRemaining`]:
          newStoriesRemaining,
      };

      if (countAsPurchase) {
        updates[
          `packs.${packType}.purchases`
        ] =
          currentPack.purchases + 1;
      }

      transaction.update(
        userReference,
        updates
      );

      return newStoriesRemaining;
    }
  );
}

/**
 * Vérifie si l'utilisateur possède au moins une histoire
 * dans le carnet demandé.
 */
export async function hasStories(
  uid: string,
  packType: PackType
): Promise<boolean> {
  const profile =
    await getUserProfile(uid);

  if (!profile) {
    return false;
  }

  if (profile.role === "admin") {
    return true;
  }

  return (
    profile.packs[packType]
      .storiesRemaining > 0
  );
}

/**
 * Retire une histoire après une génération réussie.
 */
export async function consumeStory(
  uid: string,
  packType: PackType
): Promise<number> {
  const userReference =
    getUserReference(uid);

  return runTransaction(
    db,
    async (transaction) => {
      const userSnapshot =
        await transaction.get(
          userReference
        );

      if (!userSnapshot.exists()) {
        throw new Error(
          "Profil utilisateur introuvable."
        );
      }

      const profile =
        userSnapshot.data() as UserProfile;

      if (profile.role === "admin") {
        return profile.packs[packType]
          .storiesRemaining;
      }

      const currentRemaining =
        profile.packs[packType]
          .storiesRemaining;

      if (currentRemaining <= 0) {
        throw new Error(
          "Aucune histoire restante dans ce carnet."
        );
      }

      const newStoriesRemaining =
        currentRemaining - 1;

      transaction.update(
        userReference,
        {
          [`packs.${packType}.storiesRemaining`]:
            newStoriesRemaining,

          lastStoryCreatedAt:
            new Date().toISOString(),
        }
      );

      return newStoriesRemaining;
    }
  );
}

/**
 * Met à jour uniquement la date de dernière histoire créée.
 */
export async function updateLastStoryCreated(
  uid: string
): Promise<void> {
  await updateDoc(
    getUserReference(uid),
    {
      lastStoryCreatedAt:
        new Date().toISOString(),
    }
  );
}

/**
 * Supprime le profil Firestore.
 */
export async function deleteUserProfile(
  uid: string
): Promise<void> {
  await deleteDoc(
    getUserReference(uid)
  );
}