# ✨ DocVault

A secure, all-in-one workspace featuring a theme-aware rich text editor combined with a seamlessly integrated AES-256 encrypted password manager. 

DocVault combines the power of TipTap's advanced editor, a sophisticated theming engine, and secure local cryptography to give you a fully private vault that adapts to your workflow.

## 🎨 Features

### Rich Text Editing

- **TipTap-powered editor** with extensive formatting capabilities
- Support for **tables**, **task lists**, **code blocks** (with syntax highlighting), **links**, and more
- **Inline formatting** with color, highlights, and text alignment
- **Bubble menu** for context-aware quick formatting
- **Slash commands** for rapid content insertion

### Theming System

- **Multiple built-in themes**: Obsidian, Notion Light, Notion Dark, and more
- **Real-time theme switching** with instant visual updates
- **Theme-aware UI**: Every element respects your selected theme
- **Persistent theme preferences** across sessions
- **Custom CSS variables** for deep theming control
- **Dynamic scrollbar theming** that matches your editor style

### Advanced Notes

- **Callouts & Highlights** with 8+ color variants (info, warning, success, danger, etc.)
- **Comments & Annotations** for collaborative feedback
- **Task tracking** with checkboxes for productive note-taking

### Secure Password Vault 🔒

- **AES-GCM Encryption**: Passwords are mathematically secured on your browser before ever touching the database.
- **Biometric Unlock**: Securely access your vault using MacOS TouchID, Windows Hello, or mobile biometrics (powered by WebAuthn PRF).
- **4-Digit PIN Fallback**: Mandatory, high-security 4-digit PIN system wrapping encryption keys.
- **Google CSV Import**: Instant, bulk importation of existing Google passwords.

### Storage & Sync

- **Flexible backends**: File-based (local development) or PostgreSQL (production)
- **Guest mode**: Start editing immediately—no account required
- **Automatic sync**: Guest documents seamlessly migrate to server storage on sign-in
- **Session management**: Secure authentication with bcrypt-hashed passwords

### Authentication

- **User registration & login** with email
- **Session-based authentication** via secure cookies
- **Guest access** for frictionless first-time users
- **Session tracking** via Prisma ORM

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (or use your preferred Node version manager)
- **npm** or **yarn**
- PostgreSQL (optional, for production deployment)

### Development Setup

1. **Clone and install dependencies:**

```bash
git clone https://github.com/TITANHACKY/docvault.git
cd docvault
npm install
```

2. **Configure environment (optional for file-based storage):**

```bash
# .env.local
# For PostgreSQL backend (production):
DOC_STORE_MODE=postgres
DATABASE_URL=postgres://user:password@localhost:5432/prism_db
PGSSL=true  # if required by your provider
```

3. **Set up Prisma (if using PostgreSQL):**

```bash
npx prisma generate
npx prisma migrate dev --name init_auth
```

4. **Start development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

### Modes

**Guest Mode** (No login required)

- Start editing documents immediately
- All data stored in browser local storage
- Perfect for trying DocVault out or temporary notes

**Authenticated Mode** (With account)

- Server-backed document storage
- Guest documents automatically sync on sign-in
- Access documents across devices
- Support for collaborative features

### API Endpoints

**Authentication Routes:**

- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Sign in with email/password
- `POST /api/auth/logout` — Sign out (clears session)
- `GET /api/auth/me` — Get current user info

**UI Routes:**

- `/login` — Authentication page
- `/` — Documents dashboard (guest or authenticated)
- `/docs/[id]` — Editor page for a specific document

## 🗄️ Storage Configuration

### File-Based Storage (Development)

Default mode. Documents and comments stored in `data/doc-editor-db.json`.

No configuration needed—just start coding!

### PostgreSQL (Production)

For scalable, multi-user deployments:

```bash
# .env.local
DOC_STORE_MODE=postgres
DATABASE_URL=postgres://user:password@host:5432/db_name
```

Initialize schema:

```bash
npx prisma migrate dev --name init_auth
```

## 🎯 Architecture

- **Frontend**: Next.js 16 (Pages Router) + React 19 + TypeScript
- **Editor**: TipTap (headless editor framework)
- **Styling**: Tailwind CSS v4 with dynamic CSS variables
- **Database**: Prisma ORM + PostgreSQL (or file storage)
- **Auth**: bcryptjs with secure session cookies
- **Icons**: Lucide React

### Theming Architecture

DocVault uses **HTML-level CSS custom properties** as the single source of truth. When you switch themes:

1. All `--editor-*` CSS variables are updated on `<html>`
2. Editor, UI, and scrollbars instantly reflect the new palette
3. Your theme preference is persisted to localStorage
4. On page reload, your theme is automatically restored

No per-page style conflicts. One theme. Universal consistency.

## 🔧 Development

### Build & Linting

```bash
npm run build    # Build for production
npm run lint     # Run ESLint
npm run dev      # Start dev server with hot reload
npm start        # Run production server
```

### Project Structure

```
src/
├── app/                  # Placeholder (Pages Router is primary)
├── pages/                # Next.js pages
│   ├── _app.tsx         # Global app wrapper & theme hydration
│   ├── index.tsx        # Dashboard
│   ├── login.tsx        # Auth page
│   └── docs/[id].tsx    # Editor page
├── components/           # React components
│   ├── docs/
│   │   ├── Editor.tsx
│   │   ├── EditorSidebar.tsx
│   │   └── EditorSettingsPanel.tsx
│   └── SlashMenu.tsx
├── lib/                  # Utilities
│   ├── html-theme.ts    # Theme application engine
│   ├── slash-commands.ts
│   └── Callout.ts
└── styles/               # Global CSS
```

## 🎨 Theming Guide

### Switch Themes

Use the theme selector in the right sidebar of any document.

### Create Custom Themes

Edit `src/lib/html-theme.ts` to add new theme definitions:

```typescript
const editorThemes = [
  {
    name: "Your Theme",
    mode: "dark",
    colors: {
      bg: "#1a1a1a",
      surface: "#2d2d2d",
      text: "#e0e0e0",
      // ... more colors
    },
  },
];
```

## 📦 Dependencies

**Core**:

- `next` — React framework
- `react`, `react-dom` — UI library
- `typescript` — Type safety

**Editing**:

- `@tiptap/*` — Editor framework & extensions
- `lowlight` — Syntax highlighting

**Data**:

- `@prisma/client` — ORM
- `@prisma/adapter-pg` — PostgreSQL adapter
- `pg` — PostgreSQL driver

**Security & Utils**:

- `bcryptjs` — Password hashing
- `cookie` — Session management
- `dotenv` — Environment variables

**Styling**:

- `tailwindcss` — Utility-first CSS
- `lucide-react` — Icons

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Ensure environment variables are set in Vercel dashboard:

- `DOC_STORE_MODE=postgres`
- `DATABASE_URL=<your-postgres-url>`

### Docker & aaPanel (CI/CD GitHub Actions)

We've configured `output: "standalone"` in the Next.js setup alongside a robust, lightweight `Dockerfile` for easy 1-click deployments to your own server or directly to your aaPanel.

**Option A (Manual)**:
```bash
docker pull doc-vault:latest
docker run -d --name doc-vault -p 3003:3003 doc-vault:latest
```

**Option B (aaPanel via GitHub Actions)**:
Inside the `.github/workflows/deploy.yml`, you will find an automatic continuous deployment script. Just add your `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD` to your GitHub secrets, ensure your `docker` service is running on the host, and watch your changes auto-deploy to port `3003` on aaPanel upon pushing to `main`!

## 🤝 Contributing

We love contributions! Whether it's bug fixes, new themes, or feature ideas:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT — Feel free to use DocVault for personal and commercial projects.

## 🙋 Support

Found a bug or have a feature request? [Open an issue](https://github.com/TITANHACKY/docvault/issues).

---

**Happy writing!** ✨ Create, theme, and securely store with DocVault.
