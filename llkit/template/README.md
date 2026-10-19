# **APP_NAME**

Byggd på llkit, som kopierades hit från Skrivro. Ändra inte i `llkit/` här: ändra i Skrivros och
hämta den med `npm run llkit:uppdatera ../__APP_SLUG__` från Skrivro.

- `npm install` en gång, sedan `npm run app` för appen i eget fönster, `npm run dev:web` i
  webbläsaren.
- `src/App.tsx`: första starten (språk och tema), hemskärmen och menyn.
- `src/settings.ts`: appens inställningar. `src/en.json`: appens engelska texter.
- `src/platform.ts`: enheten. Uppdateringar hämtas från GitHub-repot `Johan-Ott/__APP_SLUG__`.
- `npm run build:windows` och `npm run build:android` bygger installationsfilerna.
