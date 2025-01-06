import json
import jwt
import time
import requests
import logging

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_POST
from django.conf import settings


def get_csrf(request):
    return JsonResponse({}, headers={'X-CSRFToken': get_token(request)})


def get_connection_token(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'unauthorized'}, status=401)

    token_claims = {
        'sub': str(request.user.pk),
        'exp': int(time.time()) + 120
    }
    token = jwt.encode(token_claims, settings.CENTRIFUGO_TOKEN_SECRET)

    return JsonResponse({'token': token})


def get_subscription_token(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'unauthorized'}, status=401)

    channel = request.GET.get('channel')
    if channel != f'personal:{request.user.pk}':
        return JsonResponse({'detail': 'permission denied'}, status=403)

    token_claims = {
        'sub': str(request.user.pk),
        'exp': int(time.time()) + 300,
        'channel': channel
    }
    token = jwt.encode(token_claims, settings.CENTRIFUGO_TOKEN_SECRET)

    return JsonResponse({'token': token})


@require_POST
def login_view(request):
    credentials = json.loads(request.body)
    username = credentials.get('username')
    password = credentials.get('password')

    if not username or not password:
        return JsonResponse({'detail': 'provide username and password'}, status=400)

    user = authenticate(username=username, password=password)
    if not user:
        return JsonResponse({'detail': 'invalid credentials'}, status=400)

    login(request, user)
    return JsonResponse({
        'id': user.pk,
        'username': user.username,
        'settings': {
            'push_notifications': {
                'enabled': settings.PUSH_NOTIFICATIONS_ENABLED,
                'vapid_public_key': settings.PUSH_NOTIFICATIONS_VAPID_PUBLIC_KEY,
                'firebase_config': settings.PUSH_NOTIFICATIONS_FIREBASE_CONFIG,
            }
        }
    })


@require_POST
def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'must be authenticated'}, status=403)

    device_ids = []
    device_id = json.loads(request.body).get('device_id', '')
    if device_id:
        device_ids = [device_id]

    session = requests.Session()
    try:
        resp = session.post(
            settings.CENTRIFUGO_HTTP_API_ENDPOINT + '/api/device_remove',
            data=json.dumps({
                'users': [str(request.user.pk)],
                'ids': device_ids
            }),
            headers={
                'Content-type': 'application/json',
                'X-API-Key': settings.CENTRIFUGO_HTTP_API_KEY,
                'X-Centrifugo-Error-Mode': 'transport'
            }
        )
    except requests.exceptions.RequestException as e:
        logging.error(e)
        return JsonResponse({'detail': 'failed to register device'}, status=500)

    logout(request)
    return JsonResponse({})


@require_POST
def device_register_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'must be authenticated'}, status=403)

    device_info = json.loads(request.body).get('device')
    if not device_info:
        return JsonResponse({'detail': 'device not found'}, status=400)

    # Attach user ID to device info.
    device_info["user"] = str(request.user.pk)

    session = requests.Session()
    try:
        resp = session.post(
            settings.CENTRIFUGO_HTTP_API_ENDPOINT + '/api/device_register',
            data=json.dumps(device_info),
            headers={
                'Content-type': 'application/json',
                'X-API-Key': settings.CENTRIFUGO_HTTP_API_KEY,
                'X-Centrifugo-Error-Mode': 'transport'
            }
        )
    except requests.exceptions.RequestException as e:
        logging.error(e)
        return JsonResponse({'detail': 'failed to register device'}, status=500)

    if resp.status_code != 200:
        logging.error(resp.json())
        return JsonResponse({'detail': 'failed to register device'}, status=500)

    return JsonResponse({
        'device_id': resp.json().get('result', {}).get('id')
    })
