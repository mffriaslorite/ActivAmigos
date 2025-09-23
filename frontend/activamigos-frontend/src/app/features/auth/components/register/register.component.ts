import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequest } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm: FormGroup;
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  showPasswordHint = true; // Show hint by default on registration
  animalsList: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading = loading);
    
    // Load animals list for password hints
    this.authService.getAnimalsList().subscribe({
      next: (response) => {
        this.animalsList = response.animals;
      },
      error: (err) => {
        console.error('Error loading animals list:', err);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor, completa correctamente todos los campos.';
      return;
    }

    const formValues = this.registerForm.value;
    const registerData: RegisterRequest = {
      username: formValues.username.trim(),
      email: formValues.email.trim().toLowerCase(),
      password: formValues.password,
      first_name: formValues.fullName.split(' ')[0],
      last_name: formValues.fullName.split(' ')[1] || ''
    };

    this.authService.register(registerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al registrar el usuario';
        }
      });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}

// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
// import { Router, RouterLink } from '@angular/router';
// import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';
// import { AuthService, RegisterRequest } from '../../../../core/services/auth.service';

// @Component({
//   selector: 'app-register',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, RouterLink],
//   template: `
//     <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//       <!-- Skip link for keyboard navigation -->
//       <a href="#main-content" class="skip-link">
//         Skip to main content
//       </a>

//       <div class="max-w-md w-full space-y-8" id="main-content">
//         <!-- Header -->
//         <div class="text-center">
//           <h1 class="text-3xl font-bold text-gray-900 mb-2">
//             Join ActivAmigos
//           </h1>
//           <p class="text-lg text-gray-600">
//             Create your account
//           </p>
//           <div class="mt-4 text-sm text-gray-500">
//             <span class="inline-flex items-center">
//               <span class="mr-2" aria-hidden="true">🎉</span>
//               Start your inclusive journey
//             </span>
//           </div>
//         </div>

//         <!-- Register Form -->
//         <form 
//           [formGroup]="registerForm" 
//           (ngSubmit)="onSubmit()"
//           class="card space-y-6"
//           novalidate
//         >
//           <!-- Error Alert -->
//           <div 
//             *ngIf="errorMessage" 
//             class="alert-error"
//             role="alert"
//             attr.aria-live="polite"
//           >
//             <span class="font-medium">Error:</span> {{ errorMessage }}
//           </div>

//           <!-- Success Alert -->
//           <div 
//             *ngIf="successMessage" 
//             class="alert-success"
//             role="alert"
//             attr.aria-live="polite"
//           >
//             <span class="font-medium">Success:</span> {{ successMessage }}
//           </div>

//           <!-- Username Field -->
//           <div>
//             <label for="username" class="form-label">
//               Username
//               <span class="text-error-500" aria-label="required">*</span>
//             </label>
//             <input
//               id="username"
//               type="text"
//               formControlName="username"
//               class="form-input"
//               [class.border-error-500]="isFieldInvalid('username')"
//               placeholder="Choose a username"
//               autocomplete="username"
//               required
//               attr.aria-describedby="username-error username-help"
//               [attr.aria-invalid]="isFieldInvalid('username')"
//             >
//             <div id="username-help" class="text-xs text-gray-500 mt-1">
//               3-20 characters, letters, numbers, hyphens, and underscores only
//             </div>
//             <div 
//               id="username-error"
//               *ngIf="isFieldInvalid('username')"
//               class="form-error"
//               role="alert"
//             >
//               <span *ngIf="registerForm.get('username')?.errors?.['required']">
//                 Username is required
//               </span>
//               <span *ngIf="registerForm.get('username')?.errors?.['minlength']">
//                 Username must be at least 3 characters long
//               </span>
//               <span *ngIf="registerForm.get('username')?.errors?.['maxlength']">
//                 Username must be no more than 20 characters long
//               </span>
//               <span *ngIf="registerForm.get('username')?.errors?.['pattern']">
//                 Username can only contain letters, numbers, hyphens, and underscores
//               </span>
//             </div>
//           </div>

//           <!-- Email Field -->
//           <div>
//             <label for="email" class="form-label">
//               Email
//               <span class="text-error-500" aria-label="required">*</span>
//             </label>
//             <input
//               id="email"
//               type="email"
//               formControlName="email"
//               class="form-input"
//               [class.border-error-500]="isFieldInvalid('email')"
//               placeholder="your.email@example.com"
//               autocomplete="email"
//               required
//               attr.aria-describedby="email-error"
//               [attr.aria-invalid]="isFieldInvalid('email')"
//             >
//             <div 
//               id="email-error"
//               *ngIf="isFieldInvalid('email')"
//               class="form-error"
//               role="alert"
//             >
//               <span *ngIf="registerForm.get('email')?.errors?.['required']">
//                 Email is required
//               </span>
//               <span *ngIf="registerForm.get('email')?.errors?.['email']">
//                 Please enter a valid email address
//               </span>
//             </div>
//           </div>

//           <!-- Password Field -->
//           <div>
//             <label for="password" class="form-label">
//               Password
//               <span class="text-error-500" aria-label="required">*</span>
//             </label>
//             <div class="relative">
//               <input
//                 id="password"
//                 [type]="showPassword ? 'text' : 'password'"
//                 formControlName="password"
//                 class="form-input pr-12"
//                 [class.border-error-500]="isFieldInvalid('password')"
//                 placeholder="Create a secure password"
//                 autocomplete="new-password"
//                 required
//                 attr.aria-describedby="password-error password-help"
//                 [attr.aria-invalid]="isFieldInvalid('password')"
//               >
//               <button
//                 type="button"
//                 class="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 (click)="togglePasswordVisibility()"
//                 [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
//               >
//                 <span class="text-gray-500">
//                   {{ showPassword ? '🙈' : '👁️' }}
//                 </span>
//               </button>
//             </div>
//             <div id="password-help" class="text-xs text-gray-500 mt-1">
//               At least 8 characters with letters and numbers
//             </div>
//             <div 
//               id="password-error"
//               *ngIf="isFieldInvalid('password')"
//               class="form-error"
//               role="alert"
//             >
//               <span *ngIf="registerForm.get('password')?.errors?.['required']">
//                 Password is required
//               </span>
//               <span *ngIf="registerForm.get('password')?.errors?.['minlength']">
//                 Password must be at least 8 characters long
//               </span>
//               <span *ngIf="registerForm.get('password')?.errors?.['pattern']">
//                 Password must contain at least one letter and one number
//               </span>
//             </div>
//           </div>

//           <!-- First Name Field (Optional) -->
//           <div>
//             <label for="firstName" class="form-label">
//               First Name (Optional)
//             </label>
//             <input
//               id="firstName"
//               type="text"
//               formControlName="firstName"
//               class="form-input"
//               placeholder="Your first name"
//               autocomplete="given-name"
//               attr.aria-describedby="firstName-help"
//             >
//             <div id="firstName-help" class="text-xs text-gray-500 mt-1">
//               This helps us personalize your experience
//             </div>
//           </div>

//           <!-- Last Name Field (Optional) -->
//           <div>
//             <label for="lastName" class="form-label">
//               Last Name (Optional)
//             </label>
//             <input
//               id="lastName"
//               type="text"
//               formControlName="lastName"
//               class="form-input"
//               placeholder="Your last name"
//               autocomplete="family-name"
//             >
//           </div>

//           <!-- Accessibility Preferences -->
//           <fieldset class="border border-gray-200 rounded-lg p-4">
//             <legend class="text-sm font-medium text-gray-700 px-2">
//               Accessibility Preferences (Optional)
//             </legend>
//             <div class="mt-3 space-y-3">
//               <label class="flex items-center">
//                 <input
//                   type="checkbox"
//                   formControlName="highContrast"
//                   class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
//                 >
//                 <span class="ml-2 text-sm text-gray-700">
//                   High contrast mode
//                 </span>
//               </label>
              
//               <label class="flex items-center">
//                 <input
//                   type="checkbox"
//                   formControlName="largeText"
//                   class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
//                 >
//                 <span class="ml-2 text-sm text-gray-700">
//                   Large text
//                 </span>
//               </label>
              
//               <label class="flex items-center">
//                 <input
//                   type="checkbox"
//                   formControlName="reducedMotion"
//                   class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
//                 >
//                 <span class="ml-2 text-sm text-gray-700">
//                   Reduce animations
//                 </span>
//               </label>
              
//               <label class="flex items-center">
//                 <input
//                   type="checkbox"
//                   formControlName="screenReader"
//                   class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
//                 >
//                 <span class="ml-2 text-sm text-gray-700">
//                   I use a screen reader
//                 </span>
//               </label>
//             </div>
//           </fieldset>

//           <!-- Submit Button -->
//           <div>
//             <button
//               type="submit"
//               class="btn-primary w-full flex items-center justify-center"
//               [disabled]="registerForm.invalid || isLoading"
//               [attr.aria-busy]="isLoading"
//             >
//               <span *ngIf="isLoading" class="spinner mr-2" aria-hidden="true"></span>
//               <span>
//                 {{ isLoading ? 'Creating account...' : 'Create account' }}
//               </span>
//             </button>
//           </div>

//           <!-- Login Link -->
//           <div class="text-center">
//             <p class="text-sm text-gray-600">
//               Already have an account?
//               <a 
//                 routerLink="/auth/login" 
//                 class="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
//               >
//                 Sign in here
//               </a>
//             </p>
//           </div>

//           <!-- Accessibility Notice -->
//           <div class="text-center">
//             <p class="text-xs text-gray-500">
//               Need help with accessibility features? 
//               <a 
//                 routerLink="/help/accessibility" 
//                 class="text-primary-600 hover:text-primary-500 underline"
//               >
//                 Learn more
//               </a>
//             </p>
//           </div>
//         </form>
//       </div>
//     </div>
//   `,
//   styles: [`
//     /* Component-specific accessibility styles */
//     .form-input:focus {
//       box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
//     }
    
//     .form-input[aria-invalid="true"] {
//       border-color: #ef4444;
//     }
    
//     /* Fieldset styling */
//     fieldset {
//       border: 1px solid #d1d5db;
//     }
    
//     legend {
//       background: white;
//     }
    
//     /* High contrast mode adjustments */
//     @media (prefers-contrast: high) {
//       .card, fieldset {
//         border: 2px solid black;
//       }
//     }
//   `]
// })
// export class RegisterComponent implements OnInit, OnDestroy {
//   registerForm: FormGroup;
//   errorMessage = '';
//   successMessage = '';
//   isLoading = false;
//   showPassword = false;
//   private destroy$ = new Subject<void>();

//   constructor(
//     private formBuilder: FormBuilder,
//     private authService: AuthService,
//     private router: Router
//   ) {
//     this.registerForm = this.formBuilder.group({
//       username: ['', [
//         Validators.required,
//         Validators.minLength(3),
//         Validators.maxLength(20),
//         Validators.pattern(/^[a-zA-Z0-9_-]+$/)
//       ]],
//       email: ['', [Validators.required, Validators.email]],
//       password: ['', [
//         Validators.required,
//         Validators.minLength(8),
//         Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)/)
//       ]],
//       firstName: [''],
//       lastName: [''],
//       highContrast: [false],
//       largeText: [false],
//       reducedMotion: [false],
//       screenReader: [false]
//     });
//   }

//   ngOnInit() {
//     // Subscribe to loading state
//     this.authService.isLoading$
//       .pipe(takeUntil(this.destroy$))
//       .subscribe(loading => {
//         this.isLoading = loading;
//       });

//     // Clear any previous messages when form values change
//     this.registerForm.valueChanges
//       .pipe(takeUntil(this.destroy$))
//       .subscribe(() => {
//         if (this.errorMessage) {
//           this.errorMessage = '';
//         }
//         if (this.successMessage) {
//           this.successMessage = '';
//         }
//       });
//   }

//   ngOnDestroy() {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   onSubmit() {
//     if (this.registerForm.invalid) {
//       this.markFormGroupTouched();
//       return;
//     }

//     const formValues = this.registerForm.value;
//     const registerData: RegisterRequest = {
//       username: formValues.username.trim(),
//       email: formValues.email.trim().toLowerCase(),
//       password: formValues.password,
//       first_name: formValues.firstName?.trim() || '',
//       last_name: formValues.lastName?.trim() || '',
//       accessibility_preferences: {
//         high_contrast: formValues.highContrast,
//         large_text: formValues.largeText,
//         screen_reader: formValues.screenReader,
//         keyboard_navigation: true, // Always enabled
//         reduced_motion: formValues.reducedMotion
//       }
//     };

//     this.authService.register(registerData)
//       .pipe(takeUntil(this.destroy$))
//       .subscribe({
//         next: (response) => {
//           this.successMessage = 'Account created successfully! Redirecting to dashboard...';
          
//           // Announce success to screen readers
//           this.announceToScreenReader('Registration successful. Redirecting to dashboard.');
          
//           // Navigate to dashboard after a short delay
//           setTimeout(() => {
//             this.router.navigate(['/dashboard']);
//           }, 2000);
//         },
//         error: (error) => {
//           this.errorMessage = error.message || 'Registration failed. Please try again.';
          
//           // Focus on error message for screen readers
//           setTimeout(() => {
//             const errorElement = document.querySelector('[role="alert"]');
//             if (errorElement) {
//               (errorElement as HTMLElement).focus();
//             }
//           }, 100);
//         }
//       });
//   }

//   togglePasswordVisibility() {
//     this.showPassword = !this.showPassword;
//   }

//   isFieldInvalid(fieldName: string): boolean {
//     const field = this.registerForm.get(fieldName);
//     return !!(field && field.invalid && (field.dirty || field.touched));
//   }

//   private markFormGroupTouched() {
//     Object.keys(this.registerForm.controls).forEach(key => {
//       const control = this.registerForm.get(key);
//       control?.markAsTouched();
//     });
//   }

//   private announceToScreenReader(message: string) {
//     const announcement = document.createElement('div');
//     announcement.setAttribute('aria-live', 'polite');
//     announcement.setAttribute('aria-atomic', 'true');
//     announcement.className = 'sr-only';
//     announcement.textContent = message;
    
//     document.body.appendChild(announcement);
    
//     // Remove the announcement after a short delay
//     setTimeout(() => {
//       document.body.removeChild(announcement);
//     }, 1000);
//   }
// }