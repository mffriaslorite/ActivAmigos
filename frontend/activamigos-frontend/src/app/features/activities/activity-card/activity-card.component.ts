import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Activity } from '../../../core/models/activity.model';
import { ActivitiesService } from '../../../core/services/activities.service';

@Component({
  selector: 'app-activity-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-card.component.html',
  styleUrls: ['./activity-card.component.scss']
})
export class ActivityCardComponent {
  @Input() activity!: Activity;
  @Input() isLoading = false;
  
  // Emitimos eventos para que el padre gestione la lógica
  @Output() joinActivity = new EventEmitter<number>();
  @Output() leaveActivity = new EventEmitter<number>();

  constructor(
    private router: Router,
    private activitiesService: ActivitiesService
  ) {}

  onCardClick() {
    this.router.navigate(['/activities', this.activity.id]);
  }

  // Acciones de botones (con stopPropagation para no abrir el detalle)
  onJoin(event: Event) {
    event.stopPropagation();
    if (!this.isLoading) this.joinActivity.emit(this.activity.id);
  }

  onLeave(event: Event) {
    event.stopPropagation();
    // Podríamos añadir un confirm() simple aquí si quisiéramos seguridad extra
    if (!this.isLoading) this.leaveActivity.emit(this.activity.id);
  }

  // --- Helpers Visuales ---

  getActivityTypes(): string[] {
    if (this.activity.activity_types?.length) {
      return this.activity.activity_types;
    }

    if (this.activity.activity_type) {
      return this.activity.activity_type.split(',').map(type => type.trim()).filter(Boolean);
    }

    return [];
  }

  getActivityIcon(): string {
    const primaryType = this.getActivityTypes()[0];
    if (primaryType === 'sport') return '⚽';
    if (primaryType === 'social') return '👥';
    if (primaryType === 'culture') return '🎭';
    if (primaryType === 'academic') return '📚';
    if (primaryType === 'other') return '🌟';

    const t = this.activity.title.toLowerCase();
    if (t.includes('fútbol') || t.includes('deporte')) return '⚽';
    if (t.includes('cocina')) return '🍳';
    if (t.includes('arte') || t.includes('pintar')) return '🎨';
    if (t.includes('música')) return '🎵';
    if (t.includes('cine')) return '🎬';
    return '🌟';
  }

  getIconBackground(): string {
    const primaryType = this.getActivityTypes()[0];
    if (primaryType === 'sport') return 'bg-green-100 text-green-600';
    if (primaryType === 'social') return 'bg-sky-100 text-sky-600';
    if (primaryType === 'culture') return 'bg-violet-100 text-violet-600';
    if (primaryType === 'academic') return 'bg-amber-100 text-amber-700';
    if (primaryType === 'other') return 'bg-blue-100 text-blue-600';

    const t = this.activity.title.toLowerCase();
    if (t.includes('deporte')) return 'bg-green-100 text-green-600';
    if (t.includes('cocina')) return 'bg-orange-100 text-orange-600';
    if (t.includes('arte')) return 'bg-pink-100 text-pink-600';
    if (t.includes('música')) return 'bg-yellow-100 text-yellow-600';
    return 'bg-blue-100 text-blue-600';
  }

  getActivityTypeLabel(type: string): string {
    switch (type) {
      case 'sport': return 'Deporte';
      case 'social': return 'Social';
      case 'culture': return 'Cultura';
      case 'academic': return 'Estudios';
      case 'other': return 'Otro';
      default: return type;
    }
  }

  getActivityImageSrc(): string | null {
    if (!this.activity?.image_url) return null;
    return this.activitiesService.getActivityImageSrc(this.activity.id, this.activity.image_url);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return date.toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  // Lógica de estado idéntica al Dashboard
  getStatusInfo() {
    if (!this.activity.is_participant) return null;

    // Usamos el campo attendance_status que añadimos al backend
    // Si no viene, usamos attendance_confirmed como fallback
    const status = this.activity.attendance_status || (this.activity.attendance_confirmed ? 'confirmed' : 'pending');

    switch (status) {
      case 'confirmed': return { text: 'Vas a ir', icon: '✅', class: 'bg-green-100 text-green-700 border-green-200' };
      case 'declined': return { text: 'No vas', icon: '❌', class: 'bg-gray-100 text-gray-600 border-gray-200' };
      case 'attended': return { text: 'Asististe', icon: '🏆', class: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'absent': return { text: 'Faltaste', icon: '⚠️', class: 'bg-red-100 text-red-700 border-red-200' };
      default: return { text: 'Pendiente', icon: '⏳', class: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse' };
    }
  }
}
