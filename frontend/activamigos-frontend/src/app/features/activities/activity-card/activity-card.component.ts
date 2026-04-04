import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Activity } from '../../../core/models/activity.model';

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

  constructor(private router: Router) {}

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

  getActivityIcon(): string {
    if (this.activity.activity_type === 'sport') return '⚽';
    if (this.activity.activity_type === 'social') return '👥';
    if (this.activity.activity_type === 'culture') return '🎭';
    if (this.activity.activity_type === 'academic') return '📚';
    if (this.activity.activity_type === 'other') return '🌟';

    const t = this.activity.title.toLowerCase();
    if (t.includes('fútbol') || t.includes('deporte')) return '⚽';
    if (t.includes('cocina')) return '🍳';
    if (t.includes('arte') || t.includes('pintar')) return '🎨';
    if (t.includes('música')) return '🎵';
    if (t.includes('cine')) return '🎬';
    return '🌟';
  }

  getIconBackground(): string {
    if (this.activity.activity_type === 'sport') return 'bg-green-100 text-green-600';
    if (this.activity.activity_type === 'social') return 'bg-sky-100 text-sky-600';
    if (this.activity.activity_type === 'culture') return 'bg-violet-100 text-violet-600';
    if (this.activity.activity_type === 'academic') return 'bg-amber-100 text-amber-700';
    if (this.activity.activity_type === 'other') return 'bg-blue-100 text-blue-600';

    const t = this.activity.title.toLowerCase();
    if (t.includes('deporte')) return 'bg-green-100 text-green-600';
    if (t.includes('cocina')) return 'bg-orange-100 text-orange-600';
    if (t.includes('arte')) return 'bg-pink-100 text-pink-600';
    if (t.includes('música')) return 'bg-yellow-100 text-yellow-600';
    return 'bg-blue-100 text-blue-600';
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
