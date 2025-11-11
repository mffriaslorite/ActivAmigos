import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Group } from '../../../core/models/group.model';

@Component({
  selector: 'app-group-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-card.component.html',
  styleUrls: ['./group-card.component.scss']
})
export class GroupCardComponent {
  @Input() group!: Group;
  @Input() isLoading = false;
  @Output() joinGroup = new EventEmitter<number>();
  @Output() leaveGroup = new EventEmitter<number>();

  constructor(private router: Router) {}

  onJoinLeave() {
    if (this.isLoading) return;
    
    if (this.group.is_member) {
      this.leaveGroup.emit(this.group.id);
    } else {
      this.joinGroup.emit(this.group.id);
    }
  }

  onCardClick() {
    this.router.navigate(['/groups', this.group.id]);
  }

  getGroupIcon(): string {
    // Simple mapping of group names to icons
    const name = this.group.name.toLowerCase();
    if (name.includes('fútbol') || name.includes('football') || name.includes('soccer') || name.includes('futbol')) {
      return '⚽';
    } else if (name.includes('arte') || name.includes('art') || name.includes('pintura')) {
      return '🎨';
    } else if (name.includes('música') || name.includes('music')) {
      return '🎵';
    } else if (name.includes('cocina') || name.includes('cooking') || name.includes('chef')) {
      return '👩‍🍳';
    } else if (name.includes('juegos') || name.includes('games') || name.includes('gaming')) {
      return '🎮';
    } else if (name.includes('lectura') || name.includes('reading') || name.includes('libros')) {
      return '📚';
    } else if (name.includes('ejercicio') || name.includes('gym') || name.includes('fitness')) {
      return '💪';
    } else if (name.includes('naturaleza') || name.includes('nature') || name.includes('hiking')) {
      return '🌳';
    } else {
      return '👥';
    }
  }

  getIconBackground(): string {
    const name = this.group.name.toLowerCase();
    if (name.includes('fútbol') || name.includes('football') || name.includes('soccer')) {
      return 'bg-green-100';
    } else if (name.includes('arte') || name.includes('art') || name.includes('pintura')) {
      return 'bg-purple-100';
    } else if (name.includes('música') || name.includes('music')) {
      return 'bg-pink-100';
    } else if (name.includes('cocina') || name.includes('cooking') || name.includes('chef')) {
      return 'bg-orange-100';
    } else if (name.includes('juegos') || name.includes('games') || name.includes('gaming')) {
      return 'bg-indigo-100';
    } else if (name.includes('lectura') || name.includes('reading') || name.includes('libros')) {
      return 'bg-yellow-100';
    } else if (name.includes('ejercicio') || name.includes('gym') || name.includes('fitness')) {
      return 'bg-red-100';
    } else if (name.includes('naturaleza') || name.includes('nature') || name.includes('hiking')) {
      return 'bg-green-100';
    } else {
      return 'bg-blue-100';
    }
  }

  formatDate(dateString: string): string {
    // Asegurar que la fecha se interprete correctamente
    let date: Date;
    
    if (dateString.endsWith('Z') || dateString.includes('+')) {
      // Ya tiene información de zona horaria
      date = new Date(dateString);
    } else {
      // Asumir que es UTC y añadir 'Z'
      date = new Date(dateString + (dateString.includes('T') ? 'Z' : 'T00:00:00Z'));
    }
    
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