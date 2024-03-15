# Django + React + Centrifugo chat (instant messenger) application 

This is a source code for [Centrifugo Chat/Messenger Tutorial](https://centrifugal.dev/docs/tutorial/intro).

<img src="https://centrifugal.dev/img/grand-chat-tutorial-tech.png?v=1" />

## Running locally

You need Docker with Docker Compose. First, run the app:

```sh
docker compose up
```

After containers started for the first time, from another terminal window (you must be in the repo root) create admin user (or better two since you want to try chatting, right?):

```sh
docker compose exec backend python manage.py createsuperuser
```

Then go to [http://localhost:9000/admin](http://localhost:9000/admin), use admin user credentials to login and create several rooms. Alternatively, you can open Django shell:

```sh
docker compose exec backend python manage.py shell
```

And then inside Django shell:

```python
from app.utils import setup_dev
setup_dev()
```

Running `setup_dev` function will create 100k users and then 4 rooms with different number of members (100, 1k, 10k, 100k).

Then go to [http://localhost:9000](http://localhost:9000) and enjoy the working app! Login using second user (from incognito tab to not logout the first one session, or simply use different browser/device) to see the real-time in action.

![demo](grandchat.png?raw=true "Image of app")
