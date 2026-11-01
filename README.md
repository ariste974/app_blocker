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
3. Copie `.env.example` vers `.env`, puis renseigne l'URL du projet et sa clé `anon` publique (`EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
4. Redémarre Expo après toute modification des variables d'environnement :

```bash
npx expo start --go --clear
```

La clé `service_role` ne doit jamais être utilisée dans l'application. Les sessions sont conservées dans AsyncStorage et le renouvellement des jetons est suspendu en arrière-plan.

### Mode Expo Go

Quand le module natif Screen Time n'est pas présent, Tempo utilise automatiquement une simulation locale. Elle permet de tester l'autorisation, la sélection de catégories fictives, l'écran de blocage simulé, le quiz, la pause de 15 minutes et le reblocage. Le bandeau de simulation indique clairement qu'aucune autre application n'est réellement bloquée. Le bouton de notification sur l'écran simulé valide aussi le routage vers le quiz.

Les routes d'inscription et de connexion sont publiques tant qu'aucune session n'existe. Une session Supabase restaurée au démarrage donne accès à l'accueil et au quiz.

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
