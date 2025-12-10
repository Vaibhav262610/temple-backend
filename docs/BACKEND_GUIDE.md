# Temple Steward Backend Guide

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: JWT tokens

## Project Structure

```
temple-backend/
├── src/
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic services
│   ├── models/           # Data models
│   ├── database/         # SQL schemas
│   └── server.js         # Main server file
├── script/               # SQL scripts
├── .env                  # Environment variables
└── package.json
```

## Route Files

| File                 | Base Path            | Description               |
| -------------------- | -------------------- | ------------------------- |
| users.js             | /api/users           | User authentication       |
| communities.js       | /api/communities     | Community management      |
| events.js            | /api/events          | Event management          |
| tasks.js             | /api/tasks           | Task management           |
| priests.js           | /api/priests         | Priest management         |
| priestBookings.js    | /api/priest-bookings | Priest booking management |
| pujas.js             | /api/pujas           | Puja series management    |
| volunteers-simple.js | /api/volunteers      | Volunteer management      |
| finance.js           | /api/finance         | Financial transactions    |
| donations.js         | /api/donations       | Donation management       |
| expenses.js          | /api/expenses        | Expense management        |
| cms.js               | /api/cms             | CMS content management    |
| gallery.js           | /api/cms/gallery     | Gallery management        |
| broadcasts.js        | /api/broadcasts      | Broadcast messages        |
| templates.js         | /api/templates       | Message templates         |

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret
```

## Middleware

### authMiddleware.js

Validates JWT tokens and attaches user to request.

```javascript
const { requireAuth } = require("./middleware/authMiddleware");

// Protected route
app.use("/api/protected", requireAuth, protectedRoutes);
```

## Database Connection

Uses Supabase client from `services/supabaseService.js`:

```javascript
const supabaseService = require("../services/supabaseService");

// Query example
const { data, error } = await supabaseService.client
	.from("table_name")
	.select("*");
```

## File Upload

Uses multer for handling file uploads:

```javascript
const multer = require("multer");
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Upload to Supabase Storage
const { data, error } = await supabase.storage
	.from("gallery-images")
	.upload(fileName, req.file.buffer, {
		contentType: req.file.mimetype,
	});
```

## Adding New Routes

### 1. Create Route File

```javascript
// src/routes/newFeature.js
const express = require("express");
const router = express.Router();
const supabaseService = require("../services/supabaseService");

router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabaseService.client
			.from("new_table")
			.select("*");

		if (error) throw error;
		res.json({ success: true, data });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
});

module.exports = router;
```

### 2. Register in server.js

```javascript
const newFeatureRoutes = require("./routes/newFeature");
app.use("/api/new-feature", requireAuth, newFeatureRoutes);
```

## Error Handling

Standard error response format:

```javascript
res.status(500).json({
	success: false,
	message: "Error description",
	error: error.message,
	code: "ERROR_CODE",
});
```

## CORS Configuration

Allowed origins in server.js:

- Production: temple-management-cms.vercel.app
- Development: localhost:8080, localhost:5173

## Rate Limiting

- General: 500 requests per 15 minutes
- Auth routes: 20 requests per 15 minutes

## Running the Server

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm start
```

## Deployment (Railway)

1. Push changes to git
2. Railway auto-deploys from main branch
3. Environment variables set in Railway dashboard
