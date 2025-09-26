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
      password: ['', [Validators.required, Validators.minLength(2)]],
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
