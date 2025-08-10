# Sprint 4 - Achievements and Gamification System

## Overview

The ActivAmigos platform now includes a complete points, levels, and achievements system that gamifies user engagement. This system encourages users to participate more actively in the platform by rewarding them with points and achievements for various actions.

## 🎯 System Features

### Core Functionality
- **Points System**: Users earn points for various activities
- **Level Progression**: Users advance through levels based on points (level = floor(points / 100))
- **Achievements**: Unlockable badges with descriptions and point rewards
- **Progress Tracking**: Visual progress bars showing advancement to next level
- **Icon Management**: Achievement icons stored and served through MinIO

### Key Formulas
- **Level Calculation**: `level = floor(points / 100)`
- **Progress Calculation**: `progress = (points % 100) / 100`

## 🗄️ Database Schema

### Tables Created

#### `achievements`
```sql
- id (Primary Key)
- title (String, 100 chars)
- description (Text)
- icon_url (String, 255 chars, nullable)
- points_reward (Integer)
- created_at (DateTime)
```

#### `user_points`
```sql
- id (Primary Key)
- user_id (Foreign Key to users.id, unique)
- points (Integer, default: 0)
- updated_at (DateTime)
```

#### `user_achievements`
```sql
- id (Primary Key)
- user_id (Foreign Key to users.id)
- achievement_id (Foreign Key to achievements.id)
- date_earned (DateTime)
- Unique constraint: (user_id, achievement_id)
```

## 🔌 Backend API Endpoints

All endpoints are under the `/api/user/achievements` prefix with a dedicated Flask-Smorest blueprint.

### GET `/api/user/achievements`
**Description**: Get user's complete gamification state
**Authentication**: Required (`@require_user`)
**Response**:
```json
{
  "points": 150,
  "level": 1,
  "progress_to_next_level": 0.5,
  "earned_achievements": [
    {
      "id": 1,
      "user_id": 1,
      "achievement_id": 1,
      "date_earned": "2025-01-10T12:00:00",
      "achievement": {
        "id": 1,
        "title": "Primera Actividad",
        "description": "¡Felicidades! Has completado tu primera actividad...",
        "icon_url": "achievement_1_20250110.png",
        "points_reward": 50,
        "created_at": "2025-01-10T10:00:00"
      }
    }
  ]
}
```

### POST `/api/user/achievements`
**Description**: Update user's gamification state by adding points and/or achievements
**Authentication**: Required (`@require_user`)
**Request Body**:
```json
{
  "points": 25,              // Optional: points to add
  "achievement_id": 2        // Optional: achievement to award
}
```
**Response**: Same as GET endpoint with updated values

### GET `/api/user/achievements/icons/{achievement_id}`
**Description**: Stream achievement icon from MinIO storage
**Authentication**: Not required
**Response**: Image file (PNG) with caching headers

### GET `/api/user/achievements/all`
**Description**: Get all available achievements
**Authentication**: Required
**Response**: Array of achievement objects

## 🎨 Frontend Components

### TypeScript Interfaces

```typescript
export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon_url?: string;
  points_reward: number;
  created_at: string;
}

export interface GamificationState {
  points: number;
  level: number;
  progress_to_next_level: number;
  earned_achievements: UserAchievement[];
}
```

### AchievementsService

```typescript
class AchievementsService {
  getGamificationState(): Observable<GamificationState>
  updateGamificationState(data: UpdateGamificationRequest): Observable<GamificationState>
  addPoints(points: number): Observable<GamificationState>
  awardAchievement(achievementId: number): Observable<GamificationState>
  getAllAchievements(): Observable<Achievement[]>
  getAchievementIconUrl(achievementId: number): string
}
```

### LevelProgressBarComponent

A reusable component that displays level progression with smooth animations:

**Inputs**:
- `level: number` - Current user level
- `progressToNextLevel: number` - Progress as float (0-1)
- `showPoints: boolean` - Whether to show points info
- `showLevel: boolean` - Whether to show level info

**Features**:
- Smooth progress bar animations
- Gradient styling with TailwindCSS
- Shimmer effect on progress bar
- Responsive design

## 📱 User Interface

### Profile Page Integration

The achievements system is integrated into the user profile page with two main sections:

1. **Gamification Section**: Shows current level and progress bar
2. **Achievements Section**: Displays earned achievements in a responsive grid

#### Features:
- **Progress Visualization**: Animated progress bar showing advancement to next level
- **Achievement Gallery**: Grid layout showing earned achievements with icons, titles, descriptions, and dates
- **Empty State**: Motivational message when user has no achievements yet
- **Loading States**: Smooth loading indicators during API calls
- **Cache-Busted Icons**: Achievement icons with timestamp parameters for proper caching

## 🌱 Initial Data Seeding

### Predefined Achievements

The system comes with 6 initial achievements:

1. **Primera Actividad** (50 points) - Complete first activity
2. **Explorador Social** (75 points) - Join first group
3. **Estrella en Ascenso** (100 points) - Reach level 5
4. **Organizador Nato** (125 points) - Create first activity
5. **Maestro de la Consistencia** (200 points) - Complete 10 activities
6. **Embajador ActivAmigos** (300 points) - Reach level 10

### Running the Seed Script

```bash
cd backend
python seed_achievements.py
```

This script:
- Creates achievement-icons bucket in MinIO
- Downloads placeholder icons for each achievement
- Uploads icons to MinIO storage
- Creates achievement records in the database

## 🧪 Testing

### Comprehensive Test Suite

A complete test script is provided to verify all functionality:

```bash
python test_achievements_system.py
```

**Test Coverage**:
1. User registration and login
2. Initial gamification state (empty)
3. Adding points to user
4. Retrieving all achievements
5. Awarding achievements
6. Level up scenarios
7. Duplicate achievement prevention
8. Final state verification
9. Achievement icon endpoint testing

### Prerequisites for Testing
1. Docker Compose running (`docker-compose up -d`)
2. Backend server running on localhost:5000
3. Database migrated
4. Achievements seeded

## 🔧 Technical Implementation Details

### Backend Architecture
- **Models**: SQLAlchemy models following existing patterns
  - `Achievement` model in `/models/achievement/`
  - `UserPoints` and `UserAchievement` association models in `/models/associations/`
- **Services**: Flask-Smorest blueprint with proper error handling
- **Authentication**: Uses existing `@require_user` decorator
- **File Storage**: MinIO integration for achievement icons
- **Migration**: Alembic migration for database schema
- **Achievement Engine**: Automatic triggering system for awarding achievements

### Achievement Triggering System

The system automatically awards achievements when users perform specific actions:

#### **Achievement Types & Triggers:**

1. **"Explorador Social" (75 pts)** - Triggered when user joins their first group
2. **"Primera Actividad" (50 pts)** - Triggered when user participates in their first activity
3. **"Organizador Nato" (125 pts)** - Triggered when user creates their first activity
4. **"Maestro de la Consistencia" (200 pts)** - Triggered when user participates in 10 activities
5. **"Estrella en Ascenso" (100 pts)** - Triggered when user reaches level 5
6. **"Embajador ActivAmigos" (300 pts)** - Triggered when user reaches level 10

#### **Integration Points:**

- **Group Service**: Triggers achievements when joining groups
- **Activity Service**: Triggers achievements when creating or joining activities  
- **Achievements Service**: Triggers level-based achievements when points are added
- **Manual Check**: `/check-all` endpoint for retroactive achievement awarding

### Frontend Architecture
- **Services**: Angular services following existing HTTP patterns
- **Components**: Standalone Angular components with TailwindCSS
- **Models**: TypeScript interfaces for type safety
- **Integration**: Seamless integration with existing profile page

### Performance Considerations
- **Database Indexes**: Proper foreign keys and unique constraints
- **Caching**: Achievement icons cached with timestamps
- **Lazy Loading**: Icons loaded only when needed
- **Optimistic Updates**: UI updates immediately for better UX

## 🎨 Visual Design

### Design System Consistency
- **Colors**: Indigo/purple gradient for progress bars, yellow for achievements
- **Typography**: Consistent with existing Plus Jakarta Sans font
- **Spacing**: TailwindCSS spacing utilities following app patterns
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design with desktop adaptations

### Accessibility Features
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color combinations
- **Motion Preferences**: Respects `prefers-reduced-motion` settings

## 🚀 Deployment Instructions

### Backend Deployment
1. Run database migration: `flask db upgrade`
2. Seed achievements: `python seed_achievements.py`
3. Ensure MinIO is accessible and configured
4. Register achievements service in `app.py`

### Frontend Deployment
1. No additional build steps required
2. Components are standalone and tree-shakeable
3. Styles are included in existing TailwindCSS build

## 📈 Future Enhancements

### Potential Improvements
1. **Achievement Categories**: Group achievements by type (social, activity, milestone)
2. **Leaderboards**: Compare user progress with others
3. **Seasonal Achievements**: Limited-time special achievements
4. **Achievement Notifications**: Real-time notifications when achievements are earned
5. **Custom Icons**: Allow uploading custom achievement icons
6. **Points Decay**: Optional point decay for inactive users
7. **Achievement Dependencies**: Chain achievements that unlock others

### Analytics Integration
- Track achievement unlock rates
- Monitor user engagement increases
- A/B test different point values
- Analyze level progression patterns

## 📋 Maintenance

### Regular Tasks
1. **Monitor MinIO Storage**: Ensure achievement icons are accessible
2. **Database Performance**: Monitor query performance on achievement tables
3. **User Feedback**: Collect feedback on achievement difficulty and rewards
4. **Content Updates**: Regularly add new achievements to maintain engagement

### Error Handling
- Graceful degradation when MinIO is unavailable
- Proper error messages for API failures
- Fallback icons when achievement icons fail to load
- Transaction rollbacks for data consistency

---

## ✅ Sprint 4 Completion Summary

**Delivered Features**:
- ✅ Complete points and levels system
- ✅ Achievement management system
- ✅ MinIO integration for icon storage
- ✅ Responsive UI components
- ✅ Database schema and migrations
- ✅ Comprehensive API endpoints
- ✅ Initial achievement seeding
- ✅ Complete test suite
- ✅ Visual consistency with existing design

**Technical Excellence**:
- ✅ Follows existing code patterns
- ✅ Proper error handling and validation
- ✅ Type safety with TypeScript
- ✅ Responsive and accessible design
- ✅ Performance optimized
- ✅ Comprehensive documentation
- ✅ Thorough testing coverage

The achievements and gamification system is now fully integrated into the ActivAmigos platform, providing users with engaging progression mechanics while maintaining the high code quality and design standards established in previous sprints.