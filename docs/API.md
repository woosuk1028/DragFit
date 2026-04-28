# API Documentation

## Authentication Endpoints

### Register User
```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe"
}

Response (201):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123"
}

Response (200):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

## User Endpoints

### Get Current User Profile
```
GET /api/users/me
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

## Clothing Images Endpoints

### Upload Image
```
POST /api/images/upload
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

Body:
- file: [binary image file]
- category: "top" | "bottom" | "shoes" | "accessories"

Response (201):
{
  "id": "uuid",
  "userId": "uuid",
  "imageUrl": "/uploads/abc123.jpg",
  "category": "top",
  "tags": [],
  "uploadedAt": "2024-01-01T12:00:00Z"
}
```

### Get User's Images
```
GET /api/images
GET /api/images?category=top
Authorization: Bearer <accessToken>

Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "imageUrl": "/uploads/abc123.jpg",
    "category": "top",
    "tags": ["casual", "blue"],
    "uploadedAt": "2024-01-01T12:00:00Z"
  },
  ...
]
```

### Get Single Image
```
GET /api/images/:imageId
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "imageUrl": "/uploads/abc123.jpg",
  "category": "top",
  "tags": ["casual"],
  "uploadedAt": "2024-01-01T12:00:00Z"
}
```

### Delete Image
```
DELETE /api/images/:imageId
Authorization: Bearer <accessToken>

Response (200):
{ "message": "Image deleted successfully" }
```

## Outfit Endpoints

### Create Outfit
```
POST /api/outfits
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Casual Friday",
  "items": [
    {
      "clothingImageId": "uuid",
      "category": "top",
      "position": { "x": 0, "y": 0 }
    },
    {
      "clothingImageId": "uuid",
      "category": "bottom",
      "position": { "x": 0, "y": 150 }
    },
    {
      "clothingImageId": "uuid",
      "category": "shoes",
      "position": { "x": 0, "y": 300 }
    }
  ]
}

Response (201):
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Casual Friday",
  "items": [
    {
      "id": "uuid",
      "outfitId": "uuid",
      "clothingImageId": "uuid",
      "category": "top",
      "position": { "x": 0, "y": 0 }
    },
    ...
  ],
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### Get All User Outfits
```
GET /api/outfits
Authorization: Bearer <accessToken>

Response (200):
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Casual Friday",
    "items": [...],
    "rating": null,
    "createdAt": "2024-01-01T12:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z"
  },
  ...
]
```

### Get Single Outfit
```
GET /api/outfits/:outfitId
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Casual Friday",
  "items": [...],
  "rating": 4.5,
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### Update Outfit
```
PUT /api/outfits/:outfitId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Business Casual",
  "items": [ ... ]
}

Response (200):
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Business Casual",
  "items": [...],
  "updatedAt": "2024-01-01T13:00:00Z"
}
```

### Delete Outfit
```
DELETE /api/outfits/:outfitId
Authorization: Bearer <accessToken>

Response (200):
{ "message": "Outfit deleted successfully" }
```

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "BadRequest"
}
```

Common status codes:
- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Missing or invalid token
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **500**: Internal Server Error - Server error

## Authentication

All endpoints (except `/auth/signup` and `/auth/login`) require JWT token in header:

```
Authorization: Bearer <accessToken>
```

Tokens expire in 24 hours. Store token in localStorage/sessionStorage on client.
