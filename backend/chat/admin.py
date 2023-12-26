from django.contrib import admin
from .models import Room, RoomMember, Message


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'bumped_at')
    search_fields = ('name',)
    ordering = ('-created_at',)


@admin.register(RoomMember)
class RoomMemberAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'joined_at')
    search_fields = ('room__name', 'user__username')
    ordering = ('-joined_at',)
    autocomplete_fields = ('room', 'user',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('room', 'user')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'created_at', 'short_content')
    search_fields = ('room__name', 'user__username', 'content')
    list_filter = ('room', 'user')
    ordering = ('-created_at',)
    autocomplete_fields = ('room', 'user',)

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('room', 'user')

    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
