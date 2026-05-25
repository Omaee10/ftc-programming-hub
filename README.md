FTC Programming Hub is a [Next.js](https://nextjs.org) app for learning
FIRST Tech Challenge robotics programming. It ships with a Monaco-based
in-browser editor, 53 built-in challenges, and a **real Java grader**
microservice (`grader/`) that compiles every submission with
`javax.tools.JavaCompiler` and runs type-aware AST rules.

## Architecture

```
Next.js (src/)
  ├─ Monaco editor + workspace UI
  ├─ /api/grade          → proxies to the grader, with LRU cache + rate limit
  └─ /api/grade/requirements

grader/ (Java + Javalin, deployable via Docker — e.g. Render free tier)
  ├─ in-memory javac with FTC SDK stubs (and optional real jars)
  ├─ structured diagnostics + friendly message rewriter
  └─ per-challenge type-aware rubric engine
```

## Getting Started

You need the Next.js app **and** the grader running side-by-side.

```bash
# 1. Start the Java grader
docker compose -f grader/docker-compose.yml up --build      # serves :8080

# 2. Configure the web app
cp .env.example .env.local                                  # then fill in keys
#    Make sure GRADER_URL=http://localhost:8080
#    and GRADER_SECRET matches what docker-compose passed

# 3. Start the Next.js app
npm install
npm run dev                                                 # serves :3000
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

See `grader/README.md` for grader internals, FTC SDK sourcing, production
deployment, and adding new challenge rubrics.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
