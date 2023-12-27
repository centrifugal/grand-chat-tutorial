"""
Django settings for project.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from pathlib import Path
import os

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

# CENTRIFUGO_TOKEN_SECRET is used to create connection and subscription JWT.
# SECURITY WARNING: make it strong, keep it in secret, never send to the frontend!
CENTRIFUGO_TOKEN_SECRET = 'secret'
# CENTRIFUGO_HTTP_API_ENDPOINT used to set Centrifugo HTTP base endpoint.
# If you are using Centrifugo outside Docker - remember to change it.
CENTRIFUGO_HTTP_API_ENDPOINT = "http://centrifugo:8000"
# CENTRIFUGO_HTTP_API_KEY is used for auth in Centrifugo server HTTP API.
# SECURITY WARNING: make it strong, keep it in secret!
CENTRIFUGO_HTTP_API_KEY = 'api_key'
# CENTRIFUGO_BROADCAST_MODE sets the mode how to broadcast messages to Centrifugo
# in this example app.
# 
# Possible options:
#
# 1. "api" - broadcast over Centrifugo HTTP API
# 2. "outbox" – use transactional outbox pattern 
# 3. "cdc" – use CDC approach where Debezium reads WAL and publishes messages to Kafka.
# 4. "api_cdc" - combined mode where we send message over API but also over CDC. Since
#                we use idempotency keys here – Centrifugo drops duplicate messages. This
#                allows achieving the best latency and still reliable publications. It's
#                also totally possible to combine api with outbox (and, for example, do
#                not use LISTEN/NOTIFY trigger), but we skipped such combination here.
#
# REMEMBER to also update Centrifugo consumer configuration when switching the mode.
CENTRIFUGO_BROADCAST_MODE = 'api_cdc'
# CENTRIFUGO_OUTBOX_PARTITIONS is the number of partitions in "outbox" broadcast mode case,
# must match Centrifigo PostgreSQL consumer configuration.
# Partitions start from 0, so if CENTRIFUGO_OUTBOX_PARTITIONS is 1, then the actual
# partition number when saving outbox event must be in range [0, 1).
CENTRIFUGO_OUTBOX_PARTITIONS = 1

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
