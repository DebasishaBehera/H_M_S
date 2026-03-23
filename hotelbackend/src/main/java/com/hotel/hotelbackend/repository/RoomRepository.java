package com.hotel.hotelbackend.repository;

import com.hotel.hotelbackend.model.Room;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {

    @Query("""
    SELECT r FROM Room r
    WHERE r.id NOT IN (
        SELECT b.room.id FROM Booking b
        WHERE b.checkInDate < :checkOut
        AND b.checkOutDate > :checkIn
    )
    """)
    List<Room> findAvailableRooms(
            @Param("checkIn") String checkIn,
            @Param("checkOut") String checkOut
    );
}