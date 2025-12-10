# Temple Steward API Documentation

## Base URL

- **Production**: `https://temple-backend-production-7324.up.railway.app/api`
- **Development**: `http://localhost:5000/api`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## 1. Users & Authentication

### POST /users/register

Register a new user.

```json
{
	"email": "user@example.com",
	"password": "password123",
	"full_name": "John Doe",
	"phone": "+1234567890"
}
```

### POST /users/login

Login and get authentication token.

```json
{
	"email": "user@example.com",
	"password": "password123"
}
```

### GET /users/profile

Get current user profile. (Protected)

### PUT /users/profile

Update current user profile. (Protected)

---

## 2. Communities

### GET /communities

Get all communities with optional filters.

- Query params: `status`, `search`, `page`, `limit`

### GET /communities/:id

Get single community by ID.

### POST /communities

Create new community. (Protected)

### PUT /communities/:id

Update community. (Protected)

### DELETE /communities/:id

Delete community. (Protected)

### GET /communities/:id/members

Get community members.

### POST /communities/:id/members

Add member to community.

---

## 3. Events

### GET /events

Get all events with filters.

- Query params: `community_id`, `status`, `start_date`, `end_date`, `page`,
  `limit`

### GET /events/:id

Get single event.

### POST /events

Create event with optional image upload. (Protected)

- Supports multipart/form-data for image upload

### PUT /events/:id

Update event. (Protected)

### DELETE /events/:id

Delete event. (Protected)

### GET /public/events

Get public events (no auth required).

---

## 4. Tasks

### GET /tasks

Get all tasks with filters.

- Query params: `status`, `priority`, `community_id`, `assigned_to`, `page`,
  `limit`

### POST /tasks

Create task. (Protected)

```json
{
	"community_id": "uuid",
	"title": "Task title",
	"description": "Description",
	"status": "todo",
	"priority": "medium",
	"due_date": "2024-12-31",
	"assigned_to": ["user_uuid"]
}
```

### PUT /tasks/:id

Update task. (Protected)

### DELETE /tasks/:id

Delete task. (Protected)

---

## 5. Priests

### GET /priests

Get all priests with filters.

- Query params: `status`, `search`, `page`, `limit`

### GET /priests/:id

Get single priest.

### POST /priests

Create priest with image upload. (Protected)

- Supports multipart/form-data
- Fields: `name`, `email`, `phone`, `specialization`, `experience_years`,
  `qualification`, `address`, `date_of_birth`, `joining_date`, `status`,
  `notes`, `image` (file)

### PUT /priests/:id

Update priest. (Protected)

### DELETE /priests/:id

Delete priest. (Protected)

---

## 6. Priest Bookings

### GET /priest-bookings

Get all priest bookings.

- Query params: `status`, `start_date`, `end_date`, `page`, `limit`

### GET /priest-bookings/:id

Get single booking.

### PUT /priest-bookings/:id

Update booking (assign priest, change status). (Protected)

```json
{
	"status": "confirmed",
	"priest_id": "priest_uuid",
	"admin_notes": "Notes here"
}
```

### DELETE /priest-bookings/:id

Delete booking. (Protected)

### GET /priest-bookings/stats/summary

Get booking statistics.

### GET /priest-bookings/busy-priests/:date

Get priests who are busy on a specific date.

- Query params: `exclude_booking_id`

---

## 7. Pujas

### GET /pujas

Get all puja series.

- Query params: `status`, `type`, `page`, `limit`

### POST /pujas

Create puja series. (Protected)

```json
{
	"name": "Puja Name",
	"description": "Description",
	"type": "regular",
	"start_date": "2024-01-01",
	"end_date": "2024-12-31",
	"priest": "Priest Name",
	"location": "Temple Hall",
	"duration_minutes": 60
}
```

### PUT /pujas/:id

Update puja series. (Protected)

### DELETE /pujas/:id

Delete puja series. (Protected)

---

## 8. Volunteers

### GET /volunteers

Get all volunteers.

- Query params: `status`, `search`, `page`, `limit`

### POST /volunteers

Create volunteer. (Protected)

### PUT /volunteers/:id

Update volunteer. (Protected)

### DELETE /volunteers/:id

Delete volunteer. (Protected)

### GET /volunteers/shifts

Get volunteer shifts.

### POST /volunteers/shifts

Create shift. (Protected)

### GET /volunteers/attendance

Get attendance records.

### POST /volunteers/attendance

Record attendance. (Protected)

### GET /volunteers/applications

Get volunteer applications.

### POST /volunteers/applications

Submit volunteer application.

### PUT /volunteers/applications/:id/approve

Approve application. (Protected)

### PUT /volunteers/applications/:id/reject

Reject application. (Protected)

---

## 9. Finance

### GET /finance/summary

Get financial summary (total income, expenses, balance).

### GET /finance/categories

Get budget categories.

### POST /finance/categories

Create budget category. (Protected)

### GET /finance/transactions

Get all transactions.

### POST /finance/transactions

Create transaction. (Protected)

```json
{
	"type": "income",
	"amount": 1000,
	"description": "Donation",
	"category_id": "uuid",
	"payment_method": "cash"
}
```

---

## 10. Donations

### GET /donations

Get all donations.

