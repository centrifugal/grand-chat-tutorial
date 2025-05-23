package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/gambitier/grand-chat-tutorial/gobackend/internal/middleware"
	repository "github.com/gambitier/grand-chat-tutorial/gobackend/internal/repository"
)

type CreateRoomRequest struct {
	Name string `json:"name"`
}

type CreateMessageRequest struct {
	Content string `json:"content"`
}

type JoinRoomRequest struct {
	// No fields needed, but can be extended
}

func RegisterChatRoutes(router fiber.Router, queries *repository.Queries) {
	router.Use(middleware.JWTProtected())

	router.Get("/rooms", func(c *fiber.Ctx) error {
		// List all rooms
		rooms, err := queries.ListRooms(context.Background())
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not fetch rooms"})
		}
		return c.JSON(rooms)
	})

	router.Post("/rooms", func(c *fiber.Ctx) error {
		var req CreateRoomRequest
		if err := c.BodyParser(&req); err != nil || req.Name == "" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
		}
		room, err := queries.CreateRoom(context.Background(), req.Name)
		if err != nil {
			return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "room already exists"})
		}
		return c.JSON(room)
	})

	router.Get("/rooms/:id", func(c *fiber.Ctx) error {
		roomID, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid room id"})
		}
		room, err := queries.GetRoomByID(context.Background(), int32(roomID))
		if err != nil {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
		}
		return c.JSON(room)
	})

	router.Post("/rooms/:id/join", func(c *fiber.Ctx) error {
		roomID, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid room id"})
		}
		user := middleware.GetJWTUser(c)
		_, err = queries.AddRoomMember(context.Background(), repository.AddRoomMemberParams{
			RoomID: int32(roomID),
			UserID: user.ID,
		})
		if err != nil {
			return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "already a member or room not found"})
		}
		return c.JSON(fiber.Map{"status": "joined"})
	})

	router.Post("/rooms/:id/messages", func(c *fiber.Ctx) error {
		roomID, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid room id"})
		}
		var req CreateMessageRequest
		if err := c.BodyParser(&req); err != nil || req.Content == "" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
		}
		user := middleware.GetJWTUser(c)
		msg, err := queries.CreateMessage(context.Background(), repository.CreateMessageParams{
			RoomID:  int32(roomID),
			UserID:  sql.NullInt32{Int32: user.ID, Valid: true},
			Content: req.Content,
		})
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not create message"})
		}
		return c.JSON(msg)
	})

	router.Get("/rooms/:id/messages", func(c *fiber.Ctx) error {
		roomID, err := strconv.Atoi(c.Params("id"))
		if err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid room id"})
		}
		limit, _ := strconv.Atoi(c.Query("limit", "50"))
		offset, _ := strconv.Atoi(c.Query("offset", "0"))
		msgs, err := queries.GetRoomMessages(context.Background(), repository.GetRoomMessagesParams{
			RoomID: int32(roomID),
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not fetch messages"})
		}
		return c.JSON(msgs)
	})
}
