# Django and Centrifugo chat application 

This is a source code for [Centrifugo Chat/Messenger Tutorial](https://centrifugal.dev/docs/tutorial/intro). It's super simple to run it locally - all you need is Docker.

## Getting Started

```sh
docker-compose up --build
```

Then (you must be in the repo root) run migrations and create user (or two):

```sh
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

Go to [http://localhost:9000/admin](http://localhost:9000/admin), use superuser credentials to login and create several rooms.

Then go to [http://localhost:9000](http://localhost:9000) and enjoy the working app!

![demo](?)
