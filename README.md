# presence-discord

Rich Presence Discord permanente, hebergee sur Railway : ton profil affiche
**Joue a Stake — Blackjack**, avec le logo Stake et un bouton **Jouer avec moi**
qui redirige vers `https://stake.com/fr`.

> ⚠️ **Avertissement** — Afficher une Rich Presence avec image et bouton sur un
> **compte utilisateur** depuis un serveur necessite un token de compte, ce que
> Discord appelle un *selfbot*. C'est **contraire aux Conditions d'utilisation
> de Discord** et peut entrainer la suspension definitive du compte. Utilise
> ce projet en connaissance de cause, de preference sur un compte secondaire.

## Ce que ca fait

- Se connecte au Gateway Discord (v9) en WebSocket, sans dependance lourde.
- Envoie une presence de type « Joue a … » avec titre, details, etat, chrono,
  grande image, petite image et un bouton cliquable.
- Heartbeat, `RESUME` de session et reconnexion exponentielle : tourne 24/7.
- Rafraichit la presence toutes les 10 minutes (Discord la fait expirer sinon).
- Expose un `GET /` de healthcheck pour que Railway garde le service en vie.

## Prerequis

### 1. Creer l'application Discord (donne le nom affiche et le droit d'image)

1. Va sur https://discord.com/developers/applications → **New Application**.
2. Nomme-la **Stake** — ce nom est ce qui s'affiche en gras sur ton profil.
3. Copie l'**Application ID** (onglet *General Information*).

### 2. Recuperer ton token utilisateur

Sur Discord dans ton navigateur : `F12` → onglet **Network** → recharge la page
→ clique une requete vers `discord.com/api` → en-tete **Authorization**.

Ne partage ce token avec personne : il donne un acces total a ton compte.

## Deploiement sur Railway

1. Connecte ce repo GitHub a un nouveau projet Railway.
2. Onglet **Variables**, ajoute au minimum :

   | Variable         | Valeur                            |
   | ---------------- | --------------------------------- |
   | `DISCORD_TOKEN`  | ton token utilisateur             |
   | `APPLICATION_ID` | l'ID de l'application « Stake »    |

3. Deploie. Railway lance `npm start` (voir `Procfile` / `railway.json`).

Toutes les autres variables sont optionnelles, voir [.env.example](.env.example) :
`ACTIVITY_NAME`, `ACTIVITY_DETAILS`, `ACTIVITY_STATE`, `BUTTON_LABEL`,
`BUTTON_URL`, `LARGE_IMAGE_URL`, `LARGE_IMAGE_TEXT`, `SMALL_IMAGE_URL`,
`SMALL_IMAGE_TEXT`, `STATUS`.

## En local

```bash
npm install
cp .env.example .env   # puis remplis DISCORD_TOKEN et APPLICATION_ID
node --env-file=.env src/index.js
```

## Notes

- Le bouton n'est **pas visible pour toi-meme** : demande a un ami de regarder
  ton profil pour verifier.
- Si la presence s'affiche sans logo, verifie que `LARGE_IMAGE_URL` pointe vers
  une image publique (png/jpg) accessible sans authentification.
- Sois deconnecte du Discord officiel ou non, la presence du serveur prend le
  relais ; si le client officiel tourne, il peut ecraser la presence.
