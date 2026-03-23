package com.hotel.hotelbackend.controller;

import com.hotel.hotelbackend.model.User;
import com.hotel.hotelbackend.model.Role;
import com.hotel.hotelbackend.repository.UserRepository;
import com.hotel.hotelbackend.security.JwtUtil;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // Constructor Injection
    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    // ======================
    // ✅ SIGNUP (Always USER)
    // ======================
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {

        System.out.println("Signup request: " + user.getEmail());

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("User already exists");
        }

        user.setRole(Role.USER);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "User registered successfully"));
    }

    // ======================
    // ✅ USER LOGIN (Only USER allowed)
    // ======================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(request.getPassword())) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid credentials");
        }

        // ❌ Admin cannot login from user page
        if (user.getRole() != Role.USER) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("Access denied. User login only.");
        }

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", user.getRole().name()
        ));
    }


    // ======================
    // ✅ ADMIN LOGIN (Only ADMIN allowed)
    // ======================
    @PostMapping("/admin-login")
    public ResponseEntity<?> adminLogin(@RequestBody User request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(request.getPassword())) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid credentials");
        }

        // ❌ User cannot login to admin panel
        if (user.getRole() != Role.ADMIN) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("Access denied. Admin only.");
        }

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name()
        );

        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", user.getRole().name()
        ));
    }
}