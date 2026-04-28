# Installation Guide

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- **MariaDB** 10.4+
- **Git** (optional)

## Step 1: Install MariaDB

### Windows
1. Download from https://mariadb.org/download/
2. Run installer and follow setup wizard
3. Remember your root password

### Mac
```bash
brew install mariadb
brew services start mariadb
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mariadb-server
sudo mysql_secure_installation
sudo systemctl start mariadb
```

## Step 2: Create Database

```bash
mysql -u root -p

# Enter your root password, then run:
CREATE DATABASE fashion_db;
CREATE USER 'fashion_user'@'localhost' IDENTIFIED BY 'fashion_password_123';
GRANT ALL PRIVILEGES ON fashion_db.* TO 'fashion_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=fashion_user
DB_PASSWORD=fashion_password_123
DB_NAME=fashion_db
JWT_SECRET=your-super-secret-jwt-key-12345
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
EOF

# Start development server
npm run start:dev
```

**Backend will run on http://localhost:3001**

## Step 4: Setup Frontend

Open a **new terminal** window:

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF

# Start development server
npm run dev
```

**Frontend will run on http://localhost:3000**

## Step 5: Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign up" to create a new account
3. Fill in email, name, and password
4. You'll be redirected to dashboard
5. Start uploading clothing images and building outfits!

## Troubleshooting

### Backend fails to connect to database
- Verify MariaDB is running: `sudo systemctl status mariadb`
- Check database credentials in `.env`
- Ensure database exists: `mysql -u fashion_user -p fashion_db -e "SHOW TABLES;"`

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Open DevTools (F12) > Network tab to check API calls

### Port already in use
```bash
# Find process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Missing dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. **Customize styling** in `frontend/src/` components
2. **Configure file uploads** in `backend/src/images/images.controller.ts`
3. **Add image categories** in database schema
4. **Implement outfit recommendations** in backend
5. **Deploy to Ubuntu server** (see main README.md)

## Development Tips

- Use `npm run start:dev` for backend auto-reload
- Use `npm run dev` for frontend hot-reload
- Check backend logs in terminal for errors
- Use DevTools in browser for frontend debugging
- Test API with Postman/Insomnia (collection available)

## Additional Resources

- NestJS Docs: https://docs.nestjs.com
- Next.js Docs: https://nextjs.org/docs
- TypeORM Docs: https://typeorm.io
- MariaDB Docs: https://mariadb.com/docs
