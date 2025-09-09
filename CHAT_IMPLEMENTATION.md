# Real-Time Chat Implementation for ActivAmigos

## 🎯 Overview

This document provides a comprehensive guide to the real-time chat system implemented for the ActivAmigos platform. The system enables group-based messaging for both Groups and Activities with WebSocket support for real-time communication.

## 🏗️ Architecture

### Backend Architecture
- **Framework**: Flask + SQLAlchemy
- **WebSocket**: Flask-SocketIO with eventlet
- **Database**: PostgreSQL with new `messages` table
- **API**: RESTful endpoints with Flask-Smorest
- **Authentication**: Session-based authentication

### Frontend Architecture
- **Framework**: Angular 20+ (Standalone Components)
- **WebSocket Client**: Socket.IO Client
- **UI**: Tailwind CSS with responsive design
- **State Management**: RxJS Observables

## 📊 Database Schema

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    sender_id INTEGER REFERENCES users(id),
    group_id INTEGER REFERENCES groups(id) NULL,
    activity_id INTEGER REFERENCES activities(id) NULL,
    CONSTRAINT check_room_type CHECK (
        (group_id IS NOT NULL AND activity_id IS NULL) OR 
        (group_id IS NULL AND activity_id IS NOT NULL)
    )
);
```

## 🛠️ Backend Implementation

### 1. Message Model (`models/message/message.py`)
```python
class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.id'), nullable=True)
    
    # Relationships
    sender = db.relationship('User', backref='sent_messages')
    group = db.relationship('Group', backref='messages')
    activity = db.relationship('Activity', backref='messages')
```

### 2. WebSocket Events (`services/chat_service.py`)

#### Client → Server Events:
- `connect` - User connects to WebSocket
- `join_chat` - Join a specific chat room
- `leave_chat` - Leave a chat room  
- `send_message` - Send a new message

#### Server → Client Events:
- `new_message` - Broadcast new message to room
- `joined_chat` - Confirmation of joining room
- `left_chat` - Confirmation of leaving room
- `error` - Error notifications

### 3. REST API Endpoints

#### Group Chat Endpoints:
```
GET /api/chat/groups/{group_id}/messages
POST /api/chat/groups/{group_id}/messages
```

#### Activity Chat Endpoints:
```
GET /api/chat/activities/{activity_id}/messages  
POST /api/chat/activities/{activity_id}/messages
```

### 4. Access Control
- **Group Chat**: User must be a member of the group
- **Activity Chat**: User must be a participant in the activity
- **Session Validation**: All requests require valid user session

## 🎨 Frontend Implementation

### 1. Core Services

#### WebSocket Service (`core/services/websocket.service.ts`)
```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  connect(): void
  disconnect(): void
  joinChat(type: 'group' | 'activity', id: number): void
  leaveChat(type: 'group' | 'activity', id: number): void
  sendMessage(content: string, groupId?: number, activityId?: number): void
  getConnectionStatus(): Observable<boolean>
  getMessages(): Observable<Message[]>
}
```

#### Chat Service (`core/services/chat.service.ts`)
```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  getGroupMessages(groupId: number, params?: MessageListQuery): Observable<Message[]>
  sendGroupMessage(groupId: number, message: CreateMessage): Observable<Message>
  getActivityMessages(activityId: number, params?: MessageListQuery): Observable<Message[]>
  sendActivityMessage(activityId: number, message: CreateMessage): Observable<Message>
}
```

### 2. Chat Component (`shared/components/chat/chat.component.ts`)

#### Features:
- **Real-time messaging** with WebSocket connection
- **Message history** loading via REST API
- **Auto-scroll** to newest messages
- **Connection status** indicator
- **Message formatting** with timestamps and user info
- **Accessibility** support with ARIA labels
- **Responsive design** for mobile and desktop

#### Input Properties:
```typescript
@Input() chatRoom!: ChatRoom;     // { type: 'group'|'activity', id: number, name: string }
@Input() currentUserId!: number;  // Current user's ID for message styling
```

### 3. Integration

#### Group Details Integration:
```typescript
// Set up chat room
this.chatRoom = {
  type: 'group',
  id: details.id,
  name: details.name
};
```

#### Activity Details Integration:
```typescript  
// Set up chat room
this.chatRoom = {
  type: 'activity', 
  id: details.id,
  name: details.title
};
```

## 🚀 Getting Started

### Backend Setup

1. **Install Dependencies**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Environment Configuration**:
```bash
# Create .env file
DATABASE_URL=postgresql://user:password@localhost:5432/activamigos
SECRET_KEY=your-secret-key
```

3. **Database Migration**:
```bash
export FLASK_APP=app.py
flask db upgrade
```

4. **Run Backend**:
```bash
python app.py
```

### Frontend Setup

1. **Install Dependencies**:
```bash
cd frontend/activamigos-frontend
npm install
```

2. **Environment Configuration**:
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

3. **Run Frontend**:
```bash
npm start
```

## 🔧 Configuration

### Backend Configuration (`config/config.py`)
```python
class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecret")
    # ... other config
```

### Frontend Configuration (`app.config.ts`)
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    // ... other providers
  ]
};
```

## 📱 User Experience

### Group Chat Flow:
1. User navigates to Group Details page
2. Chat component loads with group context
3. WebSocket connection established automatically
4. User joins group chat room
5. Message history loaded via REST API
6. Real-time messages received via WebSocket
7. User can send messages with instant feedback

### Activity Chat Flow:
1. User navigates to Activity Details page  
2. Chat component loads with activity context
3. Same real-time flow as group chat
4. Messages are scoped to activity participants

### UI/UX Features:
- **Connection Status**: Visual indicator (green/red dot)
- **Message Bubbles**: Different styling for own vs others' messages
- **Timestamps**: Relative time display (e.g., "5m ago", "2h ago")
- **User Avatars**: Initials-based avatars for message senders
- **Auto-scroll**: Automatic scroll to newest messages
- **Responsive**: Works on mobile and desktop
- **Accessibility**: Screen reader support, keyboard navigation

## 🔒 Security Considerations

### Backend Security:
- **Session Validation**: All WebSocket and REST requests validate user sessions
- **Access Control**: Users can only access chats for groups/activities they belong to
- **Input Validation**: Message content validated and sanitized
- **Rate Limiting**: Should be implemented for production (not included in this sprint)

### Frontend Security:
- **CORS Configuration**: Backend configured for specific frontend origin
- **Credential Handling**: Cookies sent with credentials for session management
- **Input Sanitization**: Message content escaped to prevent XSS

## 🧪 Testing

### Manual Testing Checklist:

#### Backend Testing:
- [ ] WebSocket connection establishment
- [ ] Join/leave chat room functionality
- [ ] Message sending and broadcasting
- [ ] REST API message retrieval
- [ ] Access control validation
- [ ] Database message persistence

#### Frontend Testing:
- [ ] Chat component rendering
- [ ] WebSocket service connection
- [ ] Real-time message display
- [ ] Message sending functionality
- [ ] Connection status updates
- [ ] Responsive design on different screen sizes

#### Integration Testing:
- [ ] End-to-end message flow (send → database → broadcast → display)
- [ ] Multiple users in same chat room
- [ ] Switching between different chat rooms
- [ ] Connection recovery after network issues

## 🐛 Troubleshooting

### Common Issues:

#### WebSocket Connection Fails:
```typescript
// Check browser console for errors
// Verify backend is running on correct port
// Check CORS configuration
```

#### Messages Not Appearing:
```python
# Check database connection
# Verify user session is valid
# Check WebSocket room joining
```

#### Permission Denied Errors:
```python
# Verify user is member of group/activity
# Check session authentication
# Validate access control decorators
```

## 📈 Future Enhancements

### Planned Features (Not in Current Sprint):
1. **Push Notifications**: When user is outside chat
2. **Media Attachments**: Images, voice messages
3. **Message Reactions**: Emoji reactions to messages  
4. **Typing Indicators**: Show when users are typing
5. **Message Threading**: Reply to specific messages
6. **Moderation Features**: Delete messages, report abuse
7. **Message Search**: Search through chat history
8. **File Sharing**: Document and file attachments

### Performance Optimizations:
1. **Message Pagination**: Load older messages on scroll
2. **Connection Pooling**: Optimize database connections
3. **Caching**: Redis for frequently accessed messages
4. **CDN**: Static asset delivery optimization

## 📝 API Documentation

### WebSocket Events

#### `join_chat`
```json
// Client sends:
{
  "type": "group",     // or "activity"
  "id": 123
}

// Server responds:
{
  "room": "group_123",
  "type": "group", 
  "id": 123
}
```

#### `send_message`
```json
// Client sends:
{
  "content": "Hello everyone!",
  "group_id": 123      // or "activity_id": 456
}

// Server broadcasts:
{
  "id": 789,
  "content": "Hello everyone!",
  "timestamp": "2024-01-01T12:00:00Z",
  "sender_id": 1,
  "sender": {
    "id": 1,
    "username": "user123",
    "first_name": "John",
    "last_name": "Doe"
  },
  "group_id": 123
}
```

### REST API Examples

#### Get Group Messages:
```http
GET /api/chat/groups/123/messages?page=1&per_page=20
Authorization: Session-based

Response:
[
  {
    "id": 789,
    "content": "Hello everyone!",
    "timestamp": "2024-01-01T12:00:00Z",
    "sender_id": 1,
    "sender": { "id": 1, "username": "user123", ... },
    "group_id": 123
  }
]
```

#### Send Message via REST:
```http
POST /api/chat/groups/123/messages
Content-Type: application/json

{
  "content": "Hello from REST API!"
}
```

## 🤝 Contributing

### Code Style:
- **Backend**: Follow PEP 8 Python style guide
- **Frontend**: Follow Angular style guide
- **Commits**: Use conventional commit format

### Pull Request Process:
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation if needed
4. Submit PR with clear description
5. Ensure all checks pass

## 📞 Support

For questions or issues with the chat implementation:
1. Check this documentation first
2. Review error logs in browser console and server logs
3. Test with minimal example to isolate the issue
4. Create detailed bug report with reproduction steps

---

**Implementation Status**: ✅ Complete for Sprint Goal
**Last Updated**: January 2024
**Version**: 1.0.0