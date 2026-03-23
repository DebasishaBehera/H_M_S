import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
export class MyBookingsComponent implements OnInit {
  bookings: any[] = [];
  loading = false;
  message = '';
  error = '';
  searchTerm = '';
  selectedStatus = 'all';
  sortBy = 'latest';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.auth.isAdmin()) {
      this.router.navigate(['/admin/bookings']);
      return;
    }

    if (!this.userEmail) {
      this.error = 'Unable to identify the signed-in user.';
      return;
    }

    this.message = history.state?.message || '';

    this.loadBookings();
  }

  get userEmail(): string {
    return this.auth.getUserEmail().toLowerCase();
  }

  get filteredBookings(): any[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    const filtered = this.bookings.filter((booking) => {
      const matchesStatus = this.selectedStatus === 'all'
        || this.getBookingStatus(booking).toLowerCase() === this.selectedStatus;
      const matchesSearch = !normalizedSearch
        || this.getRoomLabel(booking).toLowerCase().includes(normalizedSearch)
        || String(booking.id).includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });

    return filtered.sort((first, second) => {
      const firstCheckIn = new Date(first.checkInDate || '').getTime();
      const secondCheckIn = new Date(second.checkInDate || '').getTime();

      if (this.sortBy === 'oldest') {
        return firstCheckIn - secondCheckIn;
      }

      if (this.sortBy === 'checkout') {
        const firstCheckOut = new Date(first.checkOutDate || '').getTime();
        const secondCheckOut = new Date(second.checkOutDate || '').getTime();
        return firstCheckOut - secondCheckOut;
      }

      return secondCheckIn - firstCheckIn;
    });
  }

  get upcomingCount(): number {
    return this.bookings.filter((booking) => this.getBookingStatus(booking) === 'Upcoming').length;
  }

  get activeCount(): number {
    return this.bookings.filter((booking) => this.getBookingStatus(booking) === 'Active').length;
  }

  get completedCount(): number {
    return this.bookings.filter((booking) => this.getBookingStatus(booking) === 'Completed').length;
  }

  private get authHeaders(): Record<string, string | string[]> | undefined {
    const token = localStorage.getItem('token');
    if (!token) {
      return undefined;
    }

    return { Authorization: `Bearer ${token}` };
  }

  loadBookings(): void {
    this.loading = true;
    this.message = '';
    this.error = '';

    this.http.get<any[]>('http://localhost:8080/api/bookings', {
      headers: this.authHeaders
    }).subscribe({
      next: (data) => {
        this.bookings = (data || [])
          .filter((booking) => this.getBookingEmail(booking) === this.userEmail)
          .sort((first, second) => {
            const firstDate = new Date(first.checkInDate || '').getTime();
            const secondDate = new Date(second.checkInDate || '').getTime();
            return secondDate - firstDate;
          });
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Failed to load your bookings.';
        this.loading = false;
      }
    });
  }

  editBooking(bookingId: number): void {
    this.router.navigate(['/my-bookings', bookingId, 'edit']);
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.sortBy = 'latest';
  }

  cancelBooking(bookingId: number): void {
    if (!confirm('Cancel this booking?')) {
      return;
    }

    this.message = '';
    this.error = '';

    this.http.delete(`http://localhost:8080/api/bookings/${bookingId}`, {
      headers: this.authHeaders
    }).subscribe({
      next: () => {
        this.message = 'Booking cancelled successfully.';
        this.loadBookings();
      },
      error: (err) => {
        console.error(err);
        if (err?.status === 403) {
          this.error = 'Your account is not allowed to cancel bookings yet. The backend currently blocks this action for normal users.';
          return;
        }

        this.error = err?.error?.message || 'Failed to cancel booking.';
      }
    });
  }

  getRoomLabel(booking: any): string {
    return booking.room?.name || booking.roomName || (booking.roomId ? `Room #${booking.roomId}` : 'Room');
  }

  getBookingNights(booking: any): number {
    const checkIn = new Date(booking.checkInDate || '');
    const checkOut = new Date(booking.checkOutDate || '');
    const diff = checkOut.getTime() - checkIn.getTime();

    if (Number.isNaN(diff) || diff <= 0) {
      return 1;
    }

    return Math.ceil(diff / 86400000);
  }

  getBookingStatus(booking: any): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = this.toDateOnly(booking.checkInDate);
    const checkOut = this.toDateOnly(booking.checkOutDate);

    if (!checkIn || !checkOut) {
      return 'Active';
    }

    if (today < checkIn) {
      return 'Upcoming';
    }

    if (today >= checkOut) {
      return 'Completed';
    }

    return 'Active';
  }

  private getBookingEmail(booking: any): string {
    return String(booking.user?.email || booking.userEmail || booking.email || '').toLowerCase();
  }

  private toDateOnly(value: any): Date | null {
    const raw = String(value || '').substring(0, 10);
    const parts = raw.split('-').map((part) => Number(part));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }

    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }
}