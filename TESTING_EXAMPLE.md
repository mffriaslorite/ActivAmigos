# Testing the Real-Time Chat System

## 🧪 Manual Testing Guide

### Prerequisites
1. PostgreSQL running with the ActivAmigos database
2. Backend server running on `http://localhost:5000`
3. Frontend server running on `http://localhost:4200`
4. At least one user account created and logged in

### Test Scenario 1: Basic Chat Functionality

#### Step 1: Access Group Chat
1. Navigate to `http://localhost:4200`
2. Log in with your user account
3. Go to Groups section
4. Click on any group to view details
5. Scroll down to see the "Chat del Grupo" section
6. Verify the chat component loads with connection status

#### Step 2: Send a Message
1. Type a message in the input field
2. Click "Enviar" or press Enter
3. Verify the message appears immediately in the chat
4. Check that the message shows your name and timestamp
5. Verify the message persists after page refresh

#### Step 3: Test Real-Time Features
1. Open the same group in another browser/incognito window
2. Log in with a different user account
3. Send a message from the second window
4. Verify the message appears instantly in the first window
5. Check that different users have different message styling

### Test Scenario 2: Activity Chat

#### Step 1: Access Activity Chat
1. Navigate to Activities section
2. Click on any activity to view details
3. Scroll to "Chat de la Actividad" section
4. Verify chat loads correctly

#### Step 2: Test Activity-Specific Messages
1. Send messages in activity chat
2. Navigate to a different activity
3. Verify messages are activity-specific
4. Return to original activity and verify messages persist

### Test Scenario 3: Connection Handling

#### Step 1: Connection Status
1. Check the connection indicator (green/red dot)
2. Verify it shows "Conectado" when connected
3. Try refreshing the page and watch reconnection

#### Step 2: Network Issues
1. Disconnect your internet briefly
2. Verify connection status changes to "Desconectado"
3. Try sending a message while disconnected
4. Reconnect and verify messages sync

### Test Scenario 4: Access Control

#### Step 1: Group Membership
1. Try to access a group you're not a member of
2. Verify you can't see the chat or get access denied

#### Step 2: Activity Participation
1. Try to access an activity you're not participating in
2. Verify proper access control

### Expected Results

#### ✅ Success Criteria:
- [ ] Messages send and receive in real-time
- [ ] Message history loads on page load
- [ ] Connection status updates correctly
- [ ] Different users see each other's messages
- [ ] Messages persist after page refresh
- [ ] Chat is scoped to specific groups/activities
- [ ] Access control prevents unauthorized access
- [ ] UI is responsive and accessible
- [ ] No console errors in browser dev tools
- [ ] Backend logs show WebSocket connections

#### ❌ Common Issues and Solutions:

**Messages not appearing:**
- Check browser console for WebSocket errors
- Verify backend is running and accessible
- Check that user is logged in properly

**Connection status always red:**
- Verify backend WebSocket server is running
- Check CORS configuration in backend
- Ensure frontend is connecting to correct URL

**Permission denied errors:**
- Verify user is member of group/activity
- Check session authentication
- Review backend access control logs

## 🔧 Development Testing

### Backend Testing

#### Test WebSocket Connection:
```bash
# Install wscat for testing
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:5000/socket.io/?EIO=4&transport=websocket

# Send join_chat event
{"type":"join_chat","data":{"type":"group","id":1}}
```

#### Test REST API:
```bash
# Get messages for group 1
curl -X GET http://localhost:5000/api/chat/groups/1/messages \
  -H "Content-Type: application/json" \
  --cookie "session=your-session-cookie"

# Send message via REST
curl -X POST http://localhost:5000/api/chat/groups/1/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"Test message from API"}' \
  --cookie "session=your-session-cookie"
```

### Frontend Testing

#### Check WebSocket Service:
```typescript
// In browser console
const wsService = window.ng.getComponent(document.body).injector.get('WebSocketService');
console.log('Connected:', wsService.isConnected());
```

#### Monitor Network Traffic:
1. Open Chrome DevTools
2. Go to Network tab
3. Filter by WS (WebSocket)
4. Watch real-time message traffic

### Database Verification

#### Check Messages in Database:
```sql
-- Connect to PostgreSQL
psql -U user -d activamigos

-- View recent messages
SELECT m.id, m.content, m.timestamp, u.username, m.group_id, m.activity_id
FROM messages m
JOIN users u ON m.sender_id = u.id
ORDER BY m.timestamp DESC
LIMIT 10;

-- Count messages by group
SELECT group_id, COUNT(*) as message_count
FROM messages
WHERE group_id IS NOT NULL
GROUP BY group_id;
```

## 🚨 Troubleshooting

### Issue: WebSocket Connection Fails

**Symptoms:**
- Red connection indicator
- Messages don't send in real-time
- Console errors about WebSocket

**Solutions:**
1. Check backend is running: `curl http://localhost:5000/health`
2. Verify CORS settings in backend
3. Check browser blocks WebSocket (corporate firewall)
4. Try different browser or incognito mode

### Issue: Messages Not Persisting

**Symptoms:**
- Messages disappear after page refresh
- Database queries return no messages

**Solutions:**
1. Check database connection in backend
2. Verify database migration ran successfully
3. Check for database constraint violations
4. Review backend error logs

### Issue: Access Denied Errors

**Symptoms:**
- Can't join chat rooms
- 403 errors in network tab
- "Access denied" messages

**Solutions:**
1. Verify user is logged in
2. Check user is member of group/activity
3. Review session authentication
4. Check backend access control logic

### Issue: Frontend Not Loading Chat

**Symptoms:**
- Chat component doesn't render
- "Preparando el chat..." message persists
- Console errors about missing dependencies

**Solutions:**
1. Check Angular component imports
2. Verify Socket.IO client is installed
3. Check environment configuration
4. Review browser console for errors

## 📊 Performance Testing

### Load Testing (Optional)

#### Test Multiple Users:
1. Use multiple browser windows/devices
2. Have 5-10 users join same chat room
3. Send messages simultaneously
4. Monitor backend performance

#### Monitor Resources:
```bash
# Monitor backend process
top -p $(pgrep -f "python app.py")

# Check database connections
psql -U user -d activamigos -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor WebSocket connections
netstat -an | grep :5000 | grep ESTABLISHED | wc -l
```

---

**Testing Checklist Complete**: When all tests pass, the chat system is ready for production deployment.

**Note**: This testing guide covers manual testing. For automated testing, consider adding unit tests, integration tests, and E2E tests using appropriate testing frameworks.