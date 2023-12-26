# Django + React + Centrifugo chat (instant messenger) application 

This is a source code for [Centrifugo Chat/Messenger Tutorial](https://centrifugal.dev/docs/tutorial/intro).

<img src="https://centrifugal.dev/img/grand-chat-tutorial-tech.png?v=1" />

## Running locally

All you need is Docker with Docker Compose. Run the app:

```sh
docker compose up --build
```

After containers started, from another terminal window (you must be in the repo root) run database migrations:

```sh
docker compose exec backend python manage.py migrate
```

And then create admin user (or two):

```
docker compose exec backend python manage.py createsuperuser
```

Go to [http://localhost:9000/admin](http://localhost:9000/admin), use admin user credentials to login and create several rooms.

Then go to [http://localhost:9000](http://localhost:9000) and enjoy the working app! Login using second user to see the real-time in action.

![demo](grandchat.png?raw=true "Image of app")
