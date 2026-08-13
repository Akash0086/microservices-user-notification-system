# Microservices User Notification System

A small event-driven microservices system built with Node.js, TypeScript, MySQL, NATS JetStream, and an API Gateway.

The system consists of:

- API Gateway
- User Service
- Notification Service
- MySQL
- NATS JetStream

The User Service and Notification Service communicate asynchronously through NATS JetStream and do not communicate using REST or WebSockets.

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
                                ┌───────────────┐
                                │ MySQL         │
                                │ processed_    │
                                │ events        │
                                └───────────────┘
                                

## Communication

### Client → API Gateway

REST/HTTP.

The API Gateway is the public entry point for client requests.

### API Gateway → User Service

REST/HTTP.

The Gateway forwards requests to the User Service using an internal service token.

### User Service → Notification Service

NATS JetStream.

The User Service publishes `user.created` events asynchronously.

The Notification Service consumes these events using a durable JetStream consumer.

The User Service and Notification Service do not communicate through REST or WebSockets.

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
11. Notification Service checks whether the event was already processed.
12. The notification is processed.
13. The event ID is stored in `processed_events`.
14. The NATS message is acknowledged.

## Reliability

### Transactional Outbox

User creation and event creation happen in the same MySQL transaction.

This prevents a situation where the user is created successfully but the corresponding event is lost.

### Durable JetStream Consumer

The Notification Service uses a durable consumer named:

`notification-service`

Messages remain available in JetStream until successfully acknowledged according to the configured delivery policy.

### Explicit Acknowledgement

Messages are acknowledged only after successful processing.

### Idempotency

The Notification Service stores processed event IDs in the `processed_events` table.

If the same event is delivered again, the service detects the existing event ID and avoids processing it twice.

### Invalid Messages

Invalid events are rejected using Zod validation and terminated instead of being retried indefinitely.

### Retry Limit

The durable consumer is configured with a maximum delivery count to prevent endlessly retrying permanently failing messages.

## Security

### JWT Authentication

The User Service issues JWTs after successful login.

The API Gateway verifies JWTs for protected endpoints.

### Service Authentication

The API Gateway authenticates with the User Service using an internal service token.

Direct requests to protected User Service endpoints without the service token are rejected.

### NATS Authentication

NATS requires service-specific credentials.

The User Service and Notification Service use separate NATS credentials.

### Environment Variables

Secrets and configuration values are stored in environment variables and are not committed to source control.

## Technology Stack

- Node.js
- TypeScript
- Express.js
- MySQL
- NATS JetStream
- Zod
- JWT
- bcrypt
- Docker / Docker Compose

## API Documentation

The API Gateway runs on port `3000`.

All client requests should be sent through the API Gateway rather than directly to the User Service.

### Health Check

#### `GET /health`

Checks whether the API Gateway is running.

**Request:**

```http
GET http://localhost:3000/health

Response:

{
  "status": "ok",
  "service": "api-gateway"
}

Register User
POST /users/register

Creates a new user.

Request:

POST http://localhost:3000/users/register
Content-Type: application/json

Body:

{
  "name": "Jai",
  "email": "jai@example.com",
  "password": "password123"
}

Response:

{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "Jai",
    "email": "jai@example.com"
  }
}

Login
POST /users/login

Authenticates a user and returns a JWT.

Request:

POST http://localhost:3000/users/login
Content-Type: application/json

Body:

{
  "email": "jai@example.com",
  "password": "password123"
}

Response:

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

Get Current User
GET /users/me

Returns the authenticated user's information.

Request:

GET http://localhost:3000/users/me
Authorization: Bearer <JWT_TOKEN>

Response:

{
  "success": true,
  "user": {
    "id": 1,
    "name": "Jai",
    "email": "jai@example.com",
    "created_at": "2026-08-13T..."
  }
}

Authentication:

Requires a valid JWT issued by the login endpoint.

Authentication Errors
Missing JWT
{
  "success": false,
  "message": "Authentication required"
}
Invalid or expired JWT
{
  "success": false,
  "message": "Invalid or expired token"
}

Direct User Service Access

The User Service is intended to be accessed through the API Gateway.

Requests directly to protected User Service endpoints without the internal service token are rejected.

Example:

POST http://localhost:3001/users/register

without the required service token returns:

{
  "success": false,
  "message": "Unauthorized service"
}

---

## Then add Event Documentation

This is particularly important because **NATS is the core of your assignment**.

Add:

```md
## Events

### `user.created`

Published by the User Service after successful user registration.

**Subject:**

```text
user.created

Example event:

{
  "eventId": "078f45bc-7992-4d89-bbc5-de30223d1eba",
  "eventType": "user.created",
  "data": {
    "userId": 1,
    "name": "Jai",
    "email": "jai@example.com"
  }
}
Stream
USER_EVENTS

The USER_EVENTS JetStream stream stores user-related events.

Consumer
notification-service

The Notification Service uses a durable consumer to consume user.created events.

Delivery

Messages use explicit acknowledgement.

The consumer acknowledges a message only after successful processing.

If processing fails, the message is not acknowledged and can be redelivered according to the configured delivery policy.


---

## Local Development Setup

### Prerequisites

Make sure the following are installed:

- Node.js 22+
- npm
- MySQL 8+
- Docker
- Git

NATS is run using Docker.

---

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd microservices-assignment

cd user-service
npm install

cd ../notification-service
npm install

cd ../api-gateway
npm install

cd ..

3. Configure environment variables

Create a .env file inside each service.

User Service

user-service/.env

PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=user_db

NATS_URL=nats://localhost:4222
NATS_USER=user-service
NATS_PASSWORD=user-service-secret

JWT_SECRET=your_jwt_secret
SERVICE_TOKEN=your_internal_service_token

Notification Service

notification-service/.env

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=notification_db

NATS_URL=nats://localhost:4222
NATS_USER=notification-service
NATS_PASSWORD=notification-service-secret
API Gateway

api-gateway/.env

PORT=3000

USER_SERVICE_URL=http://localhost:3001

JWT_SECRET=your_jwt_secret
SERVICE_TOKEN=your_internal_service_token

The JWT_SECRET must be the same between the User Service and API Gateway.

The SERVICE_TOKEN must be the same between the API Gateway and User Service.

Actual secrets must not be committed to Git.


---

### 4. Create the MySQL databases

Start MySQL and create:

```sql
CREATE DATABASE user_db;
CREATE DATABASE notification_db;

The required tables are:

user_db
├── users
└── outbox_events

notification_db
└── processed_events

If using the provided SQL initialization scripts, these databases and tables can be created automatically.


---

### 5. Start NATS

NATS JetStream is required for event communication.

Start NATS using Docker:

```bash
docker compose up nats

NATS runs on:

nats://localhost:4222

JetStream is enabled for durable event storage and consumers.


---

### 6. Start User Service

Open a terminal:

```bash
cd user-service
npm run dev

Expected:

Connected to MySQL
Connected to NATS
User Service running on port 3001
7. Start Notification Service

Open another terminal:

cd notification-service
npm run dev

Expected:

Connected to MySQL
Connected to NATS
USER_EVENTS stream already exists
notification-service consumer already exists
Connected to notification-service consumer

The Notification Service automatically ensures that the required JetStream stream and durable consumer exist.


---

### 8. Start API Gateway

Open another terminal:

```bash
cd api-gateway
npm run dev

Expected:

API Gateway running on port 3000
9. Test the system

Register a user:

POST http://localhost:3000/users/register

Then login:

POST http://localhost:3000/users/login

Copy the returned JWT and use it with:

GET http://localhost:3000/users/me
Authorization: Bearer <JWT_TOKEN>

After registration, the user.created event should be published through NATS JetStream and consumed by the Notification Service.


---

## Environment Variables

Add one more section:

```md
---

## Environment Variables

Sensitive configuration is intentionally kept outside the source code.

Example environment files are provided as:

```text
.env.example

### One thing we should **not** claim yet

Your README currently says Docker can be used for the whole system, but we haven't successfully run the complete Compose stack because of the Docker image download issue.

So for now, describe Docker as a **deployment option**, but make the primary local instructions the ones you've actually tested:

```text
MySQL → local
NATS → Docker
Services → npm run dev