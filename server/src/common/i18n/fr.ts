export const FR = {
  ERR_USER_NOT_FOUND: "Utilisateur introuvable",
  ERR_STORE_NOT_FOUND: "Boutique introuvable",
  ERR_CATEGORY_NOT_FOUND: "Catégorie introuvable",
  ERR_SUPPLIER_NOT_FOUND: "Fournisseur introuvable",
  ERR_EXPENSE_NOT_FOUND: "Dépense introuvable",
  ERR_PRODUCT_NOT_FOUND: "Produit introuvable",
  ERR_INVALID_CREDENTIALS: "Nom d'utilisateur ou mot de passe invalide.",
  ERR_PO_TRANSITION: (from: string, to: string) => `Transition ${from} -> ${to} interdite`,
  ERR_STOCK_INSUFFICIENT: 'Stock insuffisant',
  ERR_BUNDLE_STOCK_INSUFFICIENT: 'Stock insuffisant pour un composant de kit',
  ERR_INVENTORY_NOT_IN_REVIEW: "La session d'inventaire doit être en statut 'REVIEW' avant confirmation",
  ERR_INVENTORY_UNCOUNTED_ITEMS: 'Des produits ne sont pas comptés. Finalisez le comptage avant confirmation.',
};
