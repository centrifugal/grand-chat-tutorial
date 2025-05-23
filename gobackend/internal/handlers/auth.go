package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	repository "github.com/gambitier/grand-chat-tutorial/gobackend/internal/repository"
)

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
}

func RegisterAuthRoutes(router fiber.Router, queries *repository.Queries) {
	router.Post("/register", func(c *fiber.Ctx) error {
		var req AuthRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
		}
		if req.Username == "" || req.Password == "" || req.Email == "" {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "missing fields"})
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not hash password"})
		}
		user, err := queries.CreateUser(context.Background(), repository.CreateUserParams{
			Username: req.Username,
			Password: string(hash),
			Email:    req.Email,
		})
		if err != nil {
			return c.Status(http.StatusConflict).JSON(fiber.Map{"error": "username or email already exists"})
		}
		token, err := generateJWT(user.ID, user.Username)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not generate token"})
		}
		return c.JSON(AuthResponse{Token: token})
	})

	router.Post("/login", func(c *fiber.Ctx) error {
		var req AuthRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid request"})
		}
		user, err := queries.GetUserByUsername(context.Background(), req.Username)
		if err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
		}
		token, err := generateJWT(user.ID, user.Username)
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "could not generate token"})
		}
		return c.JSON(AuthResponse{Token: token})
	})
}

func generateJWT(userID int32, username string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev_secret"
	}
	return token.SignedString([]byte(secret))
}
