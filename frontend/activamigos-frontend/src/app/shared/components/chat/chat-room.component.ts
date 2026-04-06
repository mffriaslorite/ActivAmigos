import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ChatMessage, ChatService } from '../../../core/services/chat.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { UserService } from '../../../core/services/user.service';
import { ModerationModalComponent, UserToWarn } from '../moderation-modal/moderation-modal.component';
import { SemaphoreBadgeComponent } from '../semaphore-badge/semaphore-badge.component';

interface AudioPlayerState {
  url: string;
  waveform: number[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string;
}

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SemaphoreBadgeComponent, ModerationModalComponent],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss']
})
export class ChatRoomComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId!: number;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  messageForm: FormGroup;
  messages: ChatMessage[] = [];

  isLoading = true;
  isSending = false;
  isBanned = false;
  isConnected = true;
  needsScrollToBottom = false;
  isRecordingAudio = false;
  audioCaptureSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  mediaRecorderSupported = typeof MediaRecorder !== 'undefined';
  recordingWaveform: number[] = Array.from({ length: 34 }, () => 0.14);
  recordingDurationSeconds = 0;
  isPreparingRecordedAudio = false;

  currentUserId: number | null = null;
  currentUserRole: string | null = null;
  userSemaphoreColor: string | null = null;
  userWarningCount = 0;
  canModerate = false;
  selectedUserToWarn: UserToWarn | null = null;
  showModerationModal = false;
  sendErrorMessage = '';
  imagePreviewUrl: string | null = null;
  imagePreviewZoom = 1;

  selectedImageFile: File | null = null;
  selectedImagePreviewUrl: string | null = null;
  recordedAudioFile: File | null = null;
  recordedAudioPreviewUrl: string | null = null;

  private destroy$ = new Subject<void>();
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private discardNextRecording = false;
  private recordingStream: MediaStream | null = null;
  private recordingAudioContext: AudioContext | null = null;
  private recordingAnalyser: AnalyserNode | null = null;
  private recordingLevelBuffer: Uint8Array | null = null;
  private recordingMeterInterval: ReturnType<typeof setInterval> | null = null;
  private recordingStartedAt = 0;
  private audioPlayers = new Map<string, HTMLAudioElement>();
  private audioStates: Record<string, AudioPlayerState> = {};

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
      content: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserId = user?.id || null;
      this.currentUserRole = user?.role || null;
      this.initComponent();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['contextId'] || changes['contextType']) && !changes['contextId']?.firstChange) {
      this.resetComposer();
      this.stopAllAudioPlayers();
      this.initComponent();
    }
  }

  ngAfterViewChecked() {
    if (this.needsScrollToBottom) {
      this.scrollToBottom();
      this.needsScrollToBottom = false;
    }
  }

  private initComponent() {
    if (!this.currentUserId || !this.contextId) {
      return;
    }

    this.checkModerationPermissions();
    this.loadUserModerationStatus();
    this.initializeChat();
  }

  private checkModerationPermissions() {
    if (!this.currentUserId) {
      return;
    }

    this.canModerate = this.currentUserRole === 'ORGANIZER' || this.currentUserRole === 'SUPERADMIN';

    if (this.contextType === 'ACTIVITY') {
      this.activitiesService.getUserRoleInActivity(this.contextId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.role === 'organizer') {
              this.canModerate = true;
            }
          },
          error: () => console.warn('Error checking activity roles')
        });
    } else if (this.contextType === 'GROUP') {
      this.groupsService.getUserRoleInGroup(this.contextId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.role === 'admin') {
              this.canModerate = true;
            }
          },
          error: () => console.warn('Error checking group roles')
        });
    }
  }

  private initializeChat() {
    this.connectToRoom();
    this.loadMessages();

    this.chatService.messages$.pipe(takeUntil(this.destroy$)).subscribe(newMessages => {
      if (this.isBanned) {
        return;
      }

      newMessages.forEach(message => {
        if (message.context_type === this.contextType && message.context_id === this.contextId) {
          if (!this.messages.some(existing => existing.id === message.id)) {
            this.messages.push(message);
            if (message.message_type === 'AUDIO') {
              this.prepareAudioMessage(message);
            }
            this.needsScrollToBottom = true;
          }
        }
      });
    });

    this.chatService.connectionStatus$.pipe(takeUntil(this.destroy$)).subscribe(connected => {
      this.isConnected = connected;
      if (connected && this.currentUserId) {
        setTimeout(() => this.connectToRoom(), 500);
      }
    });
  }

  private connectToRoom() {
    this.chatService.joinRoom(this.contextType, this.contextId);
  }

  private loadMessages() {
    if (this.isBanned) {
      return;
    }

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
            this.messages.filter(message => message.message_type === 'AUDIO').forEach(message => this.prepareAudioMessage(message));
            this.needsScrollToBottom = true;
          }
        },
        error: (error) => console.error('Error history:', error)
      });
  }

  private loadUserModerationStatus() {
    if (!this.currentUserId || !this.contextId) {
      return;
    }

    this.moderationService.getMyStatus(this.contextType, this.contextId, this.currentUserId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.userSemaphoreColor = status.semaphore_color;
          this.userWarningCount = status.warning_count;
          this.isBanned = status.status === 'BANNED';

          if (this.isBanned) {
            this.messageForm.disable();
            this.messages = [];
            this.resetComposer();
          } else {
            this.messageForm.enable();
          }
        },
        error: (err) => console.warn('Error loading moderation status', err)
      });
  }

  sendMessage() {
    if (this.isBanned || this.isSending || !this.canSubmitMessage()) {
      return;
    }

    const content = this.getTrimmedContent();
    const attachment = this.selectedImageFile || this.recordedAudioFile;

    this.isSending = true;
    this.sendErrorMessage = '';

    const request$ = attachment
      ? this.chatService.sendAttachmentMessage(this.contextType, this.contextId, attachment, content)
      : this.chatService.sendMessage(this.contextType, this.contextId, content);

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSending = false)
      )
      .subscribe({
        next: () => {
          this.messageForm.reset();
          this.clearSelectedImage();
          this.clearRecordedAudio();
          this.needsScrollToBottom = true;
        },
        error: (error) => {
          this.sendErrorMessage = error.message || 'No se pudo enviar el mensaje.';
        }
      });
  }

  canSubmitMessage(): boolean {
    return !this.isPreparingRecordedAudio && !this.isRecordingAudio && !!this.isConnected && (!!this.getTrimmedContent() || !!this.selectedImageFile || !!this.recordedAudioFile);
  }

  isComposerBusy(): boolean {
    return this.isSending || this.isPreparingRecordedAudio;
  }

  isTextComposerDisabled(): boolean {
    return this.isSending || this.isPreparingRecordedAudio || this.isRecordingAudio;
  }

  isImageActionDisabled(): boolean {
    return this.isSending || this.isPreparingRecordedAudio || this.isRecordingAudio;
  }

  openImagePicker() {
    this.imageInput?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.sendErrorMessage = 'Selecciona una imagen valida.';
      input.value = '';
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      this.sendErrorMessage = 'La imagen es demasiado grande. El maximo es 16 MB.';
      input.value = '';
      return;
    }

    this.clearRecordedAudio();
    this.clearSelectedImage();

    this.selectedImageFile = file;
    this.selectedImagePreviewUrl = URL.createObjectURL(file);
    this.sendErrorMessage = '';
    input.value = '';
  }

  async toggleAudioRecording() {
    if (this.isRecordingAudio) {
      this.stopAudioRecording();
      return;
    }

    if (!this.audioCaptureSupported || !this.mediaRecorderSupported) {
      this.sendErrorMessage = this.getAudioUnavailableMessage();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.clearSelectedImage();
      this.clearRecordedAudio();
      this.resetRecordingVisualizer();
      this.isPreparingRecordedAudio = false;

      const mimeType = this.getPreferredAudioMimeType();
      this.recordingStream = stream;
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.audioChunks = [];
      this.discardNextRecording = false;
      this.recordingStartedAt = Date.now();
      this.setupRecordingAnalyzer(stream);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const mimeTypeFromRecorder = this.mediaRecorder?.mimeType || mimeType || 'audio/webm';
        const recordedWaveform = [...this.recordingWaveform];
        this.stopRecordingAnalyzer();

        if (this.discardNextRecording) {
          this.audioChunks = [];
          this.discardNextRecording = false;
          return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: mimeTypeFromRecorder });
        this.audioChunks = [];

        if (audioBlob.size === 0) {
          this.sendErrorMessage = 'No se ha grabado audio.';
          return;
        }

        if (audioBlob.size > 16 * 1024 * 1024) {
          this.sendErrorMessage = 'El audio es demasiado grande. El maximo es 16 MB.';
          return;
        }

        const filenameExtension = this.getAudioFileExtension(audioBlob.type);
        this.recordedAudioFile = new File([audioBlob], `audio-${Date.now()}${filenameExtension}`, {
          type: audioBlob.type
        });
        this.recordedAudioPreviewUrl = URL.createObjectURL(audioBlob);
        this.sendErrorMessage = '';
        this.isPreparingRecordedAudio = false;

        const previewState = this.ensureAudioState('preview', this.recordedAudioPreviewUrl);
        previewState.waveform = recordedWaveform;
        previewState.isLoading = false;
        previewState.error = '';
        previewState.currentTime = 0;
        previewState.duration = Math.max(this.recordingDurationSeconds, previewState.duration);
      };

      this.mediaRecorder.start(180);
      this.isRecordingAudio = true;
      this.sendErrorMessage = '';
    } catch (error) {
      console.error('Audio capture error:', error);
      this.sendErrorMessage = this.getAudioAccessErrorMessage(error);
      this.isRecordingAudio = false;
      this.stopRecordingAnalyzer();
    }
  }

  stopAudioRecording() {
    if (this.mediaRecorder && this.isRecordingAudio) {
      this.isPreparingRecordedAudio = true;
      this.mediaRecorder.stop();
      this.isRecordingAudio = false;
    }
  }

  clearSelectedImage() {
    this.selectedImageFile = null;
    if (this.selectedImagePreviewUrl) {
      URL.revokeObjectURL(this.selectedImagePreviewUrl);
      this.selectedImagePreviewUrl = null;
    }
  }

  openImagePreview(imageUrl: string) {
    this.imagePreviewUrl = imageUrl;
    this.imagePreviewZoom = 1;
  }

  closeImagePreview() {
    this.imagePreviewUrl = null;
    this.imagePreviewZoom = 1;
  }

  toggleImagePreviewZoom() {
    this.imagePreviewZoom = this.imagePreviewZoom === 1 ? 2 : 1;
  }

  clearRecordedAudio() {
    this.recordedAudioFile = null;
    if (this.recordedAudioPreviewUrl) {
      this.pauseAudio('preview');
      this.destroyAudioPlayer('preview');
      URL.revokeObjectURL(this.recordedAudioPreviewUrl);
      this.recordedAudioPreviewUrl = null;
    }
    delete this.audioStates['preview'];
    this.isPreparingRecordedAudio = false;
  }

  private resetComposer() {
    this.sendErrorMessage = '';
    this.messageForm.reset();
    this.clearSelectedImage();
    this.clearRecordedAudio();
    if (this.isRecordingAudio) {
      this.discardNextRecording = true;
      this.stopAudioRecording();
    }
  }

  private getTrimmedContent(): string {
    return this.messageForm.get('content')?.value?.trim() || '';
  }

  private getPreferredAudioMimeType(): string | undefined {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find(candidate => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate));
  }

  private getAudioUnavailableMessage(): string {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'El navegador no puede pedir acceso al microfono porque la pagina no esta en un contexto seguro. Pruebalo en https o en localhost.';
    }

    if (!this.audioCaptureSupported) {
      return 'Este navegador no expone acceso al microfono desde la aplicacion.';
    }

    if (!this.mediaRecorderSupported) {
      return 'Este navegador no permite grabar audio desde la web.';
    }

    return 'No se puede iniciar la grabacion de audio en este navegador.';
  }

  private getAudioAccessErrorMessage(error: unknown): string {
    const domError = error as DOMException | undefined;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'El navegador no permite usar el microfono en una pagina no segura. Pruebalo en https o en localhost.';
    }

    switch (domError?.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'El navegador ha bloqueado el microfono. Revisa el permiso y vuelve a intentarlo.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se ha encontrado ningun microfono disponible.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'El microfono esta ocupado o no se puede usar ahora mismo.';
      case 'SecurityError':
        return 'El navegador ha bloqueado el acceso al microfono por seguridad.';
      default:
        return 'No se pudo acceder al microfono.';
    }
  }

  private getAudioFileExtension(contentType: string): string {
    if (contentType.includes('ogg')) {
      return '.ogg';
    }
    if (contentType.includes('mp4')) {
      return '.m4a';
    }
    return '.webm';
  }

  private setupRecordingAnalyzer(stream: MediaStream) {
    if (typeof AudioContext === 'undefined') {
      return;
    }

    this.recordingAudioContext = new AudioContext();
    const source = this.recordingAudioContext.createMediaStreamSource(stream);
    this.recordingAnalyser = this.recordingAudioContext.createAnalyser();
    this.recordingAnalyser.fftSize = 256;
    this.recordingAnalyser.smoothingTimeConstant = 0.82;
    source.connect(this.recordingAnalyser);
    this.recordingLevelBuffer = new Uint8Array(this.recordingAnalyser.frequencyBinCount);

    this.recordingMeterInterval = setInterval(() => {
      if (!this.recordingAnalyser || !this.recordingLevelBuffer) {
        return;
      }

      this.recordingAnalyser.getByteFrequencyData(this.recordingLevelBuffer);
      let squaredSum = 0;
      for (const value of this.recordingLevelBuffer) {
        const normalizedValue = value / 255;
        squaredSum += normalizedValue * normalizedValue;
      }

      const rms = Math.sqrt(squaredSum / this.recordingLevelBuffer.length);
      const barValue = Math.max(0.08, Math.min(1, rms * 3.2));
      this.recordingWaveform = [...this.recordingWaveform.slice(1), barValue];
      this.recordingDurationSeconds = Math.max(1, (Date.now() - this.recordingStartedAt) / 1000);
    }, 90);
  }

  private stopRecordingAnalyzer() {
    if (this.recordingMeterInterval) {
      clearInterval(this.recordingMeterInterval);
      this.recordingMeterInterval = null;
    }

    this.recordingAnalyser?.disconnect();
    this.recordingAnalyser = null;
    this.recordingLevelBuffer = null;

    this.recordingStream?.getTracks().forEach(track => track.stop());
    this.recordingStream = null;

    if (this.recordingAudioContext) {
      void this.recordingAudioContext.close();
      this.recordingAudioContext = null;
    }
  }

  private resetRecordingVisualizer() {
    this.recordingWaveform = Array.from({ length: 34 }, (_, index) => 0.12 + ((index % 4) * 0.015));
    this.recordingDurationSeconds = 0;
  }

  private prepareAudioMessage(message: ChatMessage) {
    const url = this.getAttachmentUrl(message);
    if (!url) {
      return;
    }

    const key = this.getAudioMessageKey(message);
    const state = this.ensureAudioState(key, url);
    state.isLoading = false;
  }

  toggleAudioPlayback(message: ChatMessage) {
    const url = this.getAttachmentUrl(message);
    if (!url) {
      return;
    }

    const key = this.getAudioMessageKey(message);
    this.toggleAudioByKey(key, url);
  }

  togglePreviewAudioPlayback() {
    if (!this.recordedAudioPreviewUrl) {
      return;
    }

    this.toggleAudioByKey('preview', this.recordedAudioPreviewUrl);
  }

  private toggleAudioByKey(key: string, url: string) {
    const state = this.ensureAudioState(key, url);
    if (state.isPlaying) {
      this.pauseAudio(key);
      return;
    }

    this.stopAllAudioPlayers(key);
    const player = this.getOrCreateAudioPlayer(key, url);
    void player.play().catch(() => {
      const nextState = this.ensureAudioState(key, url);
      nextState.error = 'No se pudo reproducir el audio.';
      nextState.isPlaying = false;
    });
  }

  private getOrCreateAudioPlayer(key: string, url: string): HTMLAudioElement {
    const existing = this.audioPlayers.get(key);
    if (existing) {
      return existing;
    }

    const audio = new Audio(url);
    audio.preload = 'metadata';

    audio.addEventListener('loadedmetadata', () => {
      const state = this.audioStates[key];
      if (!state) {
        return;
      }
      state.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      state.isLoading = false;
    });

    audio.addEventListener('timeupdate', () => {
      const state = this.audioStates[key];
      if (!state) {
        return;
      }
      state.currentTime = audio.currentTime;
      state.duration = Number.isFinite(audio.duration) ? audio.duration : state.duration;
    });

    audio.addEventListener('play', () => {
      const state = this.audioStates[key];
      if (state) {
        state.isPlaying = true;
      }
    });

    audio.addEventListener('pause', () => {
      const state = this.audioStates[key];
      if (state) {
        state.isPlaying = false;
      }
    });

    audio.addEventListener('ended', () => {
      const state = this.audioStates[key];
      if (state) {
        state.isPlaying = false;
        state.currentTime = state.duration;
      }
    });

    audio.addEventListener('waiting', () => {
      const state = this.audioStates[key];
      if (state) {
        state.isLoading = true;
      }
    });

    audio.addEventListener('canplay', () => {
      const state = this.audioStates[key];
      if (state) {
        state.isLoading = false;
      }
    });

    audio.addEventListener('error', () => {
      const state = this.audioStates[key];
      if (state) {
        state.error = 'No se pudo cargar el audio.';
        state.isLoading = false;
        state.isPlaying = false;
      }
    });

    this.audioPlayers.set(key, audio);
    return audio;
  }

  private destroyAudioPlayer(key: string) {
    const player = this.audioPlayers.get(key);
    if (!player) {
      return;
    }
    player.pause();
    player.src = '';
    this.audioPlayers.delete(key);
  }

  private pauseAudio(key: string) {
    const player = this.audioPlayers.get(key);
    if (!player) {
      return;
    }
    player.pause();
  }

  private stopAllAudioPlayers(exceptKey?: string) {
    this.audioPlayers.forEach((player, key) => {
      if (key !== exceptKey) {
        player.pause();
      }
    });
  }

  private ensureAudioState(key: string, url: string): AudioPlayerState {
    const current = this.audioStates[key];
    if (current) {
      current.url = url;
      return current;
    }

    this.audioStates[key] = {
      url,
      waveform: Array.from({ length: 34 }, (_, index) => 0.12 + ((index % 5) * 0.012)),
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isLoading: true,
      error: ''
    };
    return this.audioStates[key];
  }

  getAudioMessageKey(message: ChatMessage): string {
    return `message-${message.id}`;
  }

  getAudioState(key: string): AudioPlayerState | null {
    return this.audioStates[key] || null;
  }

  getAudioBars(key: string): number[] {
    return this.audioStates[key]?.waveform || [];
  }

  getAudioProgress(key: string): number {
    const state = this.audioStates[key];
    if (!state?.duration) {
      return 0;
    }
    return Math.min(100, (state.currentTime / state.duration) * 100);
  }

  getPlayedBarsCount(key: string): number {
    const state = this.audioStates[key];
    const barsCount = state?.waveform.length || 0;

    if (!barsCount || !state?.duration) {
      return 0;
    }

    return Math.round((state.currentTime / state.duration) * barsCount);
  }

  getWaveBarHeight(bar: number): number {
    return Math.max(10, Math.min(34, 6 + bar * 34));
  }

  formatAudioTime(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      try {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      } catch {
        // Ignore scroll errors on detached views.
      }
    }
  }

  getSenderName(sender: ChatMessage['sender']): string {
    return sender.first_name || sender.username;
  }

  getAvatarInitial(sender: ChatMessage['sender']): string {
    const name = this.getSenderName(sender);
    return name.charAt(0).toUpperCase();
  }

  getUserAvatarUrl(userId: number): string {
    return this.userService.getProfileImageUrl(userId);
  }

  getAttachmentUrl(message: ChatMessage): string | null {
    return this.chatService.getAttachmentUrl(message);
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  isMyMessage(message: ChatMessage): boolean {
    return message.sender_id === this.currentUserId;
  }

  onMessageClick(message: ChatMessage) {
    if (message.message_type === 'AUDIO') {
      return;
    }

    if (this.canModerate && !this.isMyMessage(message) && !message.is_system) {
      this.selectedUserToWarn = {
        id: message.sender.id,
        username: message.sender.username,
        first_name: message.sender.first_name,
        last_name: message.sender.last_name,
        warning_count: 0
      };
      this.showModerationModal = true;
    }
  }

  onWarningIssued() {
    this.showModerationModal = false;
    this.selectedUserToWarn = null;
    this.loadUserModerationStatus();
  }

  closeModerationModal() {
    this.showModerationModal = false;
    this.selectedUserToWarn = null;
  }

  ngOnDestroy() {
    if (this.isRecordingAudio) {
      this.discardNextRecording = true;
      this.stopAudioRecording();
    }

    this.stopRecordingAnalyzer();
    this.stopAllAudioPlayers();
    [...this.audioPlayers.keys()].forEach(key => this.destroyAudioPlayer(key));
    this.clearSelectedImage();
    this.clearRecordedAudio();
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.leaveRoom(this.contextType, this.contextId);
  }
}
