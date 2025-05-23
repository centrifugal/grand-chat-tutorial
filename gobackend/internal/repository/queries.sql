-- name: CreateUser :one
INSERT INTO users (username, password, email)
VALUES ($1, $2, $3)
RETURNING *;
-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1;
-- name: GetUserByUsername :one
SELECT *
FROM users
WHERE username = $1;
-- name: CreateRoom :one
INSERT INTO rooms (name)
VALUES ($1)
RETURNING *;
-- name: GetRoomByID :one
SELECT *
FROM rooms
WHERE id = $1;
-- name: GetRoomByName :one
SELECT *
FROM rooms
WHERE name = $1;
-- name: IncrementRoomVersion :one
UPDATE rooms
SET version = version + 1
WHERE id = $1
RETURNING *;
-- name: AddRoomMember :one
INSERT INTO room_members (room_id, user_id)
VALUES ($1, $2)
RETURNING *;
-- name: GetRoomMembers :many
SELECT u.*
FROM users u
    JOIN room_members rm ON rm.user_id = u.id
WHERE rm.room_id = $1;
-- name: CreateMessage :one
INSERT INTO messages (room_id, user_id, content)
VALUES ($1, $2, $3)
RETURNING *;
-- name: GetRoomMessages :many
SELECT m.*,
    u.username as author_username
FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
WHERE m.room_id = $1
ORDER BY m.created_at DESC
LIMIT $2 OFFSET $3;
-- name: AddOutboxMessage :one
INSERT INTO outbox (method, payload, partition)
VALUES ($1, $2, $3)
RETURNING *;
-- name: AddCDCMessage :one
INSERT INTO cdc (method, payload, partition)
VALUES ($1, $2, $3)
RETURNING *;
-- name: GetOutboxMessages :many
SELECT *
FROM outbox
WHERE partition = $1
ORDER BY created_at ASC
LIMIT $2;
-- name: DeleteOutboxMessage :exec
DELETE FROM outbox
WHERE id = $1;
-- name: GetCDCMessages :many
SELECT *
FROM cdc
WHERE partition = $1
ORDER BY created_at ASC
LIMIT $2;
-- name: ListRooms :many
SELECT *
FROM rooms
ORDER BY created_at DESC;