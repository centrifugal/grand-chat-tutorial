import json
import logging
import requests
from requests.adapters import HTTPAdapter, Retry
from django.conf import settings
from django.db import transaction
from django.db.models import Exists, OuterRef, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.generics import ListCreateAPIView
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from .models import Message, Room, RoomMember, Outbox, CDC
from .serializers import MessageSerializer, RoomSearchSerializer, RoomSerializer, RoomMemberSerializer


class RoomListViewSet(ListModelMixin, GenericViewSet):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.annotate(
            member_count=Count('memberships__id')
        ).filter(
            memberships__user_id=self.request.user.pk
        ).select_related('last_message', 'last_message__user').order_by('-bumped_at')


class RoomDetailViewSet(RetrieveModelMixin, GenericViewSet):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.annotate(
            member_count=Count('memberships')
        ).filter(memberships__user_id=self.request.user.pk)


class RoomSearchViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSearchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_membership = RoomMember.objects.filter(
            room=OuterRef('pk'),
            user=user
        )
        return Room.objects.annotate(
            is_member=Exists(user_membership)
        ).order_by('name')


class CentrifugoMixin:
    # A helper method to return the list of channels for all current members of specific room.
    # So that the change in the room may be broadcasted to all the members.
    def get_room_member_channels(self, room_id):
        members = RoomMember.objects.filter(room_id=room_id).values_list('user', flat=True)
        return [f'personal:{user_id}' for user_id in members]

    def broadcast_room(self, room, broadcast_payload):
        room_id = room.pk
        room_name = room.name

        # Using Centrifugo HTTP API is the simplest way to send real-time message, and usually
        # it provides the best latency. The trade-off here is that error here may result in
        # lost real-time event. Depending on the application requirements this may be fine or not.  
        def broadcast():
            session = requests.Session()
            retries = Retry(total=1, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
            session.mount('http://', HTTPAdapter(max_retries=retries))
            try:
                session.post(
                    settings.CENTRIFUGO_HTTP_API_ENDPOINT + '/api/broadcast',
                    data=json.dumps(broadcast_payload),
                    headers={
                        'Content-type': 'application/json', 
                        'X-API-Key': settings.CENTRIFUGO_HTTP_API_KEY,
                        'X-Centrifugo-Error-Mode': 'transport'
                    }
                )
            except requests.exceptions.RequestException as e:
                logging.error(e)

        if settings.CENTRIFUGO_BROADCAST_MODE == 'api':
            # We need to use on_commit here to not send notification to Centrifugo before
            # changes applied to the database. Since we are inside transaction.atomic block
            # broadcast will happen only after successful transaction commit.
            transaction.on_commit(broadcast)

        elif settings.CENTRIFUGO_BROADCAST_MODE == 'outbox':
            # In outbox case we can set partition for parallel processing, but
            # it must be in predefined range and match Centrifugo PostgreSQL
            # consumer configuration.
            partition = hash(room_id)%settings.CENTRIFUGO_OUTBOX_PARTITIONS
            # Creating outbox object inside transaction will guarantee that Centrifugo will
            # process the command at some point. In normal conditions – almost instantly.
            Outbox.objects.create(method='broadcast', payload=broadcast_payload, partition=partition)

        elif settings.CENTRIFUGO_BROADCAST_MODE == 'cdc':
            # In cdc case Debezium will use this field for setting Kafka partition.
            # We should not prepare proper partition ourselves in this case.
            partition = hash(room_id)
            # Creating outbox object inside transaction will guarantee that Centrifugo will
            # process the command at some point. In normal conditions – almost instantly. In this
            # app Debezium will perform CDC and send outbox events to Kafka, event will be then
            # consumed by Centrifugo. The advantages here is that Debezium reads WAL changes and
            # has a negligible overhead on database performance. And most efficient partitioning.
            # The trade-off is that more hops add more real-time event delivery latency. May be
            # still instant enough though.
            CDC.objects.create(method='broadcast', payload=broadcast_payload, partition=partition)

        elif settings.CENTRIFUGO_BROADCAST_MODE == 'api_cdc':
            if len(broadcast_payload['channels']) <= 1000000:
                # We only use low-latency broadcast over API for not too big rooms, it's possible
                # to adjust as required of course.
                transaction.on_commit(broadcast)

            partition = hash(room_id)
            CDC.objects.create(method='broadcast', payload=broadcast_payload, partition=partition)

        else:
            raise ValueError(f'unknown CENTRIFUGO_BROADCAST_MODE: {settings.CENTRIFUGO_BROADCAST_MODE}')

        is_message_added = broadcast_payload.get('data', {}).get('type') == 'message_added'
        if is_message_added and settings.PUSH_NOTIFICATIONS_ENABLED and 'cdc' in settings.CENTRIFUGO_BROADCAST_MODE:
            partition = hash(room_id)
            payload = {
                "recipient": {
                    "filter": {
                        "topics": [f'chat:messages:{room_id}']
                    }
                },
                "notification": {
                    "fcm": {
                        "message": {
                            "notification": {
                                "title": room_name,
                                "body": broadcast_payload.get('data', {}).get('body', {}).get('content', '')
                            },
                            "webpush": {
                              "fcm_options": {
                                "link": f'http://localhost:9000/rooms/{room_id}'
                              }
                            }
                        }
                    }
                }
            }
            CDC.objects.create(method='send_push_notification', payload=payload, partition=partition)

    def update_user_room_topic(self, user_id, room_id, op):
        if not settings.PUSH_NOTIFICATIONS_ENABLED:
            return
        if 'cdc' not in settings.CENTRIFUGO_BROADCAST_MODE:
            return
        partition = hash(room_id)
        CDC.objects.create(method='user_topic_update', payload={
            'user': str(user_id),
            'topics': ['chat:messages:' + str(room_id)],
            'op': op
        }, partition=partition)


class MessageListCreateAPIView(ListCreateAPIView, CentrifugoMixin):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['room_id']
        get_object_or_404(RoomMember, user=self.request.user, room_id=room_id)
        return Message.objects.filter(
            room_id=room_id).prefetch_related('user', 'room').order_by('-created_at')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        room_id = self.kwargs['room_id']
        room = Room.objects.select_for_update().get(id=room_id)
        room.increment_version()
        channels = self.get_room_member_channels(room_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(room=room, user=request.user)
        room.last_message = obj
        room.bumped_at = timezone.now()
        room.save()
        broadcast_payload = {
            'channels': channels,
            'data': {
                'type': 'message_added',
                'body': serializer.data
            },
            'idempotency_key': f'message_{serializer.data["id"]}'
        }
        self.broadcast_room(room, broadcast_payload)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class JoinRoomView(APIView, CentrifugoMixin):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, room_id):
        room = Room.objects.select_for_update().get(id=room_id)
        room.increment_version()
        if RoomMember.objects.filter(user=request.user, room=room).exists():
            return Response({"message": "already a member"}, status=status.HTTP_409_CONFLICT)
        obj, _ = RoomMember.objects.get_or_create(user=request.user, room=room)
        channels = self.get_room_member_channels(room_id)
        obj.room.member_count = len(channels)
        body = RoomMemberSerializer(obj).data

        broadcast_payload = {
            'channels': channels,
            'data': {
                'type': 'user_joined',
                'body': body
            },
            'idempotency_key': f'user_joined_{obj.pk}'
        }
        self.broadcast_room(room, broadcast_payload)
        self.update_user_room_topic(request.user.pk, room_id, 'add')
        return Response(body, status=status.HTTP_200_OK)


class LeaveRoomView(APIView, CentrifugoMixin):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, room_id):
        room = Room.objects.select_for_update().get(id=room_id)
        room.increment_version()
        channels = self.get_room_member_channels(room_id)
        obj = get_object_or_404(RoomMember, user=request.user, room=room)
        obj.room.member_count = len(channels) - 1
        pk = obj.pk
        obj.delete()
        body = RoomMemberSerializer(obj).data

        broadcast_payload = {
            'channels': channels,
            'data': {
                'type': 'user_left',
                'body': body
            },
            'idempotency_key': f'user_left_{pk}'
        }
        self.broadcast_room(room, broadcast_payload)
        self.update_user_room_topic(request.user.pk, room_id, 'remove')
        return Response(body, status=status.HTTP_200_OK)
