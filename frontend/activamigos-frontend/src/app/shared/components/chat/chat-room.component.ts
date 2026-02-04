import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ChatService } from '../../../core/services/chat.service';
import { ActivitiesService } from '../../../core/services/activities.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { UserService } from '../../../core/services/user.service';
import { GroupsService } from '../../../core/services/groups.service';
import { SemaphoreBadgeComponent } from '../semaphore-badge/semaphore-badge.component';
import { ModerationModalComponent, UserToWarn } from '../moderation-modal/moderation-modal.component';

export interface ChatMessage {
  id: number;
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image?: string;
    avatarError?: boolean;
  };
  is_system?: boolean;
}

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SemaphoreBadgeComponent, ModerationModalComponent],
  templateUrl: `./chat-room.component.html`,
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId!: number;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messageForm: FormGroup;
  messages: ChatMessage[] = [];
  
  // Estados
  isLoading = true;
  isSending = false;
  isBanned = false;
  isConnected = true; // Asumimos conectado al inicio
  needsScrollToBottom = false;

  currentUserId: number | null = null;
  
  // Semáforo personal en este chat
  userSemaphoreColor: string | null = null;
  userWarningCount: number = 0;
  
  // Moderación
  canModerate = false;
  selectedUserToWarn: UserToWarn | null = null;
  showModerationModal = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService,
    private activitiesService: ActivitiesService,
    private groupsService: GroupsService,
    private moderationService: ModerationService,
    private userService: UserService
  ) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id || null;
      
      // Permisos básicos globales
      this.canModerate = user?.role === 'ORGANIZER' || user?.role === 'SUPERADMIN';
      
      if (user && this.contextId) {
        this.loadUserModerationStatus();
        this.initializeChat();

        // Si es actividad, verificar si es el organizador específico
        if (this.contextType === 'ACTIVITY') {
          this.activitiesService.getUserRoleInActivity(this.contextId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.role === 'organizer') this.canModerate = true;
              },
              error: (e) => console.warn('Role check failed', e)
            });
        }

        // Si es grupo, verificar si es el administrador/creador específico
        if (this.contextType === 'GROUP') {
          this.groupsService.getUserRoleInGroup(this.contextId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: { role: string | null }) => {
                if (response.role === 'admin') this.canModerate = true;
              },
              error: (e: any) => console.warn('Group role check failed', e)
            });
        }
      }
    });
  }

  ngAfterViewChecked() {
    if (this.needsScrollToBottom) {
      this.scrollToBottom();
      this.needsScrollToBottom = false;
    }
  }

  private initializeChat() {
    this.connectToRoom();
    this.loadMessages();

    // Suscribirse a mensajes en tiempo real
    this.chatService.messages$.pipe(takeUntil(this.destroy$)).subscribe(newMessages => {
      // Si está baneado, no procesar mensajes nuevos
      if (this.isBanned) return;

      newMessages.forEach(message => {
        if (message.context_type === this.contextType && message.context_id === this.contextId) {
          if (!this.messages.some(existing => existing.id === message.id)) {
            this.messages.push(message);
            this.needsScrollToBottom = true; // Marcar para scroll
          }
        }
      });
    });

    // Monitorizar conexión para mostrar aviso visual
    this.chatService.connectionStatus$.pipe(takeUntil(this.destroy$)).subscribe(connected => {
      this.isConnected = connected;
      if (connected && this.currentUserId) {
        // Reconexión silenciosa
        setTimeout(() => this.connectToRoom(), 500);
      }
    });
  }

  private connectToRoom() {
    this.chatService.joinRoom(this.contextType, this.contextId);
  }

  private loadMessages() {
    // Si ya sabemos que está baneado, no cargar historial
    if (this.isBanned) return;

    this.isLoading = true;
    this.chatService.getMessageHistory(this.contextType, this.contextId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (messages) => {
          if (!this.isBanned) {
             this.messages = messages;
             this.needsScrollToBottom = true;
          }
        },
        error: (error) => console.error('Error history:', error)
      });
  }

  private loadUserModerationStatus() {
    if (!this.currentUserId) return;
    
    // Usamos ModerationService en lugar de ChatService
    this.moderationService.getMyStatus(this.contextType, this.contextId, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.userSemaphoreColor = status.semaphore_color;
          this.userWarningCount = status.warning_count;
          this.isBanned = status.status === 'BANNED';
          
          if (this.isBanned) {
            this.messageForm.disable(); // Desactivar input si está baneado
            this.messages = []; // Borrar mensajes si había cargado algo
          }
        },
        error: (err) => console.warn('No se pudo cargar estado moderación', err)
      });
  }

  sendMessage() {
    const content = this.messageForm.get('content')?.value?.trim();
    if (!content || this.isBanned || this.isSending) return;

    this.isSending = true;
    
    this.chatService.sendMessage(this.contextType, this.contextId, content)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSending = false)
      )
      .subscribe({
        next: () => {
          this.messageForm.reset();
          this.needsScrollToBottom = true;
        },
        error: () => {
          // Feedback visual sutil en el input (podría ser un borde rojo temporal)
          console.error('Failed to send'); 
        }
      });
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      try {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      } catch(err) { }
    }
  }

  // --- Visual Helpers ---

  getSenderName(sender: any): string {
    return sender.first_name || sender.username;
  }

  getAvatarInitial(sender: any): string {
    const name = this.getSenderName(sender);
    return name.charAt(0).toUpperCase();
  }

  getUserAvatarUrl(userId: number): string {
    return this.userService.getProfileImageUrl(userId);
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    
    // Si es hoy, solo hora
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si no, fecha corta
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUserId;
  }

  // --- Moderation ---

  onMessageClick(message: ChatMessage) {
    // Solo permitir moderar si tienes permisos Y no es tu mensaje Y no es del sistema
    if (this.canModerate && !this.isMyMessage(message) && !message.is_system) {
      this.selectedUserToWarn = {
        id: message.sender.id,
        username: message.sender.username,
        first_name: message.sender.first_name,
        last_name: message.sender.last_name,
        warning_count: 0 // Se cargará en el modal
      };
      this.showModerationModal = true;
    }
  }

  onWarningIssued() {
    this.showModerationModal = false;
    this.selectedUserToWarn = null;
    // Recargar estado por si acaso nos auto-afecta (raro pero posible)
    this.loadUserModerationStatus();
  }

  closeModerationModal() {
    this.showModerationModal = false;
    this.selectedUserToWarn = null;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.leaveRoom(this.contextType, this.contextId);
  }
}