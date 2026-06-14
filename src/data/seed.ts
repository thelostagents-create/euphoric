import type { AppState, ProfileTheme, Server, User } from "../types";

const defaultTheme: ProfileTheme = {
  backgroundColor: "#16122b",
  accentColor: "#a06bff",
  textColor: "#e9e6f5",
  usernameFont: "system-ui",
};

function user(
  id: string,
  username: string,
  partial: Partial<User> = {},
): User {
  return {
    id,
    username,
    avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(username)}`,
    nickname: "",
    bio: "",
    tier: "free",
    banner: { color: "#2a2440", image: "" },
    theme: { ...defaultTheme },
    blockedUserIds: [],
    following: [],
    starAllocations: {},
    ...partial,
  };
}

const users: Record<string, User> = {
  me: user("me", "you", {
    bio: "just vibing ✨ welcome to my corner of euphoric",
    tier: "supernova",
    theme: {
      backgroundColor: "#1a0b2e",
      accentColor: "#ff6bd6",
      textColor: "#ffe9fb",
      usernameFont: "'Brush Script MT', cursive",
    },
    following: ["luna", "nova"],
  }),
  luna: user("luna", "luna", {
    bio: "moon enthusiast 🌙 | she/her",
    tier: "premium",
    following: ["me"],
    starAllocations: { s_lounge: 1 },
  }),
  rex: user("rex", "rex", { bio: "ttrpg goblin" }),
  nova: user("nova", "nova_dev", { nickname: "Nova ⚡", bio: "shipping bugs since 2015" }),
  spammer: user("spammer", "totally_not_spam", { bio: "DM me for crypto 🚀" }),
};

const servers: Server[] = [
  {
    id: "s_lounge",
    name: "The Lounge",
    icon: "🛋️",
    iconImage: "",
    invite: "lounge1",
    ownerId: "me",
    discoverable: true,
    description: "A cozy place to hang out, share music, and chat about anything.",
    keywords: ["chill", "music", "hangout", "community"],
    channels: [
      { id: "c_general", name: "general" },
      { id: "c_music", name: "music" },
      { id: "c_introductions", name: "introductions" },
    ],
    roles: [
      {
        id: "r_everyone",
        name: "@everyone",
        color: "#9aa0b4",
        permissions: [],
        position: 0,
        staff: false,
      },
      {
        id: "r_admin",
        name: "Admin",
        color: "#ff6bd6",
        permissions: [
          "KICK_MEMBERS",
          "BAN_MEMBERS",
          "TIMEOUT_MEMBERS",
          "MANAGE_ROLES",
          "MANAGE_CHANNELS",
          "MANAGE_SERVER",
        ],
        position: 100,
        staff: true,
      },
      {
        id: "r_mod",
        name: "Moderator",
        color: "#a06bff",
        permissions: ["KICK_MEMBERS", "TIMEOUT_MEMBERS"],
        position: 50,
        staff: true,
      },
    ],
    members: [
      { userId: "me", roleIds: ["r_everyone", "r_admin"] },
      { userId: "luna", roleIds: ["r_everyone", "r_mod"] },
      { userId: "rex", roleIds: ["r_everyone"] },
      { userId: "spammer", roleIds: ["r_everyone"] },
    ],
  },
  {
    id: "s_devs",
    name: "Dev Den",
    icon: "💻",
    iconImage: "",
    invite: "devden",
    ownerId: "nova",
    discoverable: true,
    description: "Builders, designers and tinkerers helping each other ship.",
    keywords: ["coding", "programming", "tech", "design", "indie"],
    channels: [
      { id: "c_dev_general", name: "general" },
      { id: "c_help", name: "help" },
    ],
    roles: [
      {
        id: "r_dev_everyone",
        name: "@everyone",
        color: "#9aa0b4",
        permissions: [],
        position: 0,
        staff: false,
      },
    ],
    members: [
      { userId: "nova", roleIds: ["r_dev_everyone"] },
      { userId: "me", roleIds: ["r_dev_everyone"] },
    ],
  },
];

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

export const seedState: AppState = {
  currentUserId: "me",
  users,
  servers,
  messages: [
    { id: "m1", channelId: "c_general", authorId: "luna", content: "morning everyone ☀️", createdAt: ago(120) },
    { id: "m2", channelId: "c_general", authorId: "rex", content: "anyone up for a game later?", createdAt: ago(90) },
    { id: "m3", channelId: "c_general", authorId: "me", content: "im down, maybe after 6", createdAt: ago(60) },
    { id: "m4", channelId: "c_general", authorId: "spammer", content: "🚀🚀 DM me to 10x your money fast 🚀🚀", createdAt: ago(30) },
    { id: "m5", channelId: "c_general", authorId: "luna", content: "ignore that lol", createdAt: ago(25) },
    { id: "m6", channelId: "c_music", authorId: "rex", content: "new album recs?", createdAt: ago(45) },
    { id: "m7", channelId: "c_dev_general", authorId: "nova", content: "shipped the new build 🎉", createdAt: ago(200) },
    // Mentions of @you — surface in the Friends tab notification feed.
    { id: "m8", channelId: "c_general", authorId: "rex", content: "@you you in for the game tonight?", createdAt: ago(20) },
    { id: "m9", channelId: "c_dev_general", authorId: "nova", content: "hey @you can you review my PR?", createdAt: ago(15) },
    // DM history with luna (a mutual friend).
    { id: "d1", channelId: "dm:luna_me", authorId: "luna", content: "heyy! glad we're friends on here now 🌙", createdAt: ago(180) },
    { id: "d2", channelId: "dm:luna_me", authorId: "me", content: "same! this place is cozy", createdAt: ago(175) },
  ],
};
