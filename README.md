# Fashion Coordinator

옷 사진을 올려서 상의·하의·신발을 자유롭게 배치해 코디를 저장·관리하는 웹앱입니다.

**Stack:** NestJS (백엔드) + Next.js 15 App Router (프론트엔드) + MariaDB

## Features

- 이메일/비밀번호 회원가입 & JWT 로그인
- 누끼 처리된 옷 이미지 업로드 (상의 / 하의 / 신발 / 액세서리 분류, 태그)
- **드래그 가능한 코디 캔버스** — 기본 상→하→신발 자동 배치 후 자유롭게 위치 이동
- 코디 저장 / 리스트 조회 / 미리보기 / 삭제 (위치 정보까지 그대로 복원)

## Project Layout

```
fashion/
├── backend/             # NestJS 10 API (port 3001)
│   ├── src/
│   │   ├── auth/        # 회원가입/로그인 + JWT 전략
│   │   ├── users/       # /api/users/me
│   │   ├── images/      # 옷 이미지 업로드/조회 (multer)
│   │   ├── outfits/     # 코디 CRUD (items + position)
│   │   ├── common/      # multer 옵션 등
│   │   └── main.ts      # /api 글로벌 prefix, /uploads 정적 서빙
│   └── uploads/         # 업로드된 이미지 (gitignore)
│
├── frontend/            # Next.js 15 App Router (port 4001)
│   └── src/
│       ├── app/         # /, /login, /signup, /dashboard
│       ├── components/  # ImageUploader, OutfitCanvas, OutfitList
│       ├── lib/         # api.ts (axios), store.ts (zustand)
│       └── types/
│
└── docs/
```

## Ports

- **Backend:** `3001` (`/api/*` + `/uploads/*`)
- **Frontend:** `4001` (Next.js dev/start)
- 프로덕션 우분투 서버에서 `3000` / `4000`은 다른 서비스가 사용 중이라 한 칸씩 비켜서 잡혀 있음.
- 프론트엔드는 `next.config.js`의 rewrites로 `/api/*`, `/uploads/*`를 백엔드로 프록시 → 브라우저는 same-origin으로 호출하므로 dev에서도 CORS 이슈 없음.

## Local Development

### 사전 준비
- Node.js 20+
- MariaDB (로컬: `root` / `1234`)
- DB 생성: `CREATE DATABASE fashion_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

### Backend

```bash
cd backend
npm install
npm run start:dev
```

`backend/.env` 예시:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=1234
DB_NAME=fashion_db
JWT_SECRET=replace-with-long-random-secret
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:4001
```

API: `http://localhost:3001/api/...`
업로드 이미지 정적 서빙: `http://localhost:3001/uploads/<filename>`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` 예시:
```
NEXT_PUBLIC_API_URL=/api
BACKEND_URL=http://localhost:3001
```

웹앱: `http://localhost:4001`

## API Endpoints (모두 `/api` prefix)

### 인증
- `POST /api/auth/signup` — 회원가입
- `POST /api/auth/login` — 로그인 → `{ accessToken, user }`

### 사용자 (JWT)
- `GET /api/users/me` — 내 프로필

### 옷 이미지 (JWT)
- `POST /api/images/upload` — `multipart/form-data` (`file`, `category`, `tags?`)
- `GET /api/images?category=top` — 카테고리 필터 가능
- `GET /api/images/:id`
- `DELETE /api/images/:id`

### 코디 (JWT)
- `POST /api/outfits` — `{ name, items: [{ clothingImageId, category, position }] }`
- `GET /api/outfits` — 내 코디 목록 (items 포함)
- `GET /api/outfits/:id`
- `PUT /api/outfits/:id`
- `DELETE /api/outfits/:id`

## Ubuntu 배포 가이드

### 1. MariaDB
```bash
sudo apt-get install mariadb-server
sudo mysql -u root
> CREATE DATABASE fashion_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> CREATE USER 'fashion_user'@'localhost' IDENTIFIED BY 'secure_password';
> GRANT ALL PRIVILEGES ON fashion_db.* TO 'fashion_user'@'localhost';
> FLUSH PRIVILEGES;
```

### 2. Backend (port 3001)
```bash
cd backend
npm install --production=false
npm run build
NODE_ENV=production pm2 start dist/main.js --name fashion-backend
```

### 3. Frontend (port 4001)
```bash
cd frontend
npm install
npm run build
pm2 start npm --name fashion-frontend -- run start
```

### 4. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded images
    location /uploads/ {
        proxy_pass http://localhost:3001;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fashion /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Tech

- **Backend:** NestJS 10, TypeORM 0.3, MariaDB, JWT, multer (디스크 저장), bcrypt
- **Frontend:** Next.js 15 App Router, React 19, Tailwind 3, Zustand, axios

## License

MIT
