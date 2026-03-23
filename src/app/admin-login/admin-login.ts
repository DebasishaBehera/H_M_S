import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-login.html',
  styleUrl: '../login/login.css'
})
export class AdminLoginComponent {
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

    this.auth.adminLogin({ email: this.email, password: this.password, role: 'ADMIN' }).subscribe({
      next: (res) => {
        // Expect backend to send a role or authorities field
        const role = (res as any)?.role
          || (res as any)?.roles?.[0]
          || (res as any)?.authorities?.[0]?.authority;

        if (role && String(role).toLowerCase().includes('admin')) {
          // AuthService.login already stored token and role
          this.message = 'Admin login successful!';
          this.isSubmitting = false;
          this.router.navigate(['/admin']);
        } else {
          // Not an admin: clear any token and show error
          this.auth.logout();
          this.message = 'You are not authorized to access the admin panel.';
          this.isSubmitting = false;
        }
      },
      error: () => {
        this.message = 'Invalid admin credentials';
        this.isSubmitting = false;
      }
    });
  }
}
