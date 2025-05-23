package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type JWTUser struct {
	ID       int32
	Username string
}

func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing or invalid token"})
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "dev_secret"
		}
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token claims"})
		}
		userID, ok := claims["user_id"].(float64)
		username, ok2 := claims["username"].(string)
		if !ok || !ok2 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token payload"})
		}
		c.Locals("user", JWTUser{ID: int32(userID), Username: username})
		return c.Next()
	}
}

func GetJWTUser(c *fiber.Ctx) JWTUser {
	user, ok := c.Locals("user").(JWTUser)
	if !ok {
		return JWTUser{}
	}
	return user
}
