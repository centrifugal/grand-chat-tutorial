from rest_framework import serializers
from .models import Room, RoomMember, Message
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']


class LastMessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'content', 'user', 'created_at']


class RoomSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    last_message = LastMessageSerializer(read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'name', 'version', 'bumped_at', 'member_count', 'last_message']


class MessageRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'version', 'bumped_at']


class RoomSearchSerializer(serializers.ModelSerializer):

    is_member = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'name', 'created_at', 'is_member']


class RoomMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    
    class Meta:
        model = RoomMember
        fields = ['room', 'user']


class MessageSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    room = MessageRoomSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'content', 'user', 'room', 'created_at']
