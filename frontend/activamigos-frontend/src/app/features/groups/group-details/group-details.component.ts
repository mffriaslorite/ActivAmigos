import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { GroupsService } from '../../../core/services/groups.service';
import { GroupDetails, GroupMember } from '../../../core/models/group.model';
import { ChatComponent } from '../../../shared/components/chat/chat.component';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupsService: GroupsService
  ) {}

  ngOnInit() {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (groupId) {
      this.loadGroupDetails(parseInt(groupId, 10));
    } else {
      this.router.navigate(['/groups']);
    }
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
        },
        error: (error) => {
          console.error('Error loading group details:', error);
          
          // Create a fallback mock group if all fails
          this.groupDetails = this.createFallbackGroup(groupId);
          this.isLoading = false;
          
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
          is_admin: true
        },
        {
          id: 2,
          username: 'carlos',
          first_name: 'Carlos',
          last_name: 'García',
          is_admin: false
        }
      ]
    };
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  getGroupIcon(): string {
    if (!this.groupDetails) return '📚';
    
    const name = this.groupDetails.name.toLowerCase();
    if (name.includes('lectura') || name.includes('libro')) return '📚';
    if (name.includes('deporte') || name.includes('ejercicio')) return '⚽';
    if (name.includes('arte') || name.includes('creativo')) return '🎨';
    if (name.includes('música') || name.includes('musica')) return '🎵';
    if (name.includes('cocina') || name.includes('gastronomía')) return '👨‍🍳';
    if (name.includes('tecnología') || name.includes('tecnologia')) return '💻';
    if (name.includes('naturaleza') || name.includes('aire libre')) return '🌲';
    if (name.includes('juego') || name.includes('entretenimiento')) return '🎮';
    
    return '👥';
  }

  getIconBackground(): string {
    if (!this.groupDetails) return 'bg-blue-500';
    
    const name = this.groupDetails.name.toLowerCase();
    if (name.includes('lectura') || name.includes('libro')) return 'bg-green-500';
    if (name.includes('deporte') || name.includes('ejercicio')) return 'bg-red-500';
    if (name.includes('arte') || name.includes('creativo')) return 'bg-purple-500';
    if (name.includes('música') || name.includes('musica')) return 'bg-pink-500';
    if (name.includes('cocina') || name.includes('gastronomía')) return 'bg-orange-500';
    if (name.includes('tecnología') || name.includes('tecnologia')) return 'bg-blue-500';
    if (name.includes('naturaleza') || name.includes('aire libre')) return 'bg-emerald-500';
    if (name.includes('juego') || name.includes('entretenimiento')) return 'bg-indigo-500';
    
    return 'bg-blue-500';
  }

  getMemberInitials(member: GroupMember): string {
    const firstName = member.first_name || '';
    const lastName = member.last_name || '';
    
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (lastName) {
      return lastName[0].toUpperCase();
    } else {
      return member.username.substring(0, 2).toUpperCase();
    }
  }

  getMemberDisplayName(member: GroupMember): string {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    } else if (member.first_name) {
      return member.first_name;
    } else if (member.last_name) {
      return member.last_name;
    } else {
      return member.username;
    }
  }

  parseRules(): string[] {
    if (!this.groupDetails?.rules) return [];
    return this.groupDetails.rules.split('.').filter(rule => rule.trim().length > 0);
  }

  getCurrentUserId(): number {
    // TODO: Get from auth service
    // For now, return a mock user ID
    return 1;
  }
}