import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-level-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './level-progress-bar.component.html',
  styleUrls: ['./level-progress-bar.component.scss']
})
export class LevelProgressBarComponent implements OnChanges {
  // ✅ Nuevo Input: Puntos totales (lo que manda el perfil)
  @Input() points: number = 0;
  
  // Opciones visuales
  @Input() showPoints: boolean = true;
  @Input() showLevel: boolean = true;
  @Input() displayMode: 'XP' | 'STARS' = 'XP';

  // Variables calculadas para la vista
  level: number = 1;
  progressPercentage: number = 0;
  pointsInCurrentLevel: number = 0;
  pointsToNextLevel: number = 100;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points']) {
      this.calculateLevelData();
    }
  }

  private calculateLevelData(): void {
    // Lógica Simple: Cada 100 puntos es un nivel
    // 0-99 pts = Nivel 1
    // 100-199 pts = Nivel 2, etc.
    
    // 1. Calcular Nivel (mínimo nivel 1)
    this.level = Math.floor(this.points / 100) + 1;
    
    // 2. Calcular puntos dentro del nivel actual (el resto de dividir por 100)
    this.pointsInCurrentLevel = this.points % 100;
    
    // 3. Calcular porcentaje (al ser base 100, es igual a los puntos)
    this.progressPercentage = this.pointsInCurrentLevel;

    // 4. Calcular cuánto falta
    this.pointsToNextLevel = 100 - this.pointsInCurrentLevel;
  }

  getProgressBarStyle(): { [key: string]: string } {
    return {
      'width': `${this.progressPercentage}%`
    };
  }

  get currentVisualPoints(): number {
    return this.displayMode === 'STARS'
      ? Math.max(0, Math.round(this.pointsInCurrentLevel / 25))
      : this.pointsInCurrentLevel;
  }

  get nextLevelVisualTarget(): number {
    return this.displayMode === 'STARS' ? 4 : 100;
  }

  get remainingVisualPoints(): number {
    return this.displayMode === 'STARS'
      ? Math.max(0, this.nextLevelVisualTarget - this.currentVisualPoints)
      : this.pointsToNextLevel;
  }
}
