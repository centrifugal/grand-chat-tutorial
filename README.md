# GrandChat — Django + React + Centrifugo messenger

This is the source code for the [Centrifugo Chat / Messenger Tutorial](https://centrifugal.dev/docs/tutorial/intro).

GrandChat is a real-time WebSocket chat that goes beyond the usual basics — a simplified
messenger (think Discord/Telegram/Slack) where a user can be a member of many rooms and
receive updates from all of them on one screen, in real time.

<img src="https://centrifugal.dev/img/grand-chat-tutorial-tech.png?v=1" />

## Tech stack

* **Frontend**: React + TypeScript (Vite), talking to the backend over a REST API and to
  Centrifugo over a WebSocket.
* **Backend**: Django + Django REST Framework, with PostgreSQL as the source of truth.
* **Real-time**: Centrifugo delivers events over WebSocket. The backend publishes events to
  Centrifugo over its HTTP API and/or via a transactional outbox / CDC (Debezium + Kafka).
* **Nginx** serves frontend and backend from a single origin; **JWT** authenticates Centrifugo
  connections and authorizes channel subscriptions.

The whole stack runs with a single `docker compose` command.

## Running locally

You need Docker with Docker Compose. From the repo root, build and start everything:

```sh
docker compose up --build
```

The first start takes a while (it also brings up Kafka, Debezium, Redis, Prometheus and
Grafana). Wait until the logs settle.

Then seed a tiny demo dataset — two users you can log in as (`alice` and `bob`, both with
password `password`) and a few rooms they both belong to:

```sh
docker compose exec backend python manage.py shell -c "from app.utils import setup_quickstart; setup_quickstart()"
```

Now open [http://localhost:9000](http://localhost:9000) and log in as **alice**. To see
real-time in action, log in as **bob** in a second browser (or an incognito window, so you
don't replace the alice session) and send messages between the two — they appear instantly,
and room membership changes sync live too.

![demo](grandchat.png?raw=true "Image of app")

### Optional: an admin user

If you want the Django admin (to create rooms by hand, inspect data, etc.), create a
superuser:

```sh
docker compose exec backend python manage.py createsuperuser
```

Then visit [http://localhost:9000/admin](http://localhost:9000/admin).

### Optional: large-scale dataset

To explore how the app scales (see the [scaling chapter](https://centrifugal.dev/docs/tutorial/scale)),
you can generate a large dataset — 100k users and rooms with 100 / 1k / 10k / 100k members:

```sh
docker compose exec backend python manage.py shell -c "from app.utils import setup_dev; setup_dev()"
```

Note these users have random passwords (you won't log in as them) — they exist to make rooms
large. Log in with your own superuser and use the **Discover** screen to join those rooms.

## How broadcasting works

The backend can deliver real-time events to Centrifugo in several modes, selected by
`CENTRIFUGO_BROADCAST_MODE` in `backend/app/settings.py`:

* `api` — publish over the Centrifugo HTTP API (lowest latency, at-most-once).
* `outbox` — transactional outbox table polled by Centrifugo (reliable).
* `cdc` — Debezium reads the WAL and streams changes through Kafka to Centrifugo (reliable, minimal DB overhead).
* `api_cdc` *(default)* — combine API (for latency) and CDC (for reliability); duplicates are dropped via idempotency keys.

Each mode relies on a matching Centrifugo consumer (`api` needs none, `outbox` needs the
`postgresql` consumer, `cdc`/`api_cdc` need the `kafka` consumer). The shipped
`centrifugo/config.json` already enables both consumers, so you can switch between modes by
changing only this one setting. The option is documented in detail next to
`CENTRIFUGO_BROADCAST_MODE` in `backend/app/settings.py`, and each mode is explained in the
tutorial.

## Useful endpoints

| URL | What |
| --- | --- |
| http://localhost:9000 | The app |
| http://localhost:9000/admin | Django admin |
| http://localhost:3000 | Grafana (admin / admin) |
| http://localhost:9090 | Prometheus |

## Push notifications

Web push notifications (an optional appendix) are disabled by default. Enabling them requires
Centrifugo PRO and Firebase setup — follow the
[push notifications chapter](https://centrifugal.dev/docs/tutorial/push_notifications) and the
comments next to `PUSH_NOTIFICATIONS_ENABLED` in `backend/app/settings.py`.
