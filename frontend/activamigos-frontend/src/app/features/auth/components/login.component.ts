import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <!-- Skip link for keyboard navigation -->
      <a href="#main-content" class="skip-link">
        Skip to main content
      </a>

      <div class="max-w-md w-full space-y-8" id="main-content">
        <!-- Header -->
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            Welcome to ActivAmigos
          </h1>
          <p class="text-lg text-gray-600">
            Sign in to your account
          </p>
          <div class="mt-4 text-sm text-gray-500">
            <span class="inline-flex items-center">
              <span class="mr-2" aria-hidden="true">🌟</span>
              Your inclusive social platform
            </span>
          </div>
        </div>

        <!-- Login Form -->
        <form 
          [formGroup]="loginForm" 
          (ngSubmit)="onSubmit()"
          class="card space-y-6"
          novalidate
        >
          <!-- Error Alert -->
          <div 
            *ngIf="errorMessage" 
            class="alert-error"
            role="alert"
            attr.aria-live="polite"
          >
            <span class="font-medium">Error:</span> {{ errorMessage }}
          </div>

          <!-- Username/Email Field -->
          <div>
            <label for="username" class="form-label">
              Username or Email
              <span class="text-error-500" aria-label="required">*</span>
            </label>
            <input
              id="username"
              type="text"
              formControlName="username"
              class="form-input"
              [class.border-error-500]="isFieldInvalid('username')"
              placeholder="Enter your username or email"
              autocomplete="username"
              required
              attr.aria-describedby="username-error"
              [attr.aria-invalid]="isFieldInvalid('username')"
            >
            <div 
              id="username-error"
              *ngIf="isFieldInvalid('username')"
              class="form-error"
              role="alert"
            >
              <span *ngIf="loginForm.get('username')?.errors?.['required']">
                Username or email is required
              </span>
            </div>
          </div>

          <!-- Password Field -->
          <div>
            <label for="password" class="form-label">
              Password
              <span class="text-error-500" aria-label="required">*</span>
            </label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                class="form-input pr-12"
                [class.border-error-500]="isFieldInvalid('password')"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
                attr.aria-describedby="password-error"
                [attr.aria-invalid]="isFieldInvalid('password')"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
              >
                <span class="text-gray-500">
                  {{ showPassword ? '🙈' : '👁️' }}
                </span>
              </button>
            </div>
            <div 
              id="password-error"
              *ngIf="isFieldInvalid('password')"
              class="form-error"
              role="alert"
            >
              <span *ngIf="loginForm.get('password')?.errors?.['required']">
                Password is required
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <div>
            <button
              type="submit"
              class="btn-primary w-full flex items-center justify-center"
              [disabled]="loginForm.invalid || isLoading"
              [attr.aria-busy]="isLoading"
            >
              <span *ngIf="isLoading" class="spinner mr-2" aria-hidden="true"></span>
              <span>
                {{ isLoading ? 'Signing in...' : 'Sign in' }}
              </span>
            </button>
          </div>

          <!-- Register Link -->
          <div class="text-center">
            <p class="text-sm text-gray-600">
              Don't have an account?
              <a 
                routerLink="/auth/register" 
                class="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
              >
                Create one here
              </a>
            </p>
          </div>

          <!-- Accessibility Notice -->
          <div class="text-center">
            <p class="text-xs text-gray-500">
              Need help with accessibility features? 
              <a 
                routerLink="/help/accessibility" 
                class="text-primary-600 hover:text-primary-500 underline"
              >
                Learn more
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    /* Component-specific accessibility styles */
    .form-input:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-input[aria-invalid="true"] {
      border-color: #ef4444;
    }
    
    /* High contrast mode adjustments */
    @media (prefers-contrast: high) {
      .card {
        border: 2px solid black;
      }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  returnUrl = '';
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Subscribe to loading state
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    // Clear any previous error messages when form values change
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage) {
          this.errorMessage = '';
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const loginData: LoginRequest = {
      username: this.loginForm.value.username.trim(),
      password: this.loginForm.value.password
    };

    this.authService.login(loginData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Announce success to screen readers
          this.announceToScreenReader('Login successful. Redirecting to dashboard.');
          
          // Navigate to return URL or dashboard
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Login failed. Please try again.';
          
          // Focus on error message for screen readers
          setTimeout(() => {
            const errorElement = document.querySelector('[role="alert"]');
            if (errorElement) {
              (errorElement as HTMLElement).focus();
            }
          }, 100);
        }
      });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private announceToScreenReader(message: string) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove the announcement after a short delay
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}