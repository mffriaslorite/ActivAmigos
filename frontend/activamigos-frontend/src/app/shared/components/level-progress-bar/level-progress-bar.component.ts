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
  @Input() level: number = 0;
  @Input() progressToNextLevel: number = 0; // 0-1 float
  @Input() showPoints: boolean = true;
  @Input() showLevel: boolean = true;

  progressPercentage: number = 0;
  currentPoints: number = 0;
  pointsToNextLevel: number = 100;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['progressToNextLevel']) {
      this.updateProgress();
    }
  }

  private updateProgress(): void {
    // Ensure progress is between 0 and 1
    const progress = Math.max(0, Math.min(1, this.progressToNextLevel));
    this.progressPercentage = progress * 100;
    
    // Calculate current points within the level (0-99)
    this.currentPoints = Math.floor(progress * 100);
    this.pointsToNextLevel = 100 - this.currentPoints;
  }

  getProgressBarStyle(): { [key: string]: string } {
    return {
      'width': `${this.progressPercentage}%`
    };
  }
}