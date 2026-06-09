# wreislab-create

Interactive CLI to scaffold production-ready projects — pick your stack, choose your addons, and get a fully wired codebase in seconds.

```bash
npx wreislab-create
```

---

## What's included

Every generated project comes with:

- Structured project layout with Docker support
- `.env.example` pre-filled for every active addon
- `docker-compose.yml` for the full stack + `docker-compose.infra.yml` for infra-only startup
- Dockerfile ready for production (multi-stage, Alpine base)
- GitHub Actions workflow for Docker image publishing
- Health (`/health`) and metrics (`/metrics` — Prometheus) endpoints out of the box

---

## Quick start

### Create a new project

```bash
npx wreislab-create
```

The CLI will guide you through:

1. **Project name**
2. **Preset** — a starting point (see presets below)
3. **Backend framework** — NestJS is available now; more coming
4. **Auth** — None / OIDC / JWT
5. **Database** — None / PostgreSQL / MySQL / SQLite / MongoDB
6. **Cache** — None / Redis / Dragonfly
7. **Queue** — None / RabbitMQ
8. **AI integration** — None / Multi-provider
9. **Realtime** — WebSocket / Webhook / both / none
10. **Frontend** — React / None
11. **Package manager** — pnpm / npm / yarn

At the end it installs dependencies and you're ready to go.

### Add a feature to an existing project

Run inside a project that was created with `wreislab-create`:

```bash
npx wreislab-create add
```

It reads `.wreislab.json` in your project root and shows only the features not yet active.

---

## Presets

| Preset | What you get |
|--------|-------------|
| **Quick App** | NestJS + React, no auth, no database — start coding immediately |
| **Simple CRUD** | JWT auth + PostgreSQL + React — the baseline for most services |
| **Full OIDC App** | OIDC + PostgreSQL + Redis + React — production-ready from day one |
| **Real-Time Data** | WebSocket (Socket.io) + React — live updates out of the box |
| **API Only** | Backend only, no frontend generated |
| **Frontend Only** | React SPA only, no backend generated |
| **Custom** | Choose everything manually |

---

## Available addons

### Auth
| Option | Details |
|--------|---------|
| `oidc` | OIDC via JWKS — works with Pocket ID, Keycloak, Auth0, or any standard provider |
| `jwt` | Simple JWT with local secret — no external provider needed |

### Database
| Option | Details |
|--------|---------|
| `postgres` | PostgreSQL via TypeORM |
| `mysql` | MySQL via TypeORM |
| `sqlite` | SQLite via TypeORM — no container needed |
| `mongo` | MongoDB via Mongoose |

### Cache
| Option | Details |
|--------|---------|
| `redis` | Redis via cache-manager + @keyv/redis |
| `dragonfly` | Dragonfly — Redis-compatible, faster |

### Queue
| Option | Details |
|--------|---------|
| `rabbitmq` | RabbitMQ — producer + consumer wired up |

### AI integration
| Option | Details |
|--------|---------|
| `multi` | Factory-based provider: set `AI_PROVIDER` in `.env` and swap without changing code |

Supported providers out of the box:

| `AI_PROVIDER` | Provider | Default model |
|--------------|----------|---------------|
| `nvidia` *(default)* | NVIDIA NIM — **free tier** | `google/gemma-4-31b-it` |
| `openai` | OpenAI | `gpt-4o-mini` |
| `anthropic` | Claude (Anthropic) | `claude-haiku-4-5` |
| `gemini` | Google Gemini | `gemini-2.0-flash` |
| `deepseek` | DeepSeek | `deepseek-chat` |
| `kimi` | Kimi (Moonshot AI) | `moonshot-v1-8k` |
| `groq` | Groq | `llama-3.3-70b-versatile` |
| `custom` | Any OpenAI-compatible endpoint | configurable |

Generated endpoints: `POST /ai/chat` (full response) and `POST /ai/chat/stream` (SSE streaming).  
See `docs/ai.md` in the generated project for usage examples and how to get a free NVIDIA API key.

### Realtime
| Option | Details |
|--------|---------|
| `websocket` | Socket.io gateway — push events to frontend |
| `webhook` | HTTP endpoint to receive external events |

---

## Tech stack

### Backend (NestJS)
- **Runtime**: Node.js ≥ 26
- **Framework**: NestJS 11 + Fastify 5
- **Language**: TypeScript 6
- **Package manager**: pnpm 11
- **Validation**: class-validator + class-transformer (when AI addon is active)
- **Logging**: nestjs-pino + pino-pretty
- **Config**: @nestjs/config + Joi schema validation
- **Docs**: Swagger UI at `/docs`
- **Metrics**: Prometheus-compatible at `/metrics`
- **Testing**: Jest + Supertest (unit + e2e)

### Frontend (React)
- **Bundler**: Vite 8
- **Language**: TypeScript 6
- **UI**: shadcn/ui components + Tailwind CSS v4
- **Data fetching**: TanStack Query v5
- **HTTP client**: ky v2
- **Forms/validation**: Zod v4
- **Notifications**: Sonner
- **Testing**: Vitest + Testing Library

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Node.js | 22.0.0 (CLI) / 26.0.0 (generated projects) |
| pnpm | 9.0.0 |
| Docker | any recent version (only for infra addons) |

---

## Roadmap

The current release covers NestJS + React. The plan is to expand one framework at a time, in this order:

### Backends
- [ ] **.NET 8** — ASP.NET Core, Entity Framework, all addons
- [ ] **Go** — Gin or Chi, GORM, all addons
- [ ] **Bun** — Elysia or Hono, TypeScript-native runtime
- [ ] **Spring Boot** — Java 21, Spring Data, Spring Security
- [ ] **Python** — FastAPI, SQLAlchemy, async-first
- [ ] **Ruby on Rails** — full-stack template (back + front in one, Hotwire/Turbo)

### Frontends
- [ ] **Angular** — standalone components, Angular Material, OIDC support
- [ ] **Vue.js** — Vue 3 + Pinia + shadcn-vue

### General
- [ ] More presets combining the new frameworks
- [ ] Improvements based on real usage and feedback

---

## License

MIT
