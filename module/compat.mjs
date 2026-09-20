/** Puente de compatibilidad entre Foundry VTT 13 y 14. */
export const LegacyActorSheet = foundry.appv1?.sheets?.ActorSheet ?? globalThis.ActorSheet;
export const LegacyItemSheet = foundry.appv1?.sheets?.ItemSheet ?? globalThis.ItemSheet;
export const ActorsCollection = foundry.documents?.collections?.Actors ?? globalThis.Actors;
export const ItemsCollection = foundry.documents?.collections?.Items ?? globalThis.Items;
