# Run it, edit it, ship it

Short version for Build Day. Full detail is in `README.md`.

## 1. Run it on your laptop

You need Node 20 or newer. Check with `node -v`.

```bash
cd AuraLink
npm install
npm run dev
```

Open [http://localhost:3000]

If `npm install` complains about the TypeScript version, you are on TypeScript 7. Next 15 does not
support it yet. This folder pins TypeScript 5.9, so a plain install is fine. Only worry if you
installed TypeScript globally.

Stop the server with `Ctrl + C`.

## 2. Edit it

Open the folder in VS Code. Files worth knowing:

- `lib/config.ts` — product name, seller name, fees, exchange rate, how long a link stays alive
- `app/globals.css` — every colour, radius and shadow in one place (top of the file)
- `app/(app)/page.tsx` — the dashboard
- `app/(app)/orders/page.tsx` — the orders page
- `components/CreateOrderModal.tsx` — the New order dialog
- `components/OrderDetails.tsx` — the order dialog and the sandbox tools
- `lib/mock.ts` — the seed data (products, customers, 150 days of orders)

Changes appear instantly in the browser. No restart needed unless you edit `next.config.mjs`.

Reset the demo data any time: avatar menu, top right, "Reset demo data".

## 3. Push it to GitHub

```bash
cd AuraLink
git init
git add .
git commit -m "AuraLink front end"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/AuraLink.git
git push -u origin main
```

`.gitignore` already excludes `node_modules` and `.next`, so the push stays small.

## 4. Deploy it

### Vercel (fastest, made for Next.js)

1. Go to vercel.com and sign in with GitHub.
2. Add New, Project, then import the repo you just pushed.
3. Leave every setting alone. Vercel detects Next.js.
4. Deploy. You get a live URL in about a minute.

Or from the terminal, if you prefer:

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

### Netlify

Only use this if Vercel is blocked. Build command `npm run build`, publish directory `.next`,
and install the official Next.js runtime plugin. Vercel is less fuss for this stack.

### Anything else

`npm run build` then `npm start`. That serves the production build on port 3000. Any Node host
(Render, Railway, Fly.io, a VPS) will run it.

## Before you present

- Run `npm run build` once locally. If it passes, the deploy will pass.
- Do a dry run of the demo path in `README.md` on the deployed URL, not just localhost.
- Remember: the Busha calls are mocked. Payments arrive through the Sandbox tools button inside
  any order. Say that out loud if a judge asks.
