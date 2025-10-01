import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityDetails, ActivityParticipant } from '../../../core/models/activity.model';
import { ChatRoomComponent } from '../../../shared/components/chat/chat-room.component';
import { SemaphoreBadgeComponent } from '../../../shared/components/semaphore-badge/semaphore-badge.component';
import { ModerationModalComponent, UserToWarn } from '../../../shared/components/moderation-modal/moderation-modal.component';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';
import { AttendanceService } from '../../../core/services/attendance.service';
import { RulesService } from '../../../core/services/rules.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-activity-details',
  standalone: true,
  imports: [CommonModule, ChatRoomComponent, SemaphoreBadgeComponent, RulesSelectorComponent, ModerationModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './activity-details.component.html',
  styleUrls: ['./activity-details.component.scss']
})
export class ActivityDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activityDetails: ActivityDetails | null = null;
  isLoading = true;
  errorMessage = '';
  
  // Chat and moderation
  currentUserId: number | null = null;
  showChat = true;
  chatRoom: { type: string; id: number; name: string } | null = null;
  
  // Rules management
  showRulesSelector = false;
  activityRules: any[] = [];
  canManageRules = false;
  
  // Attendance management
  showAttendanceMarking = false;
  attendanceRecords: any[] = [];

  // Moderation
  showModerationModal = false;
  selectedUserToWarn: UserToWarn | null = null;
  // Moderation permissions
  canModerate = false;

  // Chat input
  newMessage = '';

  // Mock chat messages for preview
  chatMessages = [
    {
      id: 1,
      sender: 'Sofia',
      message: '¡Hola! ¿Están listos para la actividad?',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      isCurrentUser: false
    },
    {
      id: 2,
      sender: 'Carlos',
      message: 'Sí, ya estoy preparado. ¿A qué hora nos encontramos?',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      isCurrentUser: true
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activitiesService: ActivitiesService,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private rulesService: RulesService
  ) {}

  ngOnInit() {
    const activityId = this.route.snapshot.paramMap.get('id');
    if (activityId) {
      this.loadActivityDetails(parseInt(activityId, 10));
    } else {
      this.router.navigate(['/activities']);
    }

    // Get current user ID for chat
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id;
          this.canManageRules = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
          this.canModerate = user.role === 'ORGANIZER' || user.role === 'SUPERADMIN';
          console.log('User data loaded:', user);
          console.log('Current user ID:', this.currentUserId);
          console.log('Can manage rules:', this.canManageRules);
          console.log('Can moderate:', this.canModerate);

        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivityDetails(activityId: number) {
    this.isLoading = true;
    this.errorMessage = '';

    this.activitiesService.getActivityDetails(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.activityDetails = details;
          this.isLoading = false;
          
          // Set up chat room
          this.chatRoom = {
            type: 'ACTIVITY',
            id: activityId,
            name: details.title
          };
        },
        error: (error) => {
          console.error('Error loading activity details:', error);
          
          // Create a fallback mock activity if all fails
          this.activityDetails = this.createFallbackActivity(activityId);
          this.isLoading = false;
          
          // Set up chat room for fallback
          this.chatRoom = {
            type: 'ACTIVITY',
            id: activityId,
            name: this.activityDetails.title
          };
          
          // Show a warning but don't block the UI
          console.warn('Using fallback mock data for activity details');
        }
      });
  }

  private createFallbackActivity(activityId: number): ActivityDetails {
    return {
      id: activityId,
      title: 'Actividad de Ejemplo',
      description: 'Una actividad divertida para compartir con otros.',
      location: 'Parque Central',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      rules: 'Ser puntual. Traer agua. Disfrutar de la actividad.',
      created_by: 1,
      created_at: new Date().toISOString(),
      participant_count: 8,
      is_participant: true,
      participants: [
        {
          id: 1,
          username: 'sofia',
          first_name: 'Sofia',
          last_name: '',
          profile_image: '',
          is_organizer: true,
          joined_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          username: 'carlos',
          first_name: 'Carlos',
          last_name: '',
          profile_image: '',
          is_organizer: false,
          joined_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          username: 'ana',
          first_name: 'Ana',
          last_name: '',
          profile_image: '',
          is_organizer: false,
          joined_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }

  goBack() {
    this.router.navigate(['/activities']);
  }

  joinActivity() {
    if (!this.activityDetails) return;

    if (this.activityDetails.is_participant) {
      this.leaveActivity();
    } else {
      this.activitiesService.joinActivity(this.activityDetails.id).subscribe({
        next: (response) => {
          if (this.activityDetails) {
            this.activityDetails.is_participant = response.is_participant;
            this.activityDetails.participant_count = response.participant_count;
          }
          console.log('Joined activity:', response.message);
        },
        error: (error) => {
          console.error('Error joining activity:', error);
          this.errorMessage = 'Error al unirse a la actividad: ' + error.message;
        }
      });
    }
  }

  leaveActivity() {
    if (!this.activityDetails) return;

    this.activitiesService.leaveActivity(this.activityDetails.id).subscribe({
      next: (response) => {
        if (this.activityDetails) {
          this.activityDetails.is_participant = response.is_participant;
          this.activityDetails.participant_count = response.participant_count;
        }
        console.log('Left activity:', response.message);
      },
      error: (error) => {
        console.error('Error leaving activity:', error);
        alert('Error al salir de la actividad: ' + error.message);
      }
    });
  }

  getActivityIcon(): string {
    if (!this.activityDetails) return '🎯';
    
    const title = this.activityDetails.title.toLowerCase();
    if (title.includes('deporte') || title.includes('fútbol') || title.includes('correr')) return '⚽';
    if (title.includes('cocina') || title.includes('cocinar') || title.includes('comida')) return '🍳';
    if (title.includes('arte') || title.includes('pintar') || title.includes('dibujo')) return '🎨';
    if (title.includes('música') || title.includes('cantar') || title.includes('baile')) return '🎵';
    if (title.includes('juego') || title.includes('jugar')) return '🎮';
    if (title.includes('lectura') || title.includes('leer') || title.includes('libro')) return '📚';
    if (title.includes('cine') || title.includes('película')) return '🎬';
    if (title.includes('parque') || title.includes('naturaleza') || title.includes('jardín')) return '🌳';
    return '🎯';
  }

  getIconBackground(): string {
    if (!this.activityDetails) return 'bg-blue-100';
    
    const title = this.activityDetails.title.toLowerCase();
    if (title.includes('deporte') || title.includes('fútbol') || title.includes('correr')) return 'bg-green-100';
    if (title.includes('cocina') || title.includes('cocinar') || title.includes('comida')) return 'bg-orange-100';
    if (title.includes('arte') || title.includes('pintar') || title.includes('dibujo')) return 'bg-pink-100';
    if (title.includes('música') || title.includes('cantar') || title.includes('baile')) return 'bg-yellow-100';
    if (title.includes('juego') || title.includes('jugar')) return 'bg-red-100';
    if (title.includes('lectura') || title.includes('leer') || title.includes('libro')) return 'bg-purple-100';
    if (title.includes('cine') || title.includes('película')) return 'bg-indigo-100';
    if (title.includes('parque') || title.includes('naturaleza') || title.includes('jardín')) return 'bg-green-100';
    return 'bg-blue-100';
  }

  getParticipantDisplayName(participant: ActivityParticipant): string {
    if (participant.first_name && participant.last_name) {
      return `${participant.first_name} ${participant.last_name}`;
    }
    if (participant.first_name) {
      return participant.first_name;
    }
    return participant.username;
  }

  getParticipantInitials(participant: ActivityParticipant): string {
    const name = this.getParticipantDisplayName(participant);
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  parseRules(): string[] {
    if (!this.activityDetails?.rules) return [];

    const raw = this.activityDetails.rules;
    const matches = raw.match(/(?:^\s*|\n|\r)(?:\d+[.)]|•|-)?\s*(.+?)(?=(?:\n\d+[.)]|$))/gs);

    return matches
        ?.map(rule => {
        return rule.replace(/^\s*(\d+[.)]|•|-)\s*/, '').trim();
        })
        .filter(rule => rule.length > 0) ?? [];
  }

  formatChatTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins}m`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    return timestamp.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  formatJoinedDate(joinedAt: string): string {
    return this.formatChatTime(new Date(joinedAt));
  }

  onMessageInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.newMessage = target.value;
  }

  // Mock function for image upload - disabled for now
  onImageUpload() {
    // This will be implemented later when chat functionality is added
    console.log('Image upload clicked - not implemented yet');
  }

  // Mock function for sending message - disabled for now
  onSendMessage() {
    // This will be implemented later when chat functionality is added
    console.log('Send message clicked - not implemented yet');
  }

  toggleChat() {
    this.showChat = !this.showChat;
  }

  loadActivityRules(activityId: number) {
    this.rulesService.getActivityRules(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.activityRules = response.rules;
        },
        error: (error) => {
          console.error('Error loading activity rules:', error);
          this.activityRules = [];
        }
      });
  }

  loadAttendanceRecords(activityId: number) {
    this.attendanceService.getActivityAttendance(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.attendanceRecords = response.attendance;
        },
        error: (error) => {
          console.error('Error loading attendance records:', error);
          this.attendanceRecords = [];
        }
      });
  }

  openRulesSelector() {
    this.showRulesSelector = true;
  }

  closeRulesSelector() {
    this.showRulesSelector = false;
  }

  onRulesSaved(ruleIds: number[]) {
    if (!this.activityDetails) return;

    this.rulesService.attachActivityRules(this.activityDetails.id, ruleIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showRulesSelector = false;
          this.loadActivityRules(this.activityDetails!.id);
          alert('Reglas guardadas correctamente');
        },
        error: (error) => {
          console.error('Error saving rules:', error);
          alert('Error al guardar las reglas');
        }
      });
  }

  openAttendanceMarking() {
    this.showAttendanceMarking = true;
  }

  closeAttendanceMarking() {
    this.showAttendanceMarking = false;
  }

  openModerationModal(participant: ActivityParticipant) {
    this.selectedUserToWarn = {
      id: participant.id,
      username: participant.username,
      first_name: participant.first_name,
      last_name: participant.last_name,
      warning_count: 0 // We'd need to fetch this from the API
    };
    this.showModerationModal = true;
  }

  closeModerationModal() {
    this.showModerationModal = false;
    this.selectedUserToWarn = null;
  }

  onWarningIssued(response: any) {
    console.log('Warning issued:', response);
    // Refresh activity data or show success message
    if (this.activityDetails) {
      this.loadActivityDetails(this.activityDetails.id);
    }
    alert(response.message || 'Advertencia emitida correctamente');
  }
}