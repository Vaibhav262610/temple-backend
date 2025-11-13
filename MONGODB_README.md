# Temple Steward Dashboard - MongoDB Backend

A comprehensive temple management system backend built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Management** - Complete user authentication and authorization
- **Community Management** - Multi-community support with role-based access
- **Donation Tracking** - Real-time donation management with multiple payment sources
- **Expense Management** - Comprehensive expense tracking and approval workflows
- **Event Management** - Event creation, registration, and management
- **Volunteer Management** - Volunteer coordination and shift management
- **Puja Management** - Scheduled puja series and instance management
- **Communication Tools** - Broadcast messaging and template management
- **Real-time Analytics** - Dashboard with live data and statistics

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Compression
- **Logging**: Morgan
- **File Upload**: Multer
- **Email**: Nodemailer
- **SMS**: Twilio

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn** package manager

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd temple-steward-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. MongoDB Setup

#### Option A: Local MongoDB Installation

**Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. Start MongoDB service

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier available)
3. Get your connection string from the "Connect" button
4. Update the `.env` file with your connection string

### 4. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/temple-steward

# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/temple-steward?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Other configurations as needed
```

### 5. Start the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3001`

## 🔧 API Endpoints

### Base URL: `http://localhost:3001/api`

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Users** | `GET /users`, `POST /users`, `PUT /users/:id` | User management |
| **Communities** | `GET /communities`, `POST /communities` | Community management |
| **Donations** | `GET /donations`, `POST /donations` | Donation tracking |
| **Expenses** | `GET /expenses`, `POST /expenses` | Expense management |
| **Events** | `GET /events`, `POST /events` | Event management |
| **Volunteers** | `GET /volunteers`, `POST /volunteers` | Volunteer coordination |
| **Broadcasts** | `GET /broadcasts`, `POST /broadcasts` | Communication tools |
| **Templates** | `GET /templates`, `POST /templates` | Message templates |
| **Pujas** | `GET /pujas`, `POST /pujas` | Puja management |

## 📊 Database Schema

### Collections Created:

1. **users** - User accounts and profiles
2. **communities** - Temple/community information
3. **donations** - Donation records and transactions
4. **expenses** - Expense tracking and approvals
5. **events** - Event management and registrations
6. **volunteers** - Volunteer profiles and assignments
7. **broadcasts** - Communication campaigns
8. **communication_templates** - Message templates
9. **puja_series** - Scheduled puja management

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Register/Login** to get a JWT token
2. **Include token** in Authorization header: `Bearer <token>`
3. **Protected routes** will validate the token

## 🚀 Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run database migrations (if needed)
npm run migrate

# Seed database with sample data
npm run seed
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── models/         # MongoDB schemas/models
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   ├── validators/     # Input validation rules
│   └── server.js       # Main application file
├── uploads/            # File upload directory
└── logs/              # Application logs
```

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Input Validation** - Express Validator
- **Rate Limiting** - (can be added)
- **Authentication** - JWT tokens
- **Password Hashing** - bcryptjs

## 📈 Performance Features

- **Compression** - Response compression
- **Database Indexing** - Optimized queries
- **Connection Pooling** - MongoDB connection management
- **Caching** - (can be added with Redis)

## 🚨 Error Handling

The application includes comprehensive error handling:

- **Validation Errors** - Input validation failures
- **Database Errors** - MongoDB operation failures
- **Authentication Errors** - Invalid/expired tokens
- **File Upload Errors** - Upload failures
- **General Errors** - Unexpected server errors

## 🔄 Migration from Supabase

If migrating from the existing Supabase setup:

1. **Export data** from Supabase tables
2. **Transform data** to match MongoDB schema
3. **Run migration script** to import data
4. **Update frontend** to use new API endpoints
5. **Test thoroughly** before going live

## 📞 Support

For issues and questions:

1. Check the logs in `logs/` directory
2. Review MongoDB connection status
3. Check API responses in browser/postman
4. Verify environment variables are set correctly

## 🔄 Updates

When updating dependencies:

```bash
npm update
npm audit fix
```

## 🚀 Deployment

For production deployment:

1. **Set NODE_ENV=production**
2. **Configure production MongoDB URI**
3. **Set up reverse proxy** (nginx recommended)
4. **Configure SSL certificates**
5. **Set up monitoring** and logging
6. **Configure backup strategy**

## 📝 License

This project is licensed under the ISC License.

---

**Happy coding! 🏛️🙏**
