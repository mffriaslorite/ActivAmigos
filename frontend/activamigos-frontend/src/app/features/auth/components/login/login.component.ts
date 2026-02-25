import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { PasswordHint } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  
  errorMessage: string = ''; 
  isLoading: boolean = false;

  // Variables para pistas
  animalsList: string[] = [];

  // Variables para recuperación de contraseña
  showForgotModal = false;
  forgotEmail = '';
  forgotMessage = '';
  forgotError = '';
  isForgotLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      remember_me: [false]
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired']) {
        this.errorMessage = 'Tu sesión ha terminado. Por favor, entra otra vez.';
      }
    });

    this.authService.getAnimalsList().subscribe({
      next: (response) => {
        this.animalsList = response.animals;
      },
      error: (err) => console.warn('No se pudieron cargar las pistas de animales', err)
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.loginForm.disable();

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.loginForm.enable();
        this.errorMessage = err.message;
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  openForgotModal() {
    this.showForgotModal = true;
    this.forgotEmail = '';
    this.forgotMessage = '';
    this.forgotError = '';
  }

  closeForgotModal() {
    this.showForgotModal = false;
  }

  onForgotPassword() {
    if (!this.forgotEmail || !this.forgotEmail.includes('@')) {
      this.forgotError = 'Por favor, introduce un correo electrónico válido.';
      return;
    }

    this.isForgotLoading = true;
    this.forgotError = '';
    this.forgotMessage = '';

    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (res) => {
        this.isForgotLoading = false;
        this.forgotMessage = res.message;
      },
      error: (err) => {
        this.isForgotLoading = false;
        this.forgotError = 'Ha ocurrido un error al intentar restablecer la contraseña. Inténtalo más tarde.';
      }
    });
  }
}