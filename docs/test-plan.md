# Plan de controle et tests STOCKSYS

## 1. Encadrement par boutique (API)

| Module | Statut | Points verifies | Fichier cle |
| ------ | ------ | --------------- | ----------- |
| Stocks | OK | Filtrage `storeId`, ajustement et transfert limites | `server/src/stock/stock.service.ts` |
| Inventaire | OK | Start / update / confirm relies to user store | `server/src/inventory/inventory.service.ts` |
| Ventes | OK | List, create/bulk, return scopes | `server/src/sales/sales.service.ts` |
| Achats | OK | CRUD + reception controles | `server/src/purchases/purchases.service.ts` |
| Depenses | OK | Scope applique aux operations | `server/src/expenses/expenses.service.ts` |
| Notifications | OK | `buildScope` filtre par boutique | `server/src/notifications/notifications.service.ts` |
| Rapports | OK | `resolveStoreId` impose la boutique | `server/src/reports/reports.service.ts` |

## 2. Parcours manuels (profil non admin)

1. **Stocks** : consulter la liste, tenter ajustement/transfert hors boutique (attendre message d'erreur).
2. **Inventaire** : creer session, saisir comptages, finaliser sur sa boutique uniquement.
3. **Ventes** : vente autorisee uniquement sur sa boutique, rejet import/retour externes.
4. **Achats** : filtre boutique bloque dans l'UI, reception respectant la quantite restante.
5. **Depenses** : CRUD accepte pour la boutique courante, rejet sinon.
6. **Rapports & notifications** : changement de boutique impossible, notifications limitees a la boutique ou globales.

## 3. Tests Vitest disponibles

| Fichier | Cas couverts |
| ------- | ------------ |
| `tests/purchases.service.spec.ts` | Reception depassant (erreur) + reception complete (statut RECEIVED) |
| `tests/stock.service.spec.ts` | Ajustement (refus & succes) + transferts (stock insuffisant, succes, multi-variations, stop sur rupture) |
| `tests/sales.service.spec.ts` | Retour depassant vendu (erreur) + retour valide (stocks incrementes) |
| `tests/inventory.service.spec.ts` | Update bloque hors boutique, passage en REVIEW, confirm en mode REVIEW uniquement |
| `tests/audit-notify.service.spec.ts` | Notifications low-stock (creation, mise a jour, aucun seuil) |
| `tests/notifications.service.spec.ts` | Liste filtre les notifications pour les non-admins |

### Commandes

```bash
npm install           # installation dependances
npm run test          # suite complete (CI)
npm run test:watch    # mode developpement
```

### Integration CI

1. Etape "Install" : `npm ci` ou `npm install`.
2. Etape "Test" : `npm run test`.
3. Optionnel : activer `coverage/` genere par Vitest.

## 4. Checklist accessibilite / responsive

- Navigation clavier : focus visible, ordre logique (pages Achats, Ventes, Rapports).
- Contraste : verifier boutons/toasts/alertes > 4.5:1.
- Formulaires : labels ou attributs `aria-label` (modales Achats, Inventaire, Retour vente).
- Toasts et alertes : `role="alert"` + fermeture accessible.
- Responsive : vue desktop (>1200px), tablette (~768px), mobile (~375px) pour Achats, Stocks, Rapports.

## 5. Suivi

1. Etendre la couverture (inventaire partiel plus complexe, scenarios notifications par canal).
2. Ajouter la checklist accessibilite dans le template de revue/PR.
3. Brancher `npm run test` dans le pipeline CI et suivre `npm audit`.
