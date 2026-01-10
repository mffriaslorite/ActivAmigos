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

  onCardClick() {
    this.router.navigate(['/groups', this.group.id]);
  }

  // Acciones separadas para mayor claridad
  onJoin(event: Event) {
    event.stopPropagation();
    if (!this.isLoading) this.joinGroup.emit(this.group.id);
  }

  onLeave(event: Event) {
    event.stopPropagation();
    if (!this.isLoading) this.leaveGroup.emit(this.group.id);
  }

  getGroupIcon(): string {
    const name = this.group.name.toLowerCase();
    if (name.includes('lectura') || name.includes('libro')) return '📚';
    if (name.includes('deporte') || name.includes('fútbol')) return '⚽';
    if (name.includes('cocina') || name.includes('receta')) return '👨‍🍳';
    if (name.includes('arte') || name.includes('pintura')) return '🎨';
    if (name.includes('música') || name.includes('canto')) return '🎵';
    if (name.includes('tecnología') || name.includes('código')) return '💻';
    if (name.includes('viaje') || name.includes('turismo')) return '✈️';
    return '👥';
  }

  getIconBackground(): string {
    const name = this.group.name.toLowerCase();
    if (name.includes('lectura')) return 'bg-purple-100 text-purple-600';
    if (name.includes('deporte')) return 'bg-green-100 text-green-600';
    if (name.includes('cocina')) return 'bg-orange-100 text-orange-600';
    if (name.includes('arte')) return 'bg-pink-100 text-pink-600';
    return 'bg-indigo-100 text-indigo-600';
  }
}