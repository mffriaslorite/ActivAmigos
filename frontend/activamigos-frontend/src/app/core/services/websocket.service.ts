import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message } from '../models/message.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private messages$ = new BehaviorSubject<Message[]>([]);
  private currentRoom: string | null = null;
  private currentUserId: number | null = null;

  constructor(private authService: AuthService) {
    // Listen for authentication changes
    this.authService.currentUser$.subscribe(user => {
      const newUserId = user?.id || null;
      
      // If user changed (login/logout), reconnect WebSocket
      if (this.currentUserId !== newUserId) {
        this.currentUserId = newUserId;
        this.handleUserChange(newUserId);
      }
    });
  }

  private handleUserChange(userId: number | null): void {
    if (userId === null) {
      // User logged out - disconnect WebSocket
      this.disconnect();
      this.clearMessages();
    } else {
      // User logged in or switched - reconnect WebSocket
      if (this.socket?.connected) {
        this.disconnect();
      }
      // Small delay to ensure session is properly set
      setTimeout(() => {
        this.connect();
      }, 100);
    }
  }

  connect(): void {
    // Don't connect if no user is logged in
    if (!this.currentUserId) {
      console.log('No user logged in, skipping WebSocket connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    const backendUrl = environment?.apiUrl || 'http://localhost:5000';
    
    this.socket = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true // Force new connection to ensure fresh authentication
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connected$.next(false);
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      
      // Handle authentication errors
      if (error.message && (
        error.message.includes('Not authenticated') || 
        error.message.includes('Invalid user session')
      )) {
        console.warn('WebSocket authentication failed, disconnecting...');
        this.disconnect();
        this.connected$.next(false);
      }
    });

    this.socket.on('new_message', (message: Message) => {
      console.log('New message received:', message);
      const currentMessages = this.messages$.value;
      this.messages$.next([...currentMessages, message]);
    });

    this.socket.on('joined_chat', (data: any) => {
      console.log('Joined chat room:', data);
      this.currentRoom = data.room;
    });

    this.socket.on('left_chat', (data: any) => {
      console.log('Left chat room:', data);
      this.currentRoom = null;
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected$.next(false);
      this.currentRoom = null;
    }
  }

  joinChat(type: 'group' | 'activity', id: number): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    this.socket.emit('join_chat', { type, id });
  }

  leaveChat(type: 'group' | 'activity', id: number): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave_chat', { type, id });
    this.messages$.next([]); // Clear messages when leaving chat
  }

  sendMessage(content: string, groupId?: number, activityId?: number): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    const messageData: any = { 
      content 
    };
    
    if (groupId) {
      messageData.context_type = 'GROUP';
      messageData.context_id = groupId;
    } else if (activityId) {
      messageData.context_type = 'ACTIVITY';
      messageData.context_id = activityId;
    } else {
      console.error('Either groupId or activityId must be provided');
      return;
    }

    this.socket.emit('send_message', messageData);
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  getMessages(): Observable<Message[]> {
    return this.messages$.asObservable();
  }

  setMessages(messages: Message[]): void {
    this.messages$.next(messages);
  }

  clearMessages(): void {
    this.messages$.next([]);
  }

  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  // Force reconnection (useful for debugging or manual refresh)
  forceReconnect(): void {
    console.log('Forcing WebSocket reconnection...');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 500);
  }
}