import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  currentYear = new Date().getFullYear();
  supportEmail = 'support@grandparadise.com';

  newsletterEmail = '';
  subscribeMessage = '';
  copyMessage = '';

  subscribeNewsletter(): void {
    const normalizedEmail = this.newsletterEmail.trim().toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!validEmail) {
      this.subscribeMessage = 'Enter a valid email address to subscribe.';
      return;
    }

    this.subscribeMessage = 'Thanks for subscribing. Exclusive offers are on the way.';
    this.newsletterEmail = '';
  }

  async copySupportEmail(): Promise<void> {
    this.copyMessage = '';

    try {
      await navigator.clipboard.writeText(this.supportEmail);
      this.copyMessage = 'Email copied.';
      return;
    } catch {
      this.copyMessage = 'Copy failed. Please copy manually.';
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
