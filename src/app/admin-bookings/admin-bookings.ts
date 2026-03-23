import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-bookings.html',
  styleUrl: '../admin/admin.css'
})
export class AdminBookingsComponent implements OnInit {
  bookings: any[] = [];
  loadingBookings = false;
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
    if (!this.auth.isLoggedIn() || !this.auth.isAdmin()) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.loadBookings();
  }

  loadBookings() {
    this.loadingBookings = true;
    this.http.get('http://localhost:8080/api/bookings', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }).subscribe({
      next: (data: any) => {
        this.bookings = data;
        this.loadingBookings = false;
      },
      error: (err) => {
        console.error(err);
        this.error = err?.error?.message || 'Failed to load bookings.';
        this.loadingBookings = false;
      }
    });
  }

  get filteredBookings(): any[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    const filtered = this.bookings.filter((booking) => {
      const roomLabel = this.getRoomLabel(booking).toLowerCase();
      const userLabel = this.getUserLabel(booking).toLowerCase();
      const matchesSearch = !normalizedSearch
        || roomLabel.includes(normalizedSearch)
        || userLabel.includes(normalizedSearch)
        || String(booking.id).includes(normalizedSearch);
      const matchesStatus = this.selectedStatus === 'all'
        || this.getBookingStatus(booking).toLowerCase() === this.selectedStatus;

      return matchesSearch && matchesStatus;
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

  get totalGuests(): number {
    return this.bookings.reduce((sum, booking) => sum + Number(booking.guests || 0), 0);
  }

  setStatusFilter(status: string): void {
    this.selectedStatus = status;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.sortBy = 'latest';
  }

  editBooking(bookingId: number) {
    this.router.navigate(['/admin/bookings', bookingId, 'edit']);
  }

  deleteBooking(bookingId: number) {
    if (!confirm('Cancel this booking?')) {
      return;
    }

    const token = localStorage.getItem('token');

    this.message = '';
    this.error = '';

    this.http.delete(`http://localhost:8080/api/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: () => {
        this.message = 'Booking cancelled successfully.';
        this.loadBookings();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to cancel booking.';
      }
    });
  }

  getRoomLabel(booking: any): string {
    return booking.room?.name || booking.roomName || (booking.roomId ? `Room #${booking.roomId}` : 'Room');
  }

  getUserLabel(booking: any): string {
    return booking.user?.name || booking.customerName || booking.userEmail || booking.email || 'Admin';
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
