# ActivAmigos - Inclusive Social Platform

🌟 A responsive web platform designed to help adults with cognitive disabilities participate in social and leisure activities, join groups, and improve social inclusion.

## 🚀 Project Overview

ActivAmigos is built with accessibility and inclusion at its core, following WCAG guidelines to ensure the platform is usable by everyone. The platform provides a safe, friendly environment for social interaction and activity participation.

### 🎯 Key Features

- **User Authentication**: Secure registration and login with accessibility preferences
- **Group Management**: Create and join interest-based groups
- **Activity Participation**: Browse, create, and join activities
- **Accessible Communication**: Group and activity chat with accessibility features
- **Gamification**: Badges and skill tracking to encourage participation
- **Help System**: Step-by-step tutorials with pictograms and easy-to-read content

## 🏗️ Technical Stack

### Frontend
- **Angular 20.1.0** with TypeScript
- **TailwindCSS** for responsive, accessible design
- **Angular CDK** for accessibility features
- **ESLint + Prettier** for code quality

### Backend
- **Python Flask** for REST API
- **SQLAlchemy** for database ORM
- **PostgreSQL** for data storage
- **Werkzeug** for password security
- **Ruff + Black** for code quality

### Infrastructure
- **Docker** for PostgreSQL database
- **CORS** enabled for frontend-backend communication

## 📋 Current Implementation Status

### ✅ Completed (Sprint 2: Authentication)

#### Backend
- ✅ Complete User model with accessibility preferences
- ✅ Secure password hashing with Werkzeug
- ✅ Full authentication API endpoints:
  - `POST /api/register` - User registration
  - `POST /api/login` - User login
  - `POST /api/logout` - User logout
  - `GET /api/profile` - Get user profile
  - `PUT /api/profile` - Update user profile
  - `POST /api/change-password` - Change password
  - `GET /api/check-session` - Session validation
- ✅ Input validation and error handling
- ✅ Session management with secure cookies
- ✅ Environment configuration with .env

#### Frontend
- ✅ Angular project structure with routing
- ✅ TailwindCSS with accessibility-focused configuration
- ✅ AuthService with reactive state management
- ✅ Auth Guard for protected routes
- ✅ Accessible login component with:
  - WCAG-compliant form design
  - Screen reader support
  - Keyboard navigation
  - High contrast mode support
  - Error handling and loading states

#### Accessibility Features
- ✅ High contrast color schemes
- ✅ Large text support
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Reduced motion preferences
- ✅ Touch-friendly 44px minimum targets
- ✅ Focus management and indicators

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Docker (for PostgreSQL)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install --break-system-packages flask flask-sqlalchemy flask-cors python-dotenv werkzeug psycopg2-binary
   ```

3. **Test the authentication system**
   ```bash
   python3 test_auth.py
   ```
   You should see: "🎉 All tests passed! The authentication system is ready."

4. **Start PostgreSQL database** (from project root)
   ```bash
   docker-compose up -d
   ```

5. **Run Flask application**
   ```bash
   python3 app.py
   ```
   Server will start at http://localhost:5000

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend/activamigos-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   Application will be available at http://localhost:4200

### Quick Test

1. Start both backend and frontend servers
2. Navigate to http://localhost:4200
3. You should be redirected to the login page
4. The login form should be fully accessible with keyboard navigation

## 🎨 Accessibility Features

### Visual Accessibility
- High contrast color schemes with 4.5:1+ contrast ratios
- Large text support (minimum 16px base font)
- Color-blind friendly palette
- Dark/light mode support

### Motor Accessibility
- Minimum 44px touch targets
- Keyboard navigation for all interactive elements
- Focus indicators with 3px visible borders
- No time-based interactions

### Cognitive Accessibility
- Simple, clear language throughout
- Consistent navigation patterns
- Error messages in plain language
- Step-by-step processes with progress indicators

### Screen Reader Support
- Semantic HTML with proper ARIA labels
- Live regions for dynamic content
- Screen reader-only text for context
- Proper heading hierarchy

## 📁 Project Structure

```
activamigos/
├── backend/
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py              # User model with accessibility preferences
│   ├── routes/
│   │   ├── __init__.py          # Route registration
│   │   └── auth_routes.py       # Authentication endpoints
│   ├── config/
│   │   └── config.py            # Flask configuration
│   ├── .env                     # Environment variables
│   ├── app.py                   # Flask application
│   ├── test_auth.py             # Authentication tests
│   └── requirements.txt         # Python dependencies
├── frontend/activamigos-frontend/
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts    # Authentication service
│   │   │   └── guards/
│   │   │       └── auth.guard.ts      # Route protection
│   │   ├── features/auth/
│   │   │   ├── components/
│   │   │   │   └── login.component.ts # Accessible login form
│   │   │   └── auth.routes.ts         # Auth routing
│   │   ├── app.config.ts              # Angular configuration
│   │   └── app.routes.ts              # Main routing
│   ├── src/styles.scss                # Global accessible styles
│   ├── tailwind.config.js             # Accessibility-focused config
│   └── package.json                   # Frontend dependencies
├── docker-compose.yml                 # PostgreSQL setup
└── README.md                          # This file
```

## 🗺️ Development Roadmap

### Sprint 3: Homepage & Navigation (Next)
- [ ] Accessible main navigation component
- [ ] Dashboard with user-specific content
- [ ] Quick access buttons to key features
- [ ] Mobile-responsive layout

### Sprint 4: Groups Module
- [ ] Group listing with accessible cards
- [ ] Group creation with form validation
- [ ] Join/leave group functionality
- [ ] Group management interface

### Sprint 5: Activities Module
- [ ] Activity browsing and filtering
- [ ] Activity creation with date/time picker
- [ ] Join activity functionality
- [ ] Activity details view

### Sprint 6: Communication
- [ ] Basic group chat
- [ ] Activity chat
- [ ] Message accessibility features
- [ ] Real-time updates

### Sprint 7: Gamification
- [ ] Achievement system
- [ ] User badges
- [ ] Skill tracking
- [ ] Progress visualization

### Sprint 8: Help & Tutorials
- [ ] Step-by-step guides
- [ ] Pictogram-based instructions
- [ ] Video tutorials with captions
- [ ] Accessibility settings tutorial

## 🧪 Testing

### Backend Tests
```bash
cd backend
python3 test_auth.py
```

### Frontend Tests
```bash
cd frontend/activamigos-frontend
npm test
```

### Accessibility Testing
- Use screen reader (NVDA, JAWS, VoiceOver)
- Test keyboard navigation (Tab, Enter, Escape)
- Verify color contrast ratios
- Test with high contrast mode enabled

## 🤝 Contributing

This project follows accessibility-first development principles:

1. **WCAG Compliance**: All features must meet WCAG 2.1 AA standards
2. **Keyboard Navigation**: Every interactive element must be keyboard accessible
3. **Screen Reader Testing**: Test with actual screen readers
4. **Simple Language**: Use clear, simple language throughout
5. **Progressive Enhancement**: Ensure basic functionality without JavaScript

## 📄 License

This project is part of a Final Degree Project focused on digital inclusion and accessibility.

## 🆘 Support

For accessibility issues or questions about using the platform, please refer to the Help section in the application or contact the development team.

---

**Built with ❤️ for digital inclusion and accessibility**