# Application Expo

Application React Native avec Expo Router et TypeScript.

## Prérequis

- Node.js 26.13.0 LTS (version conseillée; minimum requis: 22.13.0)
- npm
- Pour le blocage Screen Time : un iPhone sous iOS 16.4 ou plus récent, un compte Apple Developer et l'autorisation Apple « Family Controls » pour l'app et ses extensions.
- Un development build iOS est obligatoire. Expo Go ne contient pas les extensions Screen Time.

## Démarrer

```bash
npm install
npm start
```

### Authentification Supabase

1. Crée un projet Supabase et active l'authentification par e-mail et mot de passe.
2. Pour tester une connexion immédiate en développement, désactive la confirmation d'e-mail dans les paramètres d'authentification. Si elle reste active, Tempo affiche un message demandant de confirmer l'adresse.
3. Copie `.env.example` vers `.env`, puis renseigne l'URL du projet et sa clé publique `anon`/publishable (`EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Dans Supabase, copie la « Project URL » depuis **Project Settings → API** : ce n'est pas `https://supabase.com`. N'utilise jamais la clé `service_role` ou une clé `secret` dans l'application.
4. Redémarre Expo après toute modification des variables d'environnement :

```bash
npx expo start --go --clear
```

La clé `service_role` ne doit jamais être utilisée dans l'application. Les sessions sont conservées dans AsyncStorage et le renouvellement des jetons est suspendu en arrière-plan.

### Mode Expo Go

Quand le module natif Screen Time n'est pas présent, Tempo utilise automatiquement une simulation locale. Elle permet de tester l'autorisation, la sélection de catégories fictives, l'écran de blocage simulé, le quiz, la pause de 15 minutes et le reblocage. Le bandeau de simulation indique clairement qu'aucune autre application n'est réellement bloquée. Le bouton de notification sur l'écran simulé valide aussi le routage vers le quiz.

Les routes d'inscription et de connexion sont publiques tant qu'aucune session n'existe. Une session Supabase restaurée au démarrage donne accès à l'accueil et au quiz.

### Abonnement Stripe en mode test

Le parcours Stripe utilise Checkout hébergé dans le navigateur Expo (compatible Expo Go) et des Edge Functions Supabase. L'essai gratuit de 7 jours est créé par la base; l'accès payant ne s'ouvre qu'après confirmation du webhook Stripe. Le prix de test attendu est de 3 €/mois. Le mode par défaut reste `mock` pour conserver l'accès au MVP; passe `EXPO_PUBLIC_BILLING_PROVIDER=stripe` dans `.env` puis redémarre Expo avec `npx expo start --go --clear` pour activer le paywall réel.

1. Dans Stripe, reste en mode test, crée le produit mensuel à 3 €, puis configure le portail client (résiliation, moyen de paiement, factures).
2. Depuis PowerShell, déploie la migration SQL et les fonctions. La CLI Supabase est incluse comme dépendance de développement :

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref <reference-du-projet>
npx.cmd supabase db push
npx.cmd supabase functions deploy get-access-status --use-api
npx.cmd supabase functions deploy create-checkout-session --use-api
npx.cmd supabase functions deploy create-portal-session --use-api
npx.cmd supabase functions deploy stripe-webhook --use-api --no-verify-jwt
```

3. Dans **Supabase → Edge Functions → Secrets**, configure `STRIPE_SECRET_KEY` (clé `sk_test_`), `STRIPE_PRICE_ID` (prix mensuel `price_...`) et `STRIPE_RETURN_URL` (URL HTTPS de `public/stripe-return.html` après hébergement). Ne mets jamais ces valeurs dans `.env`, l'app ou Git.
4. Dans le tableau de bord Stripe en mode test, crée un webhook vers `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`. Sélectionne `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` et `invoice.payment_failed`. Copie son secret de signature `whsec_...` dans les secrets Edge Functions Supabase sous `STRIPE_WEBHOOK_SECRET`.
5. Active `EXPO_PUBLIC_BILLING_PROVIDER=stripe` dans `.env`, vérifie que `EXPO_PUBLIC_SUPABASE_URL` est l'URL API de ton projet (pas `https://supabase.com`) et redémarre avec `npx.cmd expo start --go --clear`. Teste le paiement avec une carte Stripe de test, par exemple `4242 4242 4242 4242`, une date future et un CVC quelconque.

La durée d'essai est réglée dans `public.billing_settings.trial_duration_minutes` (10080 minutes par défaut). Le statut est calculé côté serveur; l'app ne peut pas modifier les droits d'accès. Le webhook est le seul à synchroniser les paiements et est protégé par la signature Stripe. Hors ligne, un accès déjà confirmé est conservé au maximum 30 minutes pendant que l'app reste ouverte; après cette limite, l'accès est revérifié et échoue fermé si le serveur reste inaccessible. Les achats intégrés iOS/Google et le mode Stripe production sont hors périmètre : avant publication iOS, il faudra trancher la conformité App Store et probablement intégrer les achats Apple/Google.

```bash
npm run lint
npm run typecheck
npm test
```

Pour le développement de l'interface web, lance `npm run web`. Le blocage réel Screen Time n'est disponible que sur iOS; Android et web utilisent la simulation.

### Build iOS

Le sélecteur d'apps et le blocage utilisent les API Apple Family Controls, Managed Settings et Device Activity. Il faut obtenir l'entitlement Family Controls auprès d'Apple pour l'app et les identifiants d'extensions (`com.tempo.focus`, `.ActivityMonitorExtension`, `.ShieldAction`, `.ShieldConfiguration`) avant de pouvoir signer et installer le build. L'App Group utilisé est `group.com.tempo.focus`. Le plugin demande aussi le Team ID Apple dans `ios.appleTeamId` avant de pouvoir signer.

Après avoir configuré un compte Apple Developer et l'accès EAS :

```bash
npx expo prebuild --platform ios
npx eas-cli build --platform ios --profile development
npx expo start
```

Le flux de déblocage suit la limite Screen Time : quiz de 5 questions, 4 bonnes réponses requises, puis 15 minutes de déblocage avant le reblocage automatique. Depuis l'écran de blocage iOS, le bouton d'action envoie une notification à toucher pour ouvrir le quiz.

## Structure

- `src/app/` : écrans et navigation Expo Router
- `assets/` : icônes et ressources statiques

Vérifications : `npm run lint`, `npm run typecheck` et `npm test`.
