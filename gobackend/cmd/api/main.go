package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Grand Chat API",
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE",
	}))

	// Routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", handleRegister)
	auth.Post("/login", handleLogin)

	// Chat routes
	chat := api.Group("/chat")
	chat.Get("/rooms", handleGetRooms)
	chat.Post("/rooms", handleCreateRoom)
	chat.Get("/rooms/:id", handleGetRoom)
	chat.Post("/rooms/:id/messages", handleCreateMessage)
	chat.Get("/rooms/:id/messages", handleGetMessages)
	chat.Post("/rooms/:id/join", handleJoinRoom)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}

// Handler functions will be implemented in the handlers package
func handleRegister(c *fiber.Ctx) error {
	return c.SendString("Register endpoint")
}

func handleLogin(c *fiber.Ctx) error {
	return c.SendString("Login endpoint")
}

func handleGetRooms(c *fiber.Ctx) error {
	return c.SendString("Get rooms endpoint")
}

func handleCreateRoom(c *fiber.Ctx) error {
	return c.SendString("Create room endpoint")
}

func handleGetRoom(c *fiber.Ctx) error {
	return c.SendString("Get room endpoint")
}

func handleCreateMessage(c *fiber.Ctx) error {
	return c.SendString("Create message endpoint")
}

func handleGetMessages(c *fiber.Ctx) error {
	return c.SendString("Get messages endpoint")
}

func handleJoinRoom(c *fiber.Ctx) error {
	return c.SendString("Join room endpoint")
}