- Query params: `status`, `donation_type`, `start_date`, `end_date`, `page`,
  `limit`

### POST /donations

Create donation. (Protected)

```json
{
	"donor_name": "John Doe",
	"donor_email": "john@example.com",
	"donor_phone": "+1234567890",
	"amount": 500,
	"donation_type": "general",
	"payment_method": "cash",
	"purpose": "Temple maintenance"
}
```

### GET /donations/categories/all

Get donation categories.

---

## 11. Expenses

### GET /expenses

Get all expenses.

- Query params: `status`, `category`, `start_date`, `end_date`, `page`, `limit`

### POST /expenses

Create expense. (Protected)

### PUT /expenses/:id

Update expense. (Protected)

### DELETE /expenses/:id

Delete expense. (Protected)

---

## 12. CMS (Content Management)

### Banners

- `GET /cms/banner` - Get all banners
- `POST /cms/banner` - Create banner
- `POST /cms/banner/upload` - Upload banner image (multipart/form-data)
- `PUT /cms/banner/:id` - Update banner
- `DELETE /cms/banner/:id` - Delete banner
- `DELETE /cms/banner/image/:slot` - Delete banner by slot

### About

- `GET /cms/about` - Get about content
- `POST /cms/about` - Create about content
- `PUT /cms/about/:id` - Update about content
- `DELETE /cms/about/:id` - Delete about content

### Images

- `GET /cms/images/:name` - Get images by name (gallery, broadcast, banner)
- `POST /cms/images` - Create image
- `PUT /cms/images/:id` - Update image
- `DELETE /cms/images/:id` - Delete image

### Contact Forms

- `GET /cms/contact` - Get all contact submissions
- `GET /cms/contact/:id` - Get single submission
- `POST /cms/contact` - Submit contact form (public)
- `PUT /cms/contact/:id` - Update submission
- `DELETE /cms/contact/:id` - Delete submission
- `PATCH /cms/contact/:id/read` - Mark as read

### CMS Pujas

- `GET /cms/pujas` - Get all CMS pujas
- `POST /cms/pujas` - Create CMS puja
- `PUT /cms/pujas/:id` - Update CMS puja
- `DELETE /cms/pujas/:id` - Delete CMS puja

### Sai Aangan

- `GET /cms/sai-aangan` - Get Sai Aangan content
- `POST /cms/sai-aangan` - Create content
- `PUT /cms/sai-aangan/:id` - Update content
- `DELETE /cms/sai-aangan/:id` - Delete content

### Upcoming Events

- `GET /cms/upcoming-events` - Get upcoming events
- `POST /cms/upcoming-events` - Create event
- `PUT /cms/upcoming-events/:id` - Update event
- `DELETE /cms/upcoming-events/:id` - Delete event

### Mandir Hours

- `GET /cms/mandir-hours` - Get mandir hours
- `POST /cms/mandir-hours` - Create hours entry
- `PUT /cms/mandir-hours/:id` - Update hours
- `DELETE /cms/mandir-hours/:id` - Delete hours

### Bal Vidya Mandir

- `GET /cms/bal-vidya` - Get Bal Vidya content
- `POST /cms/bal-vidya` - Create content
- `PUT /cms/bal-vidya/:id` - Update content
- `DELETE /cms/bal-vidya/:id` - Delete content

---

## 13. Public Endpoints (No Auth Required)

### GET /cms/public/banners

Get all active banners for carousel.

### GET /cms/public/banner/:slot

Get specific banner (banner-1, banner-2, banner-3, banner-4).

### GET /cms/public/pujas

Get active pujas for website.

### GET /cms/public/sai-aangan

Get Sai Aangan content.

### GET /cms/public/upcoming-events

Get upcoming events.

### GET /cms/public/mandir-hours

Get mandir hours.

### GET /cms/public/bal-vidya

Get Bal Vidya Mandir content.

### GET /public/events

Get public events.

---

## 14. Gallery

### GET /cms/gallery

Get all gallery images.

### POST /cms/gallery/upload

Upload gallery image. (Protected, multipart/form-data)

### DELETE /cms/gallery/:id

Delete gallery image. (Protected)

---

## 15. Broadcasts

### GET /broadcasts

Get all broadcasts.

### POST /broadcasts

Create broadcast. (Protected)

### PUT /broadcasts/:id

Update broadcast. (Protected)

### DELETE /broadcasts/:id

Delete broadcast. (Protected)

### POST /broadcasts/:id/send

Send broadcast. (Protected)

---

## 16. Templates

### GET /templates

Get communication templates.

### POST /templates

Create template. (Protected)

### PUT /templates/:id

Update template. (Protected)

### DELETE /templates/:id

Delete template. (Protected)

---

## Error Responses

All errors follow this format:

```json
{
	"success": false,
	"message": "Error description",
	"error": "Detailed error message",
	"code": "ERROR_CODE"
}
```

Common HTTP Status Codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- General endpoints: 500 requests per 15 minutes
- Auth endpoints: 20 requests per 15 minutes

---

## Health Check

### GET /health

Check API health status.

```json
{
	"status": "OK",
	"timestamp": "2024-12-11T10:00:00.000Z",
	"database": "Supabase",
	"version": "1.0.0"
}
```
