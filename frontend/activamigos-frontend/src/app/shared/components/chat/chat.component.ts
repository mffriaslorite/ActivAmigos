import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { WebSocketService } from '../../../core/services/websocket.service';
import { ChatService } from '../../../core/services/chat.service';
import { Message, ChatRoom } from '../../../core/models/message.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() chatRoom!: ChatRoom;
  @Input() currentUserId!: number;
  
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  
  messages: Message[] = [];
  newMessage = '';
  isLoading = false;
  isConnected = false;
  shouldScrollToBottom = false;

  constructor(
    private webSocketService: WebSocketService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.initializeChat();
  }

  ngOnDestroy(): void {
    this.leaveChat();
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeChat(): void {
    // Connect to WebSocket
    this.webSocketService.connect();

    // Subscribe to connection status
    this.webSocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        if (connected) {
          this.joinChatRoom();
        }
      });

    // Subscribe to new messages
    this.webSocketService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.shouldScrollToBottom = true;
      });

    // Handle WebSocket errors (like authentication failures)
    this.webSocketService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        if (!connected && this.isConnected) {
          // Connection lost, try to reconnect after a delay
          setTimeout(() => {
            if (this.webSocketService.getCurrentUserId()) {
              this.webSocketService.connect();
            }
          }, 2000);
        }
      });

    // Load chat history
    this.loadChatHistory();
  }

  private joinChatRoom(): void {
    this.webSocketService.joinChat(this.chatRoom.type, this.chatRoom.id);
  }

  private leaveChat(): void {
    this.webSocketService.leaveChat(this.chatRoom.type, this.chatRoom.id);
  }

  private loadChatHistory(): void {
    this.isLoading = true;
    
    const loadMessages = this.chatRoom.type === 'group' 
      ? this.chatService.getGroupMessages(this.chatRoom.id, { per_page: 50 })
      : this.chatService.getActivityMessages(this.chatRoom.id, { per_page: 50 });

    loadMessages
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.webSocketService.setMessages(messages);
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          console.error('Error loading chat history:', error);
          this.isLoading = false;
        }
      });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.isConnected) {
      return;
    }

    const content = this.newMessage.trim();
    
    if (this.chatRoom.type === 'group') {
      this.webSocketService.sendMessage(content, this.chatRoom.id, undefined);
    } else {
      this.webSocketService.sendMessage(content, undefined, this.chatRoom.id);
    }

    this.newMessage = '';
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.sender_id === this.currentUserId;
  }

  getMessageDisplayName(message: Message): string {
    if (message.sender?.first_name && message.sender?.last_name) {
      return `${message.sender.first_name} ${message.sender.last_name}`;
    }
    if (message.sender?.first_name) {
      return message.sender.first_name;
    }
    return message.sender?.username || 'Unknown User';
  }

  getMessageInitials(message: Message): string {
    const name = this.getMessageDisplayName(message);
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  formatFullMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}