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

logger = logging.getLogger(__name__)


def centrifugo_api_request(method, payload):
    """Send a command to the Centrifugo HTTP API and return the response."""
    return requests.post(
        f'{settings.CENTRIFUGO_HTTP_API_ENDPOINT}/api/{method}',
        json=payload,
        headers={
            'X-API-Key': settings.CENTRIFUGO_HTTP_API_KEY,
            'X-Centrifugo-Error-Mode': 'transport',
        },
    )


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

    # When push notifications are enabled, unregister the user's device from Centrifugo so
    # they stop receiving pushes after logout. With push off there are no devices to remove.
    if settings.PUSH_NOTIFICATIONS_ENABLED:
        device_id = json.loads(request.body).get('device_id', '')
        device_ids = [device_id] if device_id else []
        try:
            centrifugo_api_request('device_remove', {
                'users': [str(request.user.pk)],
                'ids': device_ids,
            })
        except requests.exceptions.RequestException as e:
            logger.error(e)
            return JsonResponse({'detail': 'failed to remove device'}, status=500)

    logout(request)
    return JsonResponse({})


@require_POST
def device_register_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'must be authenticated'}, status=403)

    device_info = json.loads(request.body).get('device')
    if not device_info:
        return JsonResponse({'detail': 'device not found'}, status=400)

    # Attach the current user, and map the frontend's "device_id" to Centrifugo's "id" field
    # so re-registration updates the existing device in place (instead of creating a new one
    # and orphaning the old token).
    device_info['user'] = str(request.user.pk)
    if device_info.get('device_id'):
        device_info['id'] = device_info.pop('device_id')

    try:
        resp = centrifugo_api_request('device_register', device_info)
    except requests.exceptions.RequestException as e:
        logger.error(e)
        return JsonResponse({'detail': 'failed to register device'}, status=500)

    if resp.status_code != 200:
        logger.error(resp.json())
        return JsonResponse({'detail': 'failed to register device'}, status=500)

    return JsonResponse({
        'device_id': resp.json().get('result', {}).get('id')
    })
