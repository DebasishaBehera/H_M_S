package com.hotel.hotelbackend.controller;

import com.hotel.hotelbackend.model.Room;
import com.hotel.hotelbackend.repository.RoomRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "http://localhost:4200")
public class RoomController {

    private final RoomRepository roomRepository;

    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    // ✅ Get all rooms
    @GetMapping
    public List<Room> getAll() {
        return roomRepository.findAll();
    }

    // ✅ Get room by ID (IMPORTANT FOR BOOK PAGE)
    @GetMapping("/{id}")
    public Room getRoomById(@PathVariable Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));
    }
    
    @PutMapping("/{id}")
    public Room updateRoom(@PathVariable Long id, @RequestBody Room updatedRoom) {

        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        room.setName(updatedRoom.getName());
        room.setDescription(updatedRoom.getDescription());
        room.setPricePerNight(updatedRoom.getPricePerNight());
        room.setCapacity(updatedRoom.getCapacity());
        room.setImageUrl(updatedRoom.getImageUrl());
        room.setType(updatedRoom.getType());   // ⭐ IMPORTANT

        return roomRepository.save(room);
    }

    // ✅ Create room
    @PostMapping
    public Room create(@RequestBody Room room) {
        return roomRepository.save(room);
    }

    // ✅ Delete room
    @DeleteMapping("/{id}")
    public void deleteRoom(@PathVariable Long id) {
        roomRepository.deleteById(id);
    }
    @GetMapping("/available")
    public List<Room> getAvailableRooms(
            @RequestParam String checkIn,
            @RequestParam String checkOut
    ) {
        return roomRepository.findAvailableRooms(checkIn, checkOut);
    }
}