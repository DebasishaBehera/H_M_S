import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { Room } from '../models/room';
import { ImageUploadService } from '../image-upload.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css', './admin-create.css']
})
export class AdminComponent implements OnInit {
  rooms: Room[] = [];
  bookings: any[] = [];

  loadingRooms = false;
  loadingBookings = false;
  message = '';
  error = '';

  // Image upload state for new room form
  uploadingImage = false;
  imageUploadError = '';

  // Which admin view is currently active: 'new-room' | 'bookings' | 'view-rooms'
  selectedView: 'new-room' | 'bookings' | 'view-rooms' = 'new-room';

  // Simple room form model
  roomForm: Room = {
    id: undefined,
    name: '',
    description: '',
    pricePerNight: 0,
    capacity: 1,
    imageUrl: '',
    type: 'SINGLE'
  };

  // Inline edit form for "View All Rooms" tab
  editForm: Room = {
    id: undefined,
    name: '',
    description: '',
    pricePerNight: 0,
    capacity: 1,
    imageUrl: '',
    type: 'SINGLE'
  };

  editingRoomId: number | null = null;

  // Reference to the native file input so we can clear it
  @ViewChild('roomImageInput') roomImageInput!: ElementRef<HTMLInputElement>;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private imageUpload: ImageUploadService
  ) {
    // Keep selectedView in sync when navigating between admin URLs
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setViewFromUrl(event.urlAfterRedirects || event.url);
      }
    });
  }

  ngOnInit(): void {
    // Only allow access if logged in as admin
    if (!this.auth.isLoggedIn() || !this.auth.isAdmin()) {
      this.router.navigate(['/admin-login']);
      return;
    }

    this.loadRooms();
    this.loadBookings();

    // Initial selected view based on current route
    this.setViewFromUrl(this.router.url);
  }

  private setViewFromUrl(url: string) {
    if (url.includes('/admin/bookings')) {
      this.selectedView = 'bookings';
    } else if (url.includes('/admin/rooms')) {
      this.selectedView = 'view-rooms';
    } else {
      this.selectedView = 'new-room';
    }
  }

  private get authHeaders(): Record<string, string | string[]> | undefined {
    const token = localStorage.getItem('token');
    if (!token) {
      return undefined;
    }
    return { Authorization: `Bearer ${token}` };
  }

  // ---- Rooms CRUD ----

  loadRooms() {
    this.loadingRooms = true;
    this.http.get('http://localhost:8080/api/rooms', {
      headers: this.authHeaders
    }).subscribe({
      next: (data: any) => {
        this.rooms = data;
        this.loadingRooms = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load rooms.';
        this.loadingRooms = false;
      }
    });
  }

  editRoom(room: any) {
    // Open inline edit form in the "View All Rooms" tab
    this.editForm = { ...room };
    this.editingRoomId = room.id;
    this.message = '';
    this.error = '';
  }

  resetRoomForm() {
    this.roomForm = {
      id: undefined,
      name: '',
      description: '',
      pricePerNight: 0,
      capacity: 1,
      imageUrl: '',
      type: 'SINGLE'
    };
    this.uploadingImage = false;
    this.imageUploadError = '';

    // Also clear the file input control so the previous
    // filename is not shown after reset or successful submit
    if (this.roomImageInput) {
      this.roomImageInput.nativeElement.value = '';
    }
  }

  onRoomImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    this.uploadingImage = true;
    this.imageUploadError = '';

    this.imageUpload.uploadRoomImage(file).subscribe({
      next: (url) => {
        this.roomForm.imageUrl = url;
        this.uploadingImage = false;
      },
      error: (err) => {
        console.error(err);
        this.imageUploadError = 'Failed to upload image. Please try again.';
        this.uploadingImage = false;
      }
    });
  }

  cancelEditRoom() {
    this.editingRoomId = null;
  }

  saveRoom() {
    this.message = '';
    this.error = '';

    // Basic validation: prevent submit if required fields are empty or invalid
    if (!this.roomForm.name?.trim() ||
        this.roomForm.pricePerNight === null ||
        this.roomForm.pricePerNight === undefined ||
        this.roomForm.pricePerNight <= 0 ||
        this.roomForm.capacity === null ||
        this.roomForm.capacity === undefined ||
        this.roomForm.capacity < 1 ||
        !this.roomForm.type ||
        !this.roomForm.imageUrl) {
      this.error = 'Please fill in all required fields with valid values before submitting.';
      return;
    }

    const body = {
      name: this.roomForm.name,
      description: this.roomForm.description,
      pricePerNight: this.roomForm.pricePerNight,
      capacity: this.roomForm.capacity,
      imageUrl: this.roomForm.imageUrl,
      type: this.roomForm.type
    };

    if (this.roomForm.id) {
      // Update existing room
      this.http.put(`http://localhost:8080/api/rooms/${this.roomForm.id}`, body, {
        headers: this.authHeaders
      }).subscribe({
        next: () => {
          this.message = 'Room updated successfully.';
          this.resetRoomForm();
          this.loadRooms();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to update room.';
        }
      });
    } else {
      // Create new room
      this.http.post('http://localhost:8080/api/rooms', body, {
        headers: this.authHeaders
      }).subscribe({
        next: () => {
          this.message = 'Room added successfully.';
          this.resetRoomForm();
          this.loadRooms();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to add room.';
        }
      });
    }
  }

  updateRoomFromView() {
    if (!this.editForm.id) {
      return;
    }

    this.message = '';
    this.error = '';

    const body = {
      name: this.editForm.name,
      description: this.editForm.description,
      pricePerNight: this.editForm.pricePerNight,
      capacity: this.editForm.capacity,
      imageUrl: this.editForm.imageUrl,
      type: this.editForm.type
    };

    this.http.put(`http://localhost:8080/api/rooms/${this.editForm.id}`, body, {
      headers: this.authHeaders
    }).subscribe({
      next: () => {
        this.message = 'Room updated successfully.';
        this.editingRoomId = null;
        this.loadRooms();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to update room.';
      }
    });
  }

  deleteRoom(roomId: number) {
    if (!confirm('Are you sure you want to delete this room?')) {
      return;
    }

    this.message = '';
    this.error = '';

    this.http.delete(`http://localhost:8080/api/rooms/${roomId}`, {
      headers: this.authHeaders
    }).subscribe({
      next: () => {
        this.message = 'Room deleted successfully.';
        this.loadRooms();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to delete room.';
      }
    });
  }

  // ---- Bookings ----

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

  deleteBooking(bookingId: number) {
    // Show confirmation popup before cancelling
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
}
