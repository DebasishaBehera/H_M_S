import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  message = '';
  isSubmitting = false;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onLogin(form: NgForm) {
    if (form.invalid || this.isSubmitting) {
      return;
    }

    this.message = '';
    this.isSubmitting = true;

    this.auth.login({ email: this.email, password: this.password, role: 'USER' }).subscribe({
      next: () => {
        this.message = 'Login successful!';
        this.isSubmitting = false;
        this.router.navigate(['/home']);
      },
      error: () => {
        this.message = 'Invalid email or password';
        this.isSubmitting = false;
      }
    });
  }
}
