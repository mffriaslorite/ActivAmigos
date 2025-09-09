import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private messages$ = new BehaviorSubject<Message[]>([]);
  private currentRoom: string | null = null;

  constructor() {}

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const backendUrl = environment?.apiUrl || 'http://localhost:5000';
    
    this.socket = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
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

    const messageData: any = { content };
    
    if (groupId) {
      messageData.group_id = groupId;
    } else if (activityId) {
      messageData.activity_id = activityId;
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
}