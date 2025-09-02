import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, Observable } from 'rxjs';
import { ChatService } from '../../../core/services/chat.service';
import { ChatMessage, ChatStatus } from '../../../core/models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() chatType: 'group' | 'activity' = 'group';
  @Input() chatId: number = 0;
  @Input() chatName: string = '';
  @Input() currentUserId: number = 0;
  
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  messages: ChatMessage[] = [];
  isLoading = false;
  errorMessage = '';
  newMessage = '';
  chatStatus: ChatStatus | null = null;
  isConnected = false;
  
  // Pagination
  currentPage = 1;
  hasMoreMessages = false;
  isLoadingMore = false;
  
  // Auto-scroll
  shouldAutoScroll = true;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    if (!this.chatId || !this.currentUserId) {
      this.errorMessage = 'Invalid chat configuration';
      return;
    }

    // Set current user in chat service
    this.chatService.setCurrentUser({ id: this.currentUserId });
    
    // Subscribe to connection status
    this.chatService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isConnected = status;
        if (status) {
          this.joinChatRoom();
        }
      });

    // Subscribe to messages
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
      });

    // Subscribe to new messages
    this.chatService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        // Message is already added to history by the service
        this.scrollToBottom();
      });

    // Load initial chat history
    this.loadChatHistory();
    
    // Get chat status
    this.loadChatStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.leaveChatRoom();
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
    }
  }

  private joinChatRoom(): void {
    this.chatService.joinChat(this.chatType, this.chatId);
  }

  private leaveChatRoom(): void {
    this.chatService.leaveChat(this.chatType, this.chatId);
  }

  private loadChatHistory(page: number = 1): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.chatService.getChatHistory(this.chatType, this.chatId, page)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (page === 1) {
            // First page - replace all messages
            this.chatService.setMessages(response.messages);
          } else {
            // Subsequent pages - prepend messages
            const currentMessages = this.chatService.messages$.value;
            const newMessages = [...response.messages, ...currentMessages];
            this.chatService.setMessages(newMessages);
          }
          
          this.currentPage = page;
          this.hasMoreMessages = response.pagination.has_next;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading chat history:', error);
          this.errorMessage = 'Error loading chat history';
          this.isLoading = false;
        }
      });
  }

  private loadChatStatus(): void {
    this.chatService.getChatStatus(this.chatType, this.chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.chatStatus = status;
        },
        error: (error) => {
          console.error('Error loading chat status:', error);
        }
      });
  }

  loadMoreMessages(): void {
    if (this.isLoadingMore || !this.hasMoreMessages) return;
    
    this.isLoadingMore = true;
    this.shouldAutoScroll = false; // Don't auto-scroll when loading more
    
    this.loadChatHistory(this.currentPage + 1);
    
    // Re-enable auto-scroll after a short delay
    setTimeout(() => {
      this.shouldAutoScroll = true;
      this.isLoadingMore = false;
    }, 1000);
  }

  sendMessage(): void {
    const message = this.newMessage.trim();
    if (!message) return;

    // Clear input immediately for better UX
    this.newMessage = '';
    
    // Send message via WebSocket (or REST API as fallback)
    this.chatService.sendMessage(this.chatType, this.chatId, message);
    
    // Focus back to input for accessibility
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }

  onMessageInputKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer && this.shouldAutoScroll) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  onScroll(): void {
    const element = this.messagesContainer.nativeElement;
    const isNearTop = element.scrollTop < 100;
    
    if (isNearTop && this.hasMoreMessages && !this.isLoadingMore) {
      this.loadMoreMessages();
    }
  }

  // Utility methods
  isCurrentUserMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUserId;
  }

  formatTimestamp(timestamp: string): string {
    return this.chatService.formatTimestamp(timestamp);
  }

  getMessageClass(message: ChatMessage): string {
    if (this.isCurrentUserMessage(message)) {
      return 'message-own';
    }
    return 'message-other';
  }

  getSenderInitials(message: ChatMessage): string {
    const name = message.sender_name || message.sender_username;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getConnectionStatusText(): string {
    if (this.isConnected) {
      return 'Conectado';
    }
    return 'Desconectado';
  }

  getConnectionStatusClass(): string {
    return this.isConnected ? 'status-connected' : 'status-disconnected';
  }

  trackByMessageId(index: number, message: ChatMessage): number {
    return message.id;
  }
}