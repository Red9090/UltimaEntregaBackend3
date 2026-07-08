# Ecommerce API

A RESTful API for an e-commerce platform built with Node.js, Express, and MongoDB.

## Table of Contents
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Dockerization](#dockerization)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## Project Structure
```
├── src/
│   ├── controllers/      # Request handlers
│   ├── models/           # Database models
│   ├── routes/           # API route definitions
│   ├── middleware/       # Custom middleware
│   ├── config/           # Configuration files
│   ├── utils/            # Utility functions
│   └── server.js         # Application entry point
├── __tests__/            # Test files
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
├── Dockerfile            # Docker configuration
├── .dockerignore         # Docker ignore file
└── README.md             # This file
```

## Features
- User authentication (registration, login, logout, password reset)
- Product management (CRUD operations)
- Order management (cart, checkout, order tracking)
- Role-based access control (Admin/User)
- Secure password handling with bcrypt
- JSON Web Token (JWT) authentication
- Input validation with express-validator
- Error handling middleware
- API documentation with Swagger (to be implemented)
- Comprehensive test suite with Jest and Supertest
- Dockerized for easy deployment

## Installation

### Prerequisites
- Node.js (>= 14.x)
- MongoDB
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone <https://github.com/Red9090/UltimaEntregaBackend3>
   cd ecommerce-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example below:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   JWT_COOKIE_EXPIRE=7
   BCRYPT_SALT_ROUNDS=12
   ```

4. Start the MongoDB service:
   ```bash
   # For local MongoDB
   mongod
   
   # Or if using Docker
   docker run -d -p 27017:27017 --name mongo mongo:latest
   ```

## Usage

### Development Mode
```bash
npm run dev
```
The server will start on `http://localhost:5000`

### Production Mode
```bash
npm start
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout user
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:token` - Reset password

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/updatepassword` - Update password
- `PUT /api/users/updatedetails` - Update profile information

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `PUT /api/products/:id/photo` - Upload product photo (Admin only)

### Orders
- `GET /api/orders` - Get all orders (Admin only)
- `GET /api/orders/myorders` - Get current user's orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/pay` - Mark order as paid
- `PUT /api/orders/:id/deliver` - Mark order as delivered (Admin only)
- `DELETE /api/orders/:id` - Delete order (Admin only)

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/auth.test.js
```

### Test Suite
The test suite includes:
- Authentication endpoint tests
- User management tests
- Product management tests
- Order management tests
- All tests use mocking to isolate dependencies

To run the tests, make sure you have Jest installed:
```bash
npm install --save-dev jest supertest
```

### Test Environment
Tests run in a dedicated test environment:
- `NODE_ENV` is set to `test`
- Database operations are mocked
- External services (email) are mocked
- JWT secret is set to a test value

## Dockerization

### Building the Docker Image
```bash
docker build -t ecommerce-api:latest .
```

### Running the Docker Container
```bash
docker run -p 5000:5000 --env-file .env ecommerce-api:latest
```

### Docker Compose (Optional)
For development with MongoDB:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env
    depends_on:
      - mongo
  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## Deployment Instructions for Delivery

### Repository URL
**GitHub Repository:** https://github.com/Red9090/ecommerce-api-final
*(Replace with your actual repository URL)*

### DockerHub Image
**DockerHub URL:** https://hub.docker.com/r/red9090/ecommerce-api
*(Replace with your actual DockerHub username and repository name after pushing the image)*

### To Build and Run the Docker Image (for delivery verification):
1. Build the image:
   ```bash
   docker build -t yourusername/ecommerce-api:latest .
   ```

2. Run the container:
   ```bash
   docker run -p 5000:5000 --env-file .env yourusername/ecommerce-api:latest
   ```

3. The API will be available at http://localhost:5000

### To Run the Test Suite:
```bash
# Install dependencies if not already installed
npm install

# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file (e.g., adoption tests)
npm test -- __tests__/adoption.test.js
```

The scan results showed no critical vulnerabilities in the base image or application dependencies. For production deployments, regular security scanning is recommended as part of the CI/CD pipeline.

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/ecommerce |
| JWT_SECRET | Secret for JWT signing | your_jwt_secret_key |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| JWT_COOKIE_EXPIRE | Cookie expiration in days | 7 |
| BCRYPT_SALT_ROUNDS | Salt rounds for password hashing | 12 |

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## Authentication
Protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Tokens are obtained from the login or register endpoints.

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.
