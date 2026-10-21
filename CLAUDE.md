# CLAUDE.md

This file tells Claude how to work on this project. Read it fully before writing any code, and follow every rule below in every session.

---

## 1. Project Overview

- **Project:** SelfVibe
- **Frontend:** Next.js (App Router)
- **Backend:** Node.js with Express
- **Architecture:** Separate `frontend/` and `backend/` folders in one repository
- **Goal:** A real, production-quality business application — follow industry-standard structure and practices, not tutorial-style shortcuts.

---

## 2. Documentation First (VERY IMPORTANT)

All planning documents live in the `docs/` folder at the project root:

```
docs/
├── SelfVibe_PRD_BRD_v1.0           # Product Requirements Document — what we are building and why
└── SelfVibe_15_Day_Roadmap_v1.0    # Development roadmap — phases, milestones, and task status
```

**Rules:**

1. **Before starting any feature, read `docs/SelfVibe_PRD_BRD_v1.0` and `docs/SelfVibe_15_Day_Roadmap_v1.0`.** Every feature must match the requirements in the PRD.
2. **Build in the order defined in `SelfVibe_15_Day_Roadmap_v1.0`.** Do not jump ahead to later phases unless I ask.
3. **After finishing a task, update `SelfVibe_15_Day_Roadmap_v1.0`** — mark the task as done (`[x]`) and note anything important (decisions, pending items).
   - Do NOT change any other content in this document.
   - Keep the file name and file format exactly the same.
4. If a request conflicts with the PRD, or something is missing or unclear in the PRD, **stop and ask me** before building. Do not guess.
5. If `docs/`, `SelfVibe_PRD_BRD_v1.0`, or `SelfVibe_15_Day_Roadmap_v1.0` do not exist yet, create them first and ask me to fill in or confirm the content.

---

## 3. Git & GitHub Rules (STRICT)

- ❌ **NEVER run `git push` without my explicit permission.**
- ❌ Never force push, never rewrite history, never delete branches without asking.
- ✅ You may run `git status`, `git diff`, `git add`, and `git commit` locally when it helps.
- ✅ Before pushing, show me a summary of what will be pushed (branch, commits, changed files) and **wait for me to say "yes, push"**.
- Use clear commit messages, e.g. `feat: add user login API`, `fix: handle null token in auth middleware`.
- Never commit `.env` files, secrets, or `node_modules`. Make sure `.gitignore` covers them.

---

## 4. Environment Variables (.env)

Whenever a feature needs an external connection or secret (database URL, Google OAuth, JWT secret, API keys, email service, payment keys, etc.):

1. **Add the variable to the correct `.env` file with a placeholder value.**
2. **Also add it to `.env.example`** (same keys, no real values) so the setup is documented.
3. **Tell me clearly in your reply:** which variable was added, in which file, and that I need to put my actual value there.
4. Never hardcode secrets, URLs, or keys in code. Always read them from environment variables.
5. Never invent or fill in real credentials.
6. Maintain a proper `.gitignore` in the root, `frontend/`, and `backend/` — it must cover `.env`, `.env.local`, `node_modules/`, `.next/`, build output, logs, and OS files (`.DS_Store`, `Thumbs.db`).

### Backend — `backend/.env`

```env
# ===== Server =====
PORT=5000
NODE_ENV=development

# ===== Database =====
# TODO: Replace with your actual database connection string
DATABASE_URL=your_database_connection_string_here

# ===== Auth =====
# TODO: Replace with a long random secret
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# ===== Google OAuth =====
# TODO: Replace with your actual Google OAuth credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ===== CORS =====
CLIENT_URL=http://localhost:3000
```

### Frontend — `frontend/.env.local`

```env
# ===== API =====
# TODO: Replace with your actual backend URL in production
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# ===== Google OAuth =====
# TODO: Replace with your actual Google Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

> Note: In Next.js, only variables starting with `NEXT_PUBLIC_` are available in the browser. Never put secrets in `NEXT_PUBLIC_` variables.

**Format for telling me about new env variables:**

> ⚠️ **Action needed:** I added `DATABASE_URL` to `backend/.env`. Please replace the placeholder with your actual database connection string.

---

## 5. Backend Folder Structure (Node.js + Express)

```
backend/
├── server.js                 # Entry point — starts the server, connects DB
├── package.json
├── .env                      # Real values (never committed)
├── .env.example              # Template with keys only
└── src/
    ├── app.js                # Express app setup: middleware, routes, error handler
    ├── config/               # Configuration (DB connection, passport, constants)
    │   ├── db.js
    │   └── passport.js
    ├── routes/               # Route definitions only — no business logic
    │   ├── index.js          # Combines all routes under /api
    │   ├── auth.routes.js
    │   └── user.routes.js
    ├── controllers/          # Handle req/res, call services, send responses
    │   ├── auth.controller.js
    │   └── user.controller.js
    ├── services/             # Business logic and database operations
    │   ├── auth.service.js
    │   └── user.service.js
    ├── models/               # Database models / schemas
    │   └── user.model.js
    ├── middlewares/          # Auth, validation, error handling, rate limiting
    │   ├── auth.middleware.js
    │   ├── error.middleware.js
    │   └── validate.middleware.js
    ├── validators/           # Request validation schemas
    │   └── auth.validator.js
    ├── utils/                # Small reusable helpers
    │   ├── logger.js
    │   ├── ApiError.js
    │   ├── ApiResponse.js
    │   └── asyncHandler.js
    └── helpers/              # Generic reusable functions (see section 7)
        └── genericFunctions.js
```

**Responsibility of each layer:**

- `routes` → only map URLs to controllers and middlewares
- `controllers` → read request, call service, return response (keep thin)
- `services` → all business logic and DB queries
- `models` → data shape and schema only
- `middlewares` → cross-cutting concerns (auth, errors, validation)
- `utils` / `helpers` → reusable, stateless functions

**Naming convention:** `<feature>.<layer>.js` → e.g. `user.controller.js`, `user.service.js`.

**API standards:**

- All routes under `/api` (e.g. `/api/auth/login`, `/api/users/:id`)
- Use proper HTTP methods and status codes (200, 201, 400, 401, 403, 404, 500)
- Same response format everywhere:

```json
{ "success": true, "message": "User fetched", "data": { } }
{ "success": false, "message": "User not found", "error": { } }
```

- One central error-handling middleware; wrap async controllers with `asyncHandler`.

---

## 6. Frontend Folder Structure (Next.js App Router)

```
frontend/
├── package.json
├── next.config.js
├── .env.local                # Real values (never committed)
├── .env.example              # Template with keys only
├── public/                   # Static files (images, icons, fonts)
└── src/
    ├── app/                  # Pages and layouts (App Router)
    │   ├── layout.js         # Root layout
    │   ├── page.js           # Home page
    │   ├── (auth)/           # Route group: login, register
    │   │   ├── login/page.js
    │   │   └── register/page.js
    │   └── dashboard/
    │       ├── layout.js
    │       └── page.js
    ├── components/           # Reusable UI components
    │   ├── ui/               # Basic building blocks (Button, Input, Modal)
    │   ├── layout/           # Navbar, Sidebar, Footer, MobileNav
    │   ├── animations/       # Reusable motion wrappers (FadeIn, SlideUp, Stagger)
    │   └── features/         # Feature-specific components (e.g. TrackCard, Player)
    ├── services/             # API calls to the backend (one file per feature)
    │   ├── api.js            # Base API client (axios/fetch with base URL, token)
    │   ├── auth.service.js
    │   └── user.service.js
    ├── hooks/                # Custom React hooks (useAuth, useFetch, useMediaQuery)
    ├── context/              # React context providers (AuthContext)
    ├── utils/                # Helpers (formatDate, validators, constants)
    │   ├── constants.js
    │   ├── animations.js     # Shared animation variants, durations, easings
    │   └── genericFunctions.js
    ├── styles/               # Global styles, theme tokens
    └── lib/                  # Third-party library setup/config
```

**Frontend rules:**

- Never call `fetch`/`axios` directly inside components — always go through `src/services/`.
- Keep components small and reusable. If a component grows too big, split it.
- Component files use PascalCase: `TrackCard.jsx`, `LoginForm.jsx`.
- Always handle **loading**, **error**, and **empty** states in the UI (use skeleton loaders, not plain "Loading..." text).

---

## 7. Responsive Design — Mobile First (TOP PRIORITY)

**Mobile is the first priority.** Design and build for the phone screen first, then scale up to tablet and desktop. Every page and component must work properly on every device.

**Rules:**

1. Write base styles for mobile, then add larger-screen styles with `min-width` breakpoints (e.g. Tailwind `sm:`, `md:`, `lg:`, `xl:`).
2. **Test every screen at these widths before calling a task done:**

   | Device              | Width   |
   |---------------------|---------|
   | Small phone         | 360px   |
   | Standard phone      | 390px   |
   | Large phone         | 430px   |
   | Tablet              | 768px   |
   | Small laptop        | 1024px  |
   | Desktop             | 1440px  |
   | Large desktop       | 1920px  |

3. **No horizontal scrolling** on any screen size (except intentional carousels).
4. Touch targets (buttons, icons, links) must be at least **44×44px** on mobile.
5. On mobile, use patterns that feel native: bottom navigation bar, swipe-friendly carousels, bottom sheets instead of large modals, sticky mini player.
6. Use responsive images (`next/image` with proper `sizes`) and fluid typography (`clamp()`), so text and images never overflow or look tiny.
7. Check both portrait and landscape on mobile, and respect safe areas (notch / home indicator) with `env(safe-area-inset-*)`.
8. Use relative units (`rem`, `%`, `vw`, `vh`/`dvh`) instead of fixed pixel widths for layouts.

---

## 8. UI Design & Animation (Make It Look Premium)

The UI must look **very impressive, modern, and professional** — like a top music-industry product (think Spotify, Apple Music, SoundCloud, Tidal level of polish). It must **not** look generic or AI-generated.

### Visual style

- Music-industry aesthetic: rich dark theme as default, bold typography, vibrant accent gradients, glassmorphism/blur where it fits, large album art and visuals.
- Define a design system in `styles/` (colors, spacing, radius, shadows, font sizes) and use it everywhere — no random one-off colors or sizes.
- Consistent spacing, alignment, and visual hierarchy on every screen.
- Use a modern, high-quality font pairing (e.g. via `next/font`), not default system fonts.

### Icons (STRICT)

- ❌ **NEVER use emoji in the UI** (no 🎵 🔥 ✨ 🚀 etc. in buttons, headings, labels, empty states, or toasts). Emoji make the app look AI-made and cheap.
- ✅ Use a professional icon library with a single, consistent style across the whole app, e.g. **Lucide** (`lucide-react`), **Phosphor Icons**, or **Remix Icon**. Pick one and stick to it.
- Use proper music-standard icons: play, pause, skip forward/back, shuffle, repeat, volume, queue, heart/like, playlist, microphone, headphones, waveform, equalizer, etc.
- Icons must have consistent size and stroke width, and accessible labels (`aria-label`) on icon-only buttons.

### Animations

- Use **Framer Motion** for animations (CSS transitions are fine for simple hover effects).
- Add smooth, meaningful animation throughout:
  - Page transitions and section reveal-on-scroll
  - Staggered entrance for lists and grids (tracks, cards, playlists)
  - Hover and tap feedback on cards and buttons (scale, glow, lift)
  - Animated player controls, progress bars, and equalizer/waveform visuals
  - Smooth open/close for modals, drawers, bottom sheets, and menus
  - Skeleton shimmer while loading
- Keep shared animation variants, durations, and easings in `utils/animations.js` and reusable wrappers in `components/animations/` — do not copy-paste animation code.
- Animations must be smooth (60fps): animate `transform` and `opacity`, not `width`, `height`, `top`, or `left`.
- Keep animations fast and subtle (roughly 150–400ms) — polished, not distracting.
- Respect `prefers-reduced-motion`: reduce or disable motion for users who turn it off.
- Make sure animations also run well on mobile (test on small screens, avoid heavy effects that lag).

### Approved UI libraries

These can be used without asking: **Tailwind CSS**, **Framer Motion**, one icon library (**lucide-react** / **Phosphor** / **Remix Icon**), `clsx` / `tailwind-merge`. Ask me before adding any other major UI library.

---

## 9. Generic / Reusable Functions

Do not repeat the same logic in multiple places. Put common logic in:

- Backend: `src/helpers/genericFunctions.js` and `src/utils/`
- Frontend: `src/utils/genericFunctions.js`

Examples of what belongs here:

- Pagination helper (page, limit, skip)
- Standard API response / error builders
- Date and duration formatting (e.g. `3:45` track length)
- String helpers (slugify, capitalize, trim)
- Input sanitizing and common validation
- Generic CRUD helpers for services

Before writing a new helper, **check if a similar one already exists** and reuse it.

---

## 10. Code Quality, Comments & Debugging

### Comments

- Add a short header comment at the top of every file explaining what it does.
- Add a comment above every function describing its purpose, parameters, and return value (JSDoc style).
- Add inline comments for any logic that is not obvious.

```js
/**
 * Fetch a single user by ID.
 * @param {string} userId - The ID of the user to fetch
 * @returns {Promise<Object>} The user object (without password)
 * @throws {ApiError} 404 if user not found
 */
const getUserById = async (userId) => {
  // Look up the user and exclude the password field
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new ApiError(404, `User not found with id: ${userId}`);
  }

  return user;
};
```

### Debugging-friendly code

- Use a central logger (`utils/logger.js`) instead of random `console.log` calls.
- Log with clear context: `[AuthService] login failed for email=...` — never log passwords, tokens, or secrets.
- Write clear, specific error messages that say **what** failed and **where**.
- Use `try/catch` around external calls (DB, APIs, OAuth) and pass errors to the error middleware.
- Use meaningful variable and function names (`isUserVerified`, not `flag1`).

### File size limit (STRICT)

- ❌ **No single code file may exceed 2,000 lines.**
- If a file is getting close (~1,500 lines), split it into smaller modules by responsibility (e.g. split a service into `user.query.service.js` and `user.mutation.service.js`, or extract helpers).
- Prefer many small, focused files over a few huge ones.

---

## 11. Workflow Checklist (every task)

1. Read `docs/SelfVibe_PRD_BRD_v1.0` and `docs/SelfVibe_15_Day_Roadmap_v1.0`.
2. Confirm the task fits the current roadmap phase.
3. Put code in the correct folder following sections 5 and 6.
4. Reuse existing generic functions; add new ones to the helpers/utils files.
5. Add any needed env variables with placeholders and **tell me to fill in the real values**.
6. For UI work: build mobile-first, add proper animations, use the icon library (no emoji), and check every width in section 7.
7. Add proper comments; keep every file under 2,000 lines.
8. Update `docs/SelfVibe_15_Day_Roadmap_v1.0` with progress (only the task status — nothing else, same file name).
9. Commit locally if useful — **do NOT push to GitHub without my permission.**
10. Give me a short summary: what was built, files changed, env variables I need to fill, and next step from the roadmap.

---

## 12. When in Doubt

Ask me before:

- Pushing to GitHub
- Adding a major new library or changing the tech stack
- Changing the folder structure
- Deleting files or large amounts of code
- Building something not described in the PRD