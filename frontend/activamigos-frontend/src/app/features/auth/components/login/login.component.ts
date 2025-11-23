import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { PasswordHint } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
}