# Microservices User Notification System

A small event-driven microservices system built with Node.js, TypeScript, MySQL, NATS JetStream, and an API Gateway.

The system consists of:

- API Gateway
- User Service
- Notification Service
- MySQL
- NATS JetStream

The User Service and Notification Service communicate asynchronously through NATS JetStream. They do not communicate with each other through REST or WebSockets.

---

## Architecture

```text
                         ┌──────────────┐
                         │    Client    │
                         └──────┬───────┘
                                │
                              REST
                                │
                                ▼
                      ┌──────────────────┐
                      │   API Gateway    │
                      │     :3000        │
                      └────────┬─────────┘
                               │
                             REST
                               │
                               ▼
                      ┌──────────────────┐
                      │   User Service   │
                      │     :3001        │
                      └────────┬─────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
                ┌─────────┐        ┌──────────────┐
                │ MySQL   │        │ Outbox Table │
                │ user_db │        └──────┬───────┘
                └─────────┘               │
                                          │
                                          ▼
                                  ┌──────────────┐
                                  │ NATS         │
                                  │ JetStream    │
                                  └──────┬───────┘
                                         │
                                  user.created
                                         │
                                         ▼
                              ┌────────────────────┐
                              │ Notification       │
                              │ Service            │
                              └─────────┬──────────┘
                                        │
                                        ▼
                                ┌─────────────────┐
                                │ MySQL           │
                                │ processed_events│
                                └─────────────────┘
````

---

## Communication

### Client → API Gateway

REST/HTTP.

The API Gateway is the public entry point for client requests.

### API Gateway → User Service

REST/HTTP.

The API Gateway forwards requests to the User Service using an internal service token.

### User Service → Notification Service

NATS JetStream.

The User Service publishes `user.created` events asynchronously.

The Notification Service consumes these events using a durable JetStream consumer.

The User Service and Notification Service do not communicate through REST or WebSockets.

---

## User Registration Event Flow

1. Client sends `POST /users/register` to the API Gateway.
2. API Gateway forwards the request to the User Service.
3. User Service validates the request using Zod.
4. User Service starts a MySQL transaction.
5. User record is created.
6. A `user.created` event is inserted into the outbox table.
7. The MySQL transaction commits.
8. The Outbox Publisher publishes the event to NATS JetStream.
9. Notification Service receives the event.
10. Notification Service validates the event using Zod.
11. Notification Service checks whether the event has already been processed.
12. The notification is processed.
13. The event ID is stored in `processed_events`.
14. The NATS message is acknowledged.

---

## Reliability

### Transactional Outbox

User creation and event creation happen in the same MySQL transaction.

This prevents a situation where the user is created successfully but the corresponding event is lost.

### Durable JetStream Consumer

The Notification Service uses a durable consumer named:

```text
notification-service
```

Messages remain available in JetStream until successfully acknowledged according to the configured delivery policy.

### Explicit Acknowledgement

Messages are acknowledged only after successful processing.

If processing fails, the message is not acknowledged and can be redelivered according to the consumer's delivery policy.

### Idempotency

The Notification Service stores processed event IDs in the `processed_events` table.

If the same event is delivered again, the service detects the existing event ID and avoids processing it twice.

### Invalid Messages

Invalid events are rejected using Zod validation and terminated instead of being retried indefinitely.

### Retry Limit

The durable consumer is configured with a maximum delivery count to prevent endlessly retrying permanently failing messages.

---

## Security

### JWT Authentication

The User Service issues JWTs after successful login.

The API Gateway verifies JWTs for protected endpoints.

### Service Authentication

The API Gateway authenticates with the User Service using an internal service token.

Direct requests to protected User Service endpoints without the required service token are rejected.

### NATS Authentication

NATS requires service-specific credentials.

The User Service and Notification Service use separate NATS credentials.

### Environment Variables

Secrets and configuration values are stored in environment variables and are not committed to source control.

Example environment files are provided for each service.

---

## Technology Stack

* Node.js
* TypeScript
* Express.js
* MySQL
* NATS JetStream
* Zod
* JWT
* bcrypt
* Docker
* Docker Compose

---

# API Documentation

The API Gateway runs on port `3000`.

All client requests should be sent through the API Gateway rather than directly to the User Service.

---

## Health Check

### `GET /health`

Checks whether the API Gateway is running.

**Request:**

```http
GET http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "api-gateway"
}
```

---

## Register User

### `POST /users/register`

Creates a new user.

**Request:**

```http
POST http://localhost:3000/users/register
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Jai",
  "email": "jai@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Jai",
    "email": "jai@example.com"
  }
}
```

---

## Login

### `POST /users/login`

Authenticates a user and returns a JWT.

**Request:**

```http
POST http://localhost:3000/users/login
Content-Type: application/json
```

**Body:**

```json
{
  "email": "jai@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<JWT_TOKEN>",
  "user": {
    "id": 1,
    "name": "Jai",
    "email": "jai@example.com"
  }
}
```

---

## Get Current User

### `GET /users/me`

Returns the authenticated user's information.

**Request:**

```http
GET http://localhost:3000/users/me
Authorization: Bearer <JWT_TOKEN>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Jai",
    "email": "jai@example.com",
    "created_at": "2026-08-13T..."
  }
}
```

### Authentication

Requires a valid JWT issued by the login endpoint.

### Missing JWT

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### Invalid or expired JWT

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Direct User Service Access

The User Service is intended to be accessed through the API Gateway.

Requests directly to protected User Service endpoints without the required service token are rejected.

**Example:**

```http
POST http://localhost:3001/users/register
```

Without the required service token:

```json
{
  "success": false,
  "message": "Unauthorized service"
}
```

---

# Events

NATS JetStream is the asynchronous communication layer between the User Service and Notification Service.

## `user.created`

Published by the User Service after successful user registration.

### Subject

```text
user.created
```

### Example Event

```json
{
  "eventId": "078f45bc-7992-4d89-bbc5-de30223d1eba",
  "eventType": "user.created",
  "data": {
    "userId": 1,
    "name": "Jai",
    "email": "jai@example.com"
  }
}
```

### Stream

```text
USER_EVENTS
```

The `USER_EVENTS` JetStream stream stores user-related events.

### Consumer

```text
notification-service
```

The Notification Service uses a durable consumer to consume `user.created` events.

### Delivery

Messages use explicit acknowledgement.

The consumer acknowledges a message only after successful processing.

If processing fails, the message is not acknowledged and can be redelivered according to the configured delivery policy.

---

# Docker Setup

The complete system can be run using Docker Compose.

The Docker Compose environment includes:

* MySQL
* NATS JetStream
* User Service
* Notification Service
* API Gateway

## Prerequisites

Make sure the following are installed:

* Docker Desktop
* Git
* Node.js 22+ (required for local development)

---

## 1. Clone the repository

```bash
git clone git@github.com:Akash0086/microservices-user-notification-system.git
cd microservices-user-notification-system
```

---

## 2. Configure environment variables

Create the required `.env` files using the provided `.env.example` files.

Do not commit actual `.env` files.

The following values must match between services:

* `JWT_SECRET` must be the same between the User Service and API Gateway.
* `SERVICE_TOKEN` must be the same between the API Gateway and User Service.
* NATS credentials must match the credentials configured in NATS.

---

## 3. Start the complete system

From the project root:

```bash
docker compose up
```

To rebuild the services:

```bash
docker compose up --build
```

The services should start as:

```text
API Gateway          :3000
User Service         :3001
MySQL                :3306 inside Docker
NATS                 :4222
Notification Service
```

The MySQL container is mapped to host port `3307` to avoid conflicts with a local MySQL installation.

---

## 4. Verify the services

API Gateway health check:

```http
GET http://localhost:3000/health
```

Expected:

```json
{
  "status": "ok",
  "service": "api-gateway"
}
```

---

## 5. Test user registration

Send:

```http
POST http://localhost:3000/users/register
Content-Type: application/json
```

with:

```json
{
  "name": "Docker Test",
  "email": "docker-test@example.com",
  "password": "password123"
}
```

Expected:

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Docker Test",
    "email": "docker-test@example.com"
  }
}
```

After registration, the Docker logs should show the event being published and consumed by the Notification Service.

Example flow:

```text
User Service
    ↓
Published outbox event
    ↓
NATS JetStream
    ↓
Notification Service
    ↓
Processed event stored
```

---

# Local Development

The services can also be run individually during development.

## User Service

```bash
cd user-service
npm install
npm run dev
```

Expected:

```text
Connected to MySQL
Connected to NATS
User Service running on port 3001
```

## Notification Service

```bash
cd notification-service
npm install
npm run dev
```

Expected:

```text
Connected to MySQL
Connected to notification-service consumer
```

## API Gateway

```bash
cd api-gateway
npm install
npm run dev
```

Expected:

```text
API Gateway running on port 3000
```

---

# Database Structure

## User Database

```text
user_db
├── users
└── outbox_events
```

### `users`

Stores registered users.

### `outbox_events`

Stores events inside the same transaction as user creation.

This table is used by the Outbox Publisher to reliably publish events to NATS JetStream.

---

## Notification Database

```text
notification_db
└── processed_events
```

### `processed_events`

Stores event IDs that have already been processed.

This provides idempotent event processing.

---

# Project Structure

```text
microservices-user-notification-system/
│
├── api-gateway/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── server.ts
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── user-service/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── events/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── notification-service/
│   ├── src/
│   │   ├── config/
│   │   ├── consumers/
│   │   ├── models/
│   │   └── services/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── mysql/
│   └── init/
│       ├── 01-databases.sql
│       └── 02-notification.sql
│
├── nats/
│   └── nats.conf.example
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# Environment Variables

Sensitive configuration is intentionally kept outside the source code.

Example files are provided as:

```text
.env.example
api-gateway/.env.example
user-service/.env.example
notification-service/.env.example
nats/nats.conf.example
```

Actual `.env` files and the local NATS configuration are excluded from Git using `.gitignore`.

---

# Reliability and Design Decisions

This project demonstrates several important backend and distributed-system concepts:

* REST API Gateway
* Microservice separation
* Transactional Outbox Pattern
* MySQL transactions
* Event-driven communication
* NATS JetStream
* Durable consumers
* Explicit message acknowledgement
* Idempotent event processing
* Zod schema validation
* JWT authentication
* Internal service authentication
* NATS authentication
* Docker Compose
* Environment-based configuration

The main architectural goal is to ensure that user registration and event publication remain reliable while keeping the User Service and Notification Service loosely coupled.

