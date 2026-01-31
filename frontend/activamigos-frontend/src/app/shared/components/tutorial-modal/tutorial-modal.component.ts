import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutorial-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorial-modal.component.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class TutorialModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  currentSlide = 0;

  slides = [
    {
      title: '¡Bienvenido a ActivAmigos!',
      image: '🚀',
      text: 'Aquí podrás apuntarte a planes divertidos y conocer gente nueva.',
      color: 'bg-indigo-50 border-indigo-100 text-indigo-600'
    },
    {
      title: 'Actividades',
      image: '📅', 
      text: 'Busca cosas que te gusten hacer: cine, deporte, paseos... ¡Y apúntate!',
      color: 'bg-green-50 border-green-100 text-green-600'
    },
    {
      title: 'Grupos',
      image: '👥',
      text: 'Únete a grupos de personas con tus mismos gustos para hablar y quedar.',
      color: 'bg-blue-50 border-blue-100 text-blue-600'
    },
    {
      title: 'Semáforo',
      image: '🚦',
      text: 'Si te portas bien, tu semáforo estará verde. Si molestas, se pondrá rojo.',
      color: 'bg-yellow-50 border-yellow-100 text-yellow-600'
    },
    {
      title: 'Sube de Nivel',
      image: '🏆',
      text: 'Participa en actividades para ganar puntos y conseguir medallas.',
      color: 'bg-purple-50 border-purple-100 text-purple-600'
    }
  ];

  nextSlide() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
    } else {
      this.closeModal(); // Close on last slide "Finish"
    }
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    }
  }

  goToSlide(index: number) {
    this.currentSlide = index;
  }

  closeModal() {
    this.close.emit();
    this.currentSlide = 0; // Reset for next time
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('backdrop')) {
      this.closeModal();
    }
  }
}
