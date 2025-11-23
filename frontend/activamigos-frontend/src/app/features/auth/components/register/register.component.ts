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
  
  animalsList: string[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      username: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(2)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.authService.getAnimalsList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.animalsList = response.animals,
        error: () => console.warn('No se pudieron cargar las sugerencias de animales')
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password && confirm && password === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.errorMessage = 'Por favor, rellena todos los campos marcados en rojo.';
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.registerForm.disable();

    const formValues = this.registerForm.value;
    
    const nameParts = formValues.fullName.trim().split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');

    const registerData: RegisterRequest = {
      username: formValues.username.trim(),
      email: formValues.email.trim().toLowerCase(),
      password: formValues.password,
      first_name: firstName,
      last_name: lastName
    };

    this.authService.register(registerData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          this.registerForm.enable();
          this.errorMessage = error.message;
        }
      });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}