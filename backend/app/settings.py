"""
Django settings for project.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from pathlib import Path
import os

# SECURITY WARNING: we enabled MD5PasswordHasher here for faster creation
# of 100k users in app/utils.py. But don't use in production - remove this
# PASSWORD_HASHERS option from settings to use Django's sane defaults.
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-x7gca%3()9-8a!mo%v+x2_f4to#yvo(d1+@g8*sv4bz$-y1ya7'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

#ALLOWED_HOSTS = []
ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = ['http://localhost:9000']
CSRF_COOKIE_SAMESITE = 'Strict'
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True

# === Centrifugo integration settings ===
# These options are introduced step by step in the tutorial. Their values must match the
# Centrifugo configuration in centrifugo/config.json – if you change one side, change the
# other too.

# CENTRIFUGO_TOKEN_SECRET is used to create connection and subscription JWTs (see the
# "Integrating Centrifugo" chapter). It MUST match "client.token.hmac_secret_key" in
# centrifugo/config.json.
# SECURITY WARNING: make it strong, keep it in secret, never send to the frontend!
CENTRIFUGO_TOKEN_SECRET = 'secret'

# CENTRIFUGO_HTTP_API_ENDPOINT is the base URL of the Centrifugo HTTP API, used by the
# backend to broadcast messages (and to manage devices for push notifications). Here
# "centrifugo" is the docker compose service name – change it if you run Centrifugo
# outside of this compose setup.
CENTRIFUGO_HTTP_API_ENDPOINT = "http://centrifugo:8000"

# CENTRIFUGO_HTTP_API_KEY authenticates the backend's requests to the Centrifugo HTTP API.
# It MUST match "http_api.key" in centrifugo/config.json.
# SECURITY WARNING: make it strong, keep it in secret!
CENTRIFUGO_HTTP_API_KEY = 'api_key'

# CENTRIFUGO_BROADCAST_MODE selects how the backend delivers events to Centrifugo. Each
# mode is explained in the tutorial, and which Centrifugo consumer must be enabled in
# centrifugo/config.json depends on the mode:
#
#   "api"     – publish directly over the Centrifugo HTTP API. Lowest latency, but if the
#               API call fails the event is lost. Needs NO consumer in config.json.
#               Introduced in the "Integrating Centrifugo" chapter.
#   "outbox"  – write to a transactional outbox table that Centrifugo polls. Reliable.
#               Needs the "postgresql" consumer in config.json (its "num_partitions" must
#               equal CENTRIFUGO_OUTBOX_PARTITIONS below). See "Broadcast: outbox and CDC".
#   "cdc"     – Debezium reads the PostgreSQL WAL and streams changes through Kafka to
#               Centrifugo. Reliable, with minimal database overhead. Needs the "kafka"
#               consumer in config.json, the Kafka/Debezium services, and wal_level=logical
#               on PostgreSQL (already set in docker-compose.yml). See "Broadcast: outbox and CDC".
#   "api_cdc" – combine "api" (for latency) and "cdc" (for reliability); duplicate events
#               are dropped by Centrifugo via idempotency keys. This is the recommended
#               approach and the default here. Needs the "kafka" consumer (same as "cdc").
#               Introduced in the "Solving CDC latency" section.
#
# The shipped centrifugo/config.json enables BOTH the "postgresql" and "kafka" consumers,
# so you can switch between these modes without editing it. Pure "api" mode needs no
# consumer at all – with the "kafka" consumer still enabled Centrifugo just logs harmless
# "topic not found" lines until the first CDC event is produced.
CENTRIFUGO_BROADCAST_MODE = 'api_cdc'

# CENTRIFUGO_OUTBOX_PARTITIONS is used only in "outbox" mode. It MUST match "num_partitions"
# of the "postgresql" consumer in centrifugo/config.json. We pick a partition with
# hash(room_id) % CENTRIFUGO_OUTBOX_PARTITIONS, so with the value 1 every event goes to
# partition 0 (Centrifugo reads partitions in the range [0, CENTRIFUGO_OUTBOX_PARTITIONS)).
CENTRIFUGO_OUTBOX_PARTITIONS = 1

# Before you set PUSH_NOTIFICATIONS_ENABLED to True, you need:
# - Update centrifugo/centrifugo image to centrifugo/centrifugo-pro image in docker-compose.yml
# - Make sure you are using CENTRIFUGO_BROADCAST_MODE 'cdc' or 'api_cdc' since we only implemented pushes for these modes here.
# - Put centrifugo/fcm.json file with your app FCM credentials (load it from Firebase console as described in tutorial)
# - Update centrifugo/config.json and set "push_notifications.enabled" field to true
# - Add backend/app/local_settings.py file with PUSH_NOTIFICATIONS_VAPID_PUBLIC_KEY and PUSH_NOTIFICATIONS_FIREBASE_CONFIG (tutorial describes how to get those).
# - Add frontend/public/firebase-config.js file with Firebase config (same as PUSH_NOTIFICATIONS_FIREBASE_CONFIG: self.firebaseConfig = {...}, see tutorial).
# - Restart app (docker compose up) and re-login (re-login required here to inherit updated user settings).
PUSH_NOTIFICATIONS_ENABLED = False
PUSH_NOTIFICATIONS_VAPID_PUBLIC_KEY = ''
PUSH_NOTIFICATIONS_FIREBASE_CONFIG = {}

if os.path.isfile(os.path.join(BASE_DIR, 'app', 'local_settings.py')):
    from .local_settings import *

INSTALLED_APPS = [
    'rest_framework',
    'chat',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100
}

ROOT_URLCONF = 'app.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'app.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'grandchat',
        'USER': 'grandchat',
        'PASSWORD': 'grandchat',
        'HOST': 'db',
        'PORT': '5432',
    }
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'

STATIC_ROOT = os.path.join(BASE_DIR, 'static')


# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# LOGGING = {
#     'version': 1,
#     'filters': {
#         'require_debug_true': {
#             '()': 'django.utils.log.RequireDebugTrue',
#         }
#     },
#     'handlers': {
#         'console': {
#             'level': 'DEBUG',
#             'filters': ['require_debug_true'],
#             'class': 'logging.StreamHandler',
#         }
#     },
#     'loggers': {
#         'django.db.backends': {
#             'level': 'DEBUG',
#             'handlers': ['console'],
#         }
#     }
# }
