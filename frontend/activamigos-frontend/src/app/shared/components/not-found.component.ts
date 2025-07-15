import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <!-- Skip link for keyboard navigation -->
      <a href="#main-content" class="skip-link">
        Skip to main content
      </a>

      <div class="max-w-md w-full text-center" id="main-content">
        <!-- 404 Icon -->
        <div class="text-6xl mb-6" aria-hidden="true">🤔</div>
        
        <!-- Header -->
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h1>
        
        <p class="text-lg text-gray-600 mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>

        <!-- Helpful Navigation -->
        <div class="card space-y-4">
          <h2 class="text-lg font-medium text-gray-900 mb-4">
            Where would you like to go?
          </h2>
          
          <div class="space-y-3">
            <a 
              routerLink="/dashboard" 
              class="btn-primary w-full"
            >
              🏠 Go to Dashboard
            </a>
            
            <a 
              routerLink="/auth/login" 
              class="btn-secondary w-full"
            >
              🔐 Sign In
            </a>
            
            <button 
              (click)="goBack()" 
              class="btn-secondary w-full"
            >
              ⬅️ Go Back
            </button>
          </div>
        </div>

        <!-- Help Text -->
        <div class="mt-8 text-sm text-gray-500">
          <p>
            If you think this is an error, please
            <a 
              href="mailto:support@activamigos.com" 
              class="text-primary-600 hover:text-primary-500 underline"
            >
              contact support
            </a>
          </p>
        </div>

        <!-- Accessibility Notice -->
        <div class="mt-6 text-xs text-gray-500">
          <p>
            Need help with accessibility features? 
            <a 
              routerLink="/help/accessibility" 
              class="text-primary-600 hover:text-primary-500 underline"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* High contrast mode adjustments */
    @media (prefers-contrast: high) {
      .card {
        border: 2px solid black;
      }
    }
  `]
})
export class NotFoundComponent {
  
  goBack() {
    // Use browser's back functionality
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard if no history
      window.location.href = '/dashboard';
    }
  }
}