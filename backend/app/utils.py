from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.contrib.auth.hashers import make_password
from chat.models import RoomMember, Room


# To speed up test users creation it's possible to add MD5PasswordHasher temporarily
# and use make_password(password, None, 'md5').
# PASSWORD_HASHERS = [
#     "django.contrib.auth.hashers.PBKDF2PasswordHasher",
#     "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
#     "django.contrib.auth.hashers.Argon2PasswordHasher",
#     "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
#     "django.contrib.auth.hashers.ScryptPasswordHasher",
#     "django.contrib.auth.hashers.MD5PasswordHasher",
# ]
def create_users(n):
    users = []
    total = 0
    for _ in range(n):
        username = get_random_string(10)
        email = f"{username}@example.com"
        password = get_random_string(50)
        user = User(username=username, email=email, password=make_password(password, None, 'md5'))
        users.append(user)

        if len(users) >= 100:
            total += len(users)
            User.objects.bulk_create(users)
            users = []
            print("Total users created:", total)

    # Create remaining users.
    if users:
        total += len(users)
        User.objects.bulk_create(users)
        print("Total users created:", total)


def create_room(name):
    return Room.objects.create(name=name)


def fill_room(room_id, limit):
    members = []
    total = 0
    room = Room.objects.get(pk=room_id)
    for user in User.objects.all()[:limit]:
        members.append(RoomMember(room=room, user=user))

        if len(members) >= 100:
            total += len(members)
            RoomMember.objects.bulk_create(members, ignore_conflicts=True)
            members = []
            print("Total members created:", total)

    # Create remaining members.
    if members:
        total += len(members)
        RoomMember.objects.bulk_create(members, ignore_conflicts=True)
        print("Total members created:", total)


def setup_quickstart():
    """Create a tiny demo dataset so you can start chatting immediately.

    It creates two users you can actually log in as – alice and bob, both with
    password "password" – and a few rooms that both users are members of. This
    is the fastest way to try the app locally. For large-scale load testing use
    setup_dev() below instead.
    """
    users = []
    for username in ['alice', 'bob']:
        user, _ = User.objects.get_or_create(username=username)
        user.set_password('password')
        user.save()
        users.append(user)

    for name in ['General', 'Random', 'Centrifugo']:
        room, _ = Room.objects.get_or_create(name=name)
        for user in users:
            RoomMember.objects.get_or_create(room=room, user=user)

    print("Created users 'alice' and 'bob' (password: 'password') and 3 rooms.")


def setup_dev():
    create_users(100_000)
    r1 = create_room('Centrifugo')
    fill_room(r1.pk, 100_000)
    r2 = create_room('Movies')
    fill_room(r2.pk, 10_000)
    r3 = create_room('Programming')
    fill_room(r3.pk, 1_000)
    r4 = create_room('Football')
    fill_room(r4.pk, 100)
