export interface Room {
  id?: number;
  name: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  imageUrl: string;
  type: string;
  // Backend field variants (optional)
  image_url?: string;
  room_number?: number | string;
  price?: number;
}
