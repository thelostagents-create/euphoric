# Euphoric

A minimal group-chat app inspired by old-school Discord's simplicity, with
deep premium profile customization.

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
  granular permissions: kick, ban, timeout, **delete messages**, **mention
  @everyone**, manage roles/channels/server. An `@everyone` ping from a member
  with that permission alerts the whole server. Moderation respects a role
  hierarchy (you can only act
  on lower-ranked members; nobody can act on the owner).
- **Moderation** — kick, ban, and timeout members from a user's profile sheet.
  Timed-out users can't send messages.
- **Messages** — delete your own messages; members with the *Delete Messages*
  permission can delete anyone's.
- **Block feature** — blocked users' messages and avatars are blurred (tap
  "reveal" to peek), and they can no longer contact you.
- **Unique usernames + nicknames** — each username can be claimed by only one
  person (claim flow with live availability feedback). Set an optional
  **nickname** that's shown in chat instead of your handle.
- **@mentions** — type `@` in any composer to autocomplete server members;
  mentions render highlighted in messages (and brighter when they're you).
- **Follows & friends** — follow anyone from their profile; a mutual follow
  makes you friends. A dedicated **Friends tab** lets you add people by
  username, see a **notification feed of who @-mentioned you** in servers
  (tap one to jump to the message), and a unified **Messages** list of DMs and
  **group chats** sorted by most recent activity.
- **Group chats** — start a group from your friends; everyone can rename it and
  set a group picture, the creator can remove members, and anyone can add more
  friends or leave.
- **Images & video** — import a local image (or paste a URL) for avatars,
  banners, server icons and group pictures, and send **image/video
  attachments** in any chat.
- **Server boosts (⭐ Stars)** — Premium members get 1 Star, Supernova members
  get 2, to spend across servers. A server's Star count shows as a tappable
  pill in the chat header — tap it to lend a Star. At **3 ⭐** a server unlocks
  an animated (GIF) icon; at **9 ⭐** it can set a custom invite code.
- **Profiles & bios** — every user has an avatar, a custom bio, a banner, and a
  tier.
- **Subscription tiers**
  - **Free** — core features.
  - **Premium ($5/mo)** — animated GIF profile picture.
  - **Supernova ($8/mo)** — GIF avatar **plus** custom username font and
    premium profile color customization (background / accent / text).
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
  App.tsx             # tab shell (Chat / Friends / Discover / Profile)
  components/
    Chat.tsx          # server rail, channels, messages, @mention composer
    Friends.tsx       # mentions feed, add friends, DMs
    ServerManage.tsx  # roles & staff, members, invite, Stars, discovery
    UserSheet.tsx     # profile view + follow/block + moderation actions
    Discover.tsx      # keyword search, join by invite
    Profile.tsx       # edit profile/banner/theme + account settings
    Settings.tsx      # AccountSettings block embedded in Profile
    MessageText.tsx   # renders @mentions in message text
    Modal.tsx         # shared modal + helpers
```

## Notes / next steps

- Payments are stubbed (no charge). Real money flows through **Apple In-App
  Purchase** in the native build.
- No real-time backend yet — messages live in local state. A future pass adds
  auth, a database, and websockets.
