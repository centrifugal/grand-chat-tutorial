# GrandChat frontend

The React + TypeScript single-page app for [GrandChat](../README.md), built with
[Vite](https://vitejs.dev/). It talks to the Django backend over a REST API and to Centrifugo
over a WebSocket using the [`centrifuge`](https://github.com/centrifugal/centrifuge-js) SDK.

Normally you run the whole stack from the repo root with `docker compose up` — the frontend is
served by its container with hot reload. This README is for working on the frontend on its own.

## Requirements

* Node.js >= 20 (required by Vite 8)

## Local development

```sh
npm install
npm run dev
```

This starts the Vite dev server on http://localhost:5173. Note that the app expects the rest
of the stack (backend, Centrifugo, Nginx) to be reachable on the same origin via Nginx
(http://localhost:9000), so for a full experience run everything through Docker Compose.

## Scripts

* `npm run dev` — start the dev server with hot reload.
* `npm run build` — type-check (`tsc -b`) and build a production bundle into `dist/`.
* `npm run lint` — run ESLint.
* `npm run preview` — preview the production build locally.

## Project structure

* `src/types.ts` — shared TypeScript interfaces that mirror the backend API and the real-time
  event payloads. Everything else builds on these.
* `src/App.tsx` — top-level layout, routing, the chat-state reducer, the Centrifugo connection
  and the real-time event handling.
* `src/AppApi.tsx` — all REST API calls (via `axios`).
* `src/Chat*.tsx` — the screens: login, room list, room detail, room search, layout.
* `src/PushNotification.tsx` — optional web push (FCM) helpers.
