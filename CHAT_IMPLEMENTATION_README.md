# ActivAmigos Real-Time Chat Implementation

## Overview

This document describes the implementation of a real-time group chat system for ActivAmigos, designed specifically for users with cognitive difficulties. The system provides accessible, real-time messaging within groups and activities.

## Architecture

### Backend (Flask + Flask-SocketIO)
- **WebSocket Server**: Flask-SocketIO for real-time communication
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Message Model**: Stores messages with group/activity associations
- **REST API**: Fallback endpoints when WebSockets unavailable

### Frontend (Angular)
- **Chat Component**: Reusable chat interface with accessibility features
- **WebSocket Service**: Manages real-time connections
- **Real-time Updates**: Instant message delivery and status updates

## Features

### ✅ Implemented (Current Sprint)
- Real-time group chat for groups and activities
- WebSocket-based messaging with REST API fallback
- Message persistence in PostgreSQL
- Access control (only members can access chat)
- Accessible UI with clear visual hierarchy
- Auto-scroll to newest messages
- Message pagination (load previous messages)
- Connection status indicators
- Responsive design for mobile devices

### 🔄 Future Enhancements (Not in Current Sprint)
- Push notifications when outside chat
- Media attachments (images, voice)
- Moderation features (delete messages, report abuse)
- Typing indicators
- Message reactions

## Database Schema

### Messages Table
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    group_id INTEGER REFERENCES groups(id),
    activity_id INTEGER REFERENCES activities(id),
    CONSTRAINT check_group_or_activity 
        CHECK ((group_id IS NOT NULL AND activity_id IS NULL) 
               OR (group_id IS NULL AND activity_id IS NOT NULL))
);
```

## Installation & Setup

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Database Migration**
   ```bash
   # Run the migration script
   python -c "
   from app import app, db
   with app.app_context():
       db.create_all()
   "
   ```

3. **Start Backend Server**
   ```bash
   python app.py
   ```
   The server will start on `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend/activamigos-frontend
   npm install
   ```

2. **Start Frontend Development Server**
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:4200`

## Usage Examples

### Backend API Endpoints

#### Get Chat Messages
```bash
GET /chat/group/1/messages?page=1&per_page=50
```

#### Send Message via REST API
```bash
POST /chat/group/1/messages
Content-Type: application/json

{
  "content": "Hello everyone!",
  "user_id": 123
}
```

#### Get Chat Status
```bash
GET /chat/group/1/status
```

### WebSocket Events

#### Join Chat Room
```javascript
socket.emit('join_chat', {
  user_id: 123,
  chat_type: 'group',
  chat_id: 1
});
```

#### Send Message
```javascript
socket.emit('send_message', {
  user_id: 123,
  content: 'Hello everyone!',
  chat_type: 'group',
  chat_id: 1
});
```

#### Listen for New Messages
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

### Frontend Integration

#### Basic Chat Component Usage
```html
<app-chat
  [chatType]="'group'"
  [chatId]="group.id"
  [chatName]="group.name"
  [currentUserId]="currentUser.id"
></app-chat>
```

#### Chat Service Usage
```typescript
import { ChatService } from './core/services/chat.service';

constructor(private chatService: ChatService) {}

// Set current user
this.chatService.setCurrentUser(currentUser);

// Join chat room
this.chatService.joinChat('group', groupId);

// Send message
this.chatService.sendMessage('group', groupId, 'Hello!');

// Listen for new messages
this.chatService.newMessage$.subscribe(message => {
  console.log('New message:', message);
});
```

## Security Features

### Access Control
- Users can only access chats for groups/activities they're members of
- WebSocket connections validate membership before allowing access
- REST API endpoints check permissions before processing requests

### Input Validation
- Message content is sanitized and validated
- Maximum message length: 1000 characters
- SQL injection protection via SQLAlchemy ORM

### Rate Limiting
- WebSocket events are validated for required parameters
- Error handling prevents malformed requests from affecting the system

## Accessibility Features

### Visual Design
- High contrast colors for better visibility
- Large, clear fonts for readability
- Distinct message bubbles for own vs. others' messages
- Clear timestamps and sender information

### Keyboard Navigation
- Tab navigation through chat elements
- Enter key to send messages
- Shift+Enter for new lines

### Screen Reader Support
- ARIA labels for all interactive elements
- Semantic HTML structure
- Clear role definitions for chat regions

### Cognitive Load Reduction
- Simple, consistent interface
- Clear visual hierarchy
- Minimal distractions
- Predictable interaction patterns

## Performance Considerations

### Backend
- Database indexes on frequently queried fields
- Message pagination to limit memory usage
- Efficient WebSocket room management
- Connection pooling for database

### Frontend
- Virtual scrolling for large message histories
- Lazy loading of previous messages
- Efficient change detection with OnPush strategy
- Memory leak prevention with proper cleanup

## Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd frontend/activamigos-frontend
ng test
```

### Manual Testing Checklist
- [ ] Join/leave chat rooms
- [ ] Send and receive messages in real-time
- [ ] Load message history with pagination
- [ ] Test WebSocket fallback to REST API
- [ ] Verify access control (non-members can't access)
- [ ] Test responsive design on mobile
- [ ] Verify accessibility features

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check if backend server is running
- Verify CORS configuration
- Check firewall settings
- Ensure Socket.io client is properly imported

#### Messages Not Appearing
- Verify user membership in group/activity
- Check database connection
- Review WebSocket event handlers
- Check browser console for errors

#### Performance Issues
- Monitor database query performance
- Check WebSocket connection limits
- Review frontend change detection
- Monitor memory usage

### Debug Mode
Enable debug logging in the backend:
```python
# In app.py
socketio.run(app, debug=True, host="0.0.0.0", port=5000)
```

## Deployment

### Production Considerations
- Use Redis adapter for Socket.IO scaling
- Implement proper SSL/TLS for WebSocket connections
- Set up database connection pooling
- Configure proper CORS origins
- Implement rate limiting
- Set up monitoring and logging

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## Contributing

### Code Style
- Follow existing code patterns
- Use TypeScript strict mode
- Implement proper error handling
- Add comprehensive tests
- Document new features

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and approval
6. Merge to main branch

## Support

For questions or issues:
- Check this documentation
- Review code comments
- Check GitHub issues
- Contact development team

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Production Ready