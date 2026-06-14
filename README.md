# Euphoric

A minimal group-chat app inspired by old-school Discord's simplicity and
old MySpace's profile customization.

This is the **web (PWA) foundation** — a mobile-first, installable web app
that runs in Safari on iPhone and can be added to the home screen. It uses
local/mock data (persisted in `localStorage`); a real backend and a native
iOS port come in later passes.

## Features in this prototype

- **Servers & channels** — create servers (emoji **or image icon**), add
  channels, switch between them.
- **Invites** — every server gets a unique random invite link
  (`euphoric.gg/<code>`); paste a code on the Discover page to join. One code
  maps to exactly one server.
- **Roles & permissions** — create roles (incl. dedicated *staff roles*) with
  granular permissions: kick, ban, timeout, **delete messages**, manage
  roles/channels/server. Moderation respects a role hierarchy (you can only act
  on lower-ranked members; nobody can act on the owner).
- **Moderation** — kick, ban, and timeout members from a user's profile sheet.
  Timed-out users can't send messages.
- **Messages** — delete your own messages; members with the *Delete Messages*
  permission can delete anyone's.
- **Block feature** — blocked users' messages and avatars are blurred (tap
  "reveal" to peek), and they can no longer contact you.
- **Follows & friends** — follow anyone from their profile; a mutual follow
  makes you friends (listed in Settings).
- **Server boosts (⭐ Stars)** — Premium members get 1 Star, Supernova members
  get 2, to spend across servers. At **3 ⭐** a server unlocks an animated
  (GIF) icon; at **9 ⭐** it can set a custom invite code.
- **Profiles & bios** — every user has an avatar, a custom bio, a banner, and a
  tier.
- **Subscription tiers**
  - **Free** — core features.
  - **Premium ($5/mo)** — animated GIF profile picture.
  - **Supernova ($8/mo)** — GIF avatar **plus** custom username font and
    MySpace-style profile colors (background / accent / text).
- **Server Discovery** — servers opt in with a description and keywords; a
  search page lets anyone find and join them by keyword.

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173). Use your browser's
device toolbar / an iPhone to see the mobile layout.

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Project structure

```
src/
  types.ts            # domain types + permission catalog
  permissions.ts      # permission resolution & moderation hierarchy
  store.tsx           # reducer + context + localStorage persistence
  data/seed.ts        # demo users, servers, messages
  App.tsx             # tab shell (Chat / Discover / Profile / Settings)
  components/
    Chat.tsx          # server rail, channels, messages, composer
    ServerManage.tsx  # roles & staff, members, discovery settings
    UserSheet.tsx     # profile view + block + moderation actions
    Discover.tsx      # keyword search & join
    Profile.tsx       # edit bio/avatar + Supernova theming
    Settings.tsx      # subscription tiers, create server, blocklist
    Modal.tsx         # shared modal + helpers
```

## Notes / next steps

- Payments are stubbed (no charge). Real money flows through **Apple In-App
  Purchase** in the native build.
- No real-time backend yet — messages live in local state. A future pass adds
  auth, a database, and websockets.
