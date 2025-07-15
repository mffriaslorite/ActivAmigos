import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Skip link for keyboard navigation -->
      <a href="#main-content" class="skip-link">
        Skip to main content
      </a>

      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">
            <div class="flex items-center">
              <h1 class="text-xl font-semibold text-gray-900">
                ActivAmigos
              </h1>
              <span class="ml-2 text-sm text-gray-500" aria-hidden="true">🌟</span>
            </div>
            
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-700" *ngIf="currentUser">
                Welcome, {{ currentUser.first_name || currentUser.username }}!
              </span>
              <button
                (click)="logout()"
                class="btn-secondary"
                [disabled]="isLoading"
              >
                {{ isLoading ? 'Signing out...' : 'Sign out' }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main id="main-content" class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <!-- Welcome Section -->
        <div class="card mb-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
              🎉 Welcome to ActivAmigos!
            </h2>
            <p class="text-lg text-gray-600 mb-6">
              Your inclusive social platform for activities and connections
            </p>
            
            <div *ngIf="currentUser" class="bg-primary-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-primary-900 mb-2">
                Your Profile
              </h3>
              <div class="text-sm text-primary-700 space-y-1">
                <p><strong>Username:</strong> {{ currentUser.username }}</p>
                <p><strong>Email:</strong> {{ currentUser.email }}</p>
                <p *ngIf="currentUser.first_name || currentUser.last_name">
                  <strong>Name:</strong> 
                  {{ (currentUser.first_name || '') + ' ' + (currentUser.last_name || '') }}
                </p>
                <p><strong>Member since:</strong> {{ formatDate(currentUser.created_at) }}</p>
              </div>
            </div>

            <!-- Accessibility Status -->
            <div *ngIf="currentUser?.accessibility_preferences" class="bg-green-50 rounded-lg p-4 mb-6">
              <h3 class="text-lg font-medium text-green-900 mb-2">
                ♿ Accessibility Settings Active
              </h3>
              <div class="text-sm text-green-700">
                <div class="grid grid-cols-2 gap-2 text-left">
                  <div *ngIf="currentUser.accessibility_preferences.high_contrast">
                    ✓ High contrast mode
                  </div>
                  <div *ngIf="currentUser.accessibility_preferences.large_text">
                    ✓ Large text
                  </div>
                  <div *ngIf="currentUser.accessibility_preferences.screen_reader">
                    ✓ Screen reader support
                  </div>
                  <div *ngIf="currentUser.accessibility_preferences.reduced_motion">
                    ✓ Reduced motion
                  </div>
                  <div *ngIf="currentUser.accessibility_preferences.keyboard_navigation">
                    ✓ Keyboard navigation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <!-- Groups Card -->
          <div class="card">
            <div class="text-center">
              <div class="text-4xl mb-4" aria-hidden="true">👥</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Groups</h3>
              <p class="text-sm text-gray-600 mb-4">
                Join groups with shared interests and connect with like-minded people
              </p>
              <button class="btn-primary w-full" disabled>
                Coming in Sprint 4
              </button>
            </div>
          </div>

          <!-- Activities Card -->
          <div class="card">
            <div class="text-center">
              <div class="text-4xl mb-4" aria-hidden="true">🎯</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Activities</h3>
              <p class="text-sm text-gray-600 mb-4">
                Discover and participate in fun activities in your community
              </p>
              <button class="btn-primary w-full" disabled>
                Coming in Sprint 5
              </button>
            </div>
          </div>

          <!-- Help Card -->
          <div class="card">
            <div class="text-center">
              <div class="text-4xl mb-4" aria-hidden="true">💡</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Help & Tutorials</h3>
              <p class="text-sm text-gray-600 mb-4">
                Learn how to use the platform with step-by-step guides
              </p>
              <button class="btn-primary w-full" disabled>
                Coming in Sprint 8
              </button>
            </div>
          </div>
        </div>

        <!-- Sprint 2 Completion Notice -->
        <div class="card bg-success-50 border-success-200">
          <div class="text-center">
            <h3 class="text-lg font-medium text-success-900 mb-2">
              🎉 Sprint 2: Authentication - COMPLETED!
            </h3>
            <p class="text-sm text-success-700 mb-4">
              You're now successfully logged in to ActivAmigos with a fully accessible authentication system.
            </p>
            <div class="text-xs text-success-600">
              <p>✅ Secure login and registration</p>
              <p>✅ Accessibility preferences saved</p>
              <p>✅ WCAG 2.1 AA compliant design</p>
              <p>✅ Mobile-responsive interface</p>
            </div>
          </div>
        </div>

        <!-- Development Status -->
        <div class="mt-8 card bg-primary-50 border-primary-200">
          <h3 class="text-lg font-medium text-primary-900 mb-4">
            🚀 Development Roadmap
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 class="font-medium text-primary-800 mb-2">Completed</h4>
              <ul class="space-y-1 text-primary-700">
                <li>✅ Sprint 1: Research & setup</li>
                <li>✅ Sprint 2: Authentication system</li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-primary-800 mb-2">Coming Next</h4>
              <ul class="space-y-1 text-primary-700">
                <li>⏳ Sprint 3: Homepage & Navigation</li>
                <li>🔄 Sprint 4: Groups module</li>
                <li>🔄 Sprint 5: Activities module</li>
                <li>🔄 Sprint 6: Chat functionality</li>
                <li>🔄 Sprint 7: Achievements & profile</li>
                <li>🔄 Sprint 8: Help & accessibility</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* High contrast mode adjustments */
    @media (prefers-contrast: high) {
      .card {
        border: 2px solid black;
      }
      
      header {
        border-bottom: 2px solid black;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    // Subscribe to loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout() {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          console.error('Logout error:', error);
          // Force navigation to login even if logout request fails
          this.router.navigate(['/auth/login']);
        }
      });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  }
}