import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { GroupDetails, GroupMember } from '../../../core/models/group.model';
import { ChatComponent } from '../../../shared/components/chat/chat.component';
import { ChatRoom } from '../../../core/models/message.model';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-group-details',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './group-details.component.html',
  styleUrls: ['./group-details.component.scss']
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  groupDetails: GroupDetails | null = null;
  isLoading = true;
  errorMessage = '';
  newMessage = '';
  
  // Chat-related properties
  chatRoom: ChatRoom | null = null;
  currentUserId: number | null = null;
  showChat = true;
  

  // Mock chat messages for preview
  chatMessages = [
    {
      id: 1,
      sender: 'Sofia',
      message: 'Hola a todos, ¿qué libro leemos?',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      isCurrentUser: false
    },
    {
      id: 2,
      sender: 'Carlos',
      message: 'Hola Sofia, estamos con "El Principito"',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      isCurrentUser: true
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupsService: GroupsService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (groupId) {
      this.loadGroupDetails(parseInt(groupId, 10));
    } else {
      this.router.navigate(['/groups']);
    }

    // Get current user ID for chat
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.currentUserId = user.id;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroupDetails(groupId: number) {
    this.isLoading = true;
    this.errorMessage = '';

    this.groupsService.getGroupDetails(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.groupDetails = details;
          this.isLoading = false;
          
          // Set up chat room
          this.chatRoom = {
            type: 'group',
            id: details.id,
            name: details.name
          };
        },
        error: (error) => {
          console.error('Error loading group details:', error);
          
          // Create a fallback mock group if all fails
          this.groupDetails = this.createFallbackGroup(groupId);
          this.isLoading = false;
          
          // Set up chat room for fallback
          this.chatRoom = {
            type: 'group',
            id: groupId,
            name: this.groupDetails.name
          };
          
          // Show a warning but don't block the UI
          console.warn('Using fallback mock data for group details');
        }
      });
  }

  private createFallbackGroup(groupId: number): GroupDetails {
    return {
      id: groupId,
      name: 'Grupo de Lectura',
      description: 'Un grupo para compartir y discutir nuestros libros favoritos.',
      rules: 'Ser respetuoso. Participar activamente. Disfrutar de la lectura',
      created_by: 1,
      created_at: new Date().toISOString(),
      member_count: 15,
      is_member: true,
      members: [
        {
          id: 1,
          username: 'sofia',
          first_name: 'Sofia',
          last_name: '',
          profile_image: '',
          is_admin: true,
          joined_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          username: 'carlos',
          first_name: 'Carlos',
          last_name: '',
          profile_image: '',
          is_admin: false,
          joined_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          username: 'ana',
          first_name: 'Ana',
          last_name: '',
          profile_image: '',
          is_admin: false,
          joined_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 4,
          username: 'javier',
          first_name: 'Javier',
          last_name: '',
          profile_image: '',
          is_admin: false,
          joined_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 5,
          username: 'elena',
          first_name: 'Elena',
          last_name: '',
          profile_image: '',
          is_admin: false,
          joined_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }

  goBack() {
    this.router.navigate(['/groups']);
  }

  getGroupIcon(): string {
    if (!this.groupDetails) return '👥';
    
    const name = this.groupDetails.name.toLowerCase();
    if (name.includes('lectura') || name.includes('libro')) return '📚';
    if (name.includes('deporte') || name.includes('fútbol') || name.includes('ejercicio')) return '⚽';
    if (name.includes('cocina') || name.includes('receta')) return '👨‍🍳';
    if (name.includes('arte') || name.includes('pintura')) return '🎨';
    if (name.includes('música') || name.includes('canto')) return '🎵';
    if (name.includes('juego') || name.includes('mesa')) return '🎲';
    if (name.includes('naturaleza') || name.includes('jardín')) return '🌱';
    return '👥';
  }

  getIconBackground(): string {
    if (!this.groupDetails) return 'bg-blue-100';
    
    const name = this.groupDetails.name.toLowerCase();
    if (name.includes('lectura') || name.includes('libro')) return 'bg-purple-100';
    if (name.includes('deporte') || name.includes('fútbol') || name.includes('ejercicio')) return 'bg-green-100';
    if (name.includes('cocina') || name.includes('receta')) return 'bg-orange-100';
    if (name.includes('arte') || name.includes('pintura')) return 'bg-pink-100';
    if (name.includes('música') || name.includes('canto')) return 'bg-yellow-100';
    if (name.includes('juego') || name.includes('mesa')) return 'bg-red-100';
    if (name.includes('naturaleza') || name.includes('jardín')) return 'bg-green-100';
    return 'bg-blue-100';
  }

  getMemberDisplayName(member: GroupMember): string {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    if (member.first_name) {
      return member.first_name;
    }
    return member.username;
  }

  getMemberInitials(member: GroupMember): string {
    const name = this.getMemberDisplayName(member);
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  parseRules(): string[] {
    if (!this.groupDetails?.rules) return [];

    const raw = this.groupDetails.rules;

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
}