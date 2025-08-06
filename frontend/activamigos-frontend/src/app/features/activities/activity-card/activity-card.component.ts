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
  @Output() joinActivity = new EventEmitter<number>();
  @Output() leaveActivity = new EventEmitter<number>();

  constructor(private router: Router) {}

  onJoinLeave() {
    if (this.isLoading) return;
    
    if (this.activity.is_participant) {
      this.leaveActivity.emit(this.activity.id);
    } else {
      this.joinActivity.emit(this.activity.id);
    }
  }

  onCardClick() {
    this.router.navigate(['/activities', this.activity.id]);
  }

  getActivityIcon(): string {
    const title = this.activity.title.toLowerCase();
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
    const title = this.activity.title.toLowerCase();
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}