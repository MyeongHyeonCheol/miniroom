package com.miniroom.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A Google account that has logged in. Keyed by Google's stable subject id, not the email. */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_sub", nullable = false, unique = true, length = 64)
    private String googleSub;

    @Column(nullable = false, length = 320)
    private String email;

    /**
     * Null until signup. Set together with ageConfirmedAt (database check users_signup_complete). Which terms
     * versions were agreed to, and when, are rows in terms_agreements.
     */
    @Column(length = 12)
    private String nickname;

    @Column(name = "age_confirmed_at")
    private Instant ageConfirmedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at", nullable = false)
    private Instant lastLoginAt;

    protected User() {}

    public User(String googleSub, String email, Instant now) {
        this.googleSub = googleSub;
        this.email = email;
        this.createdAt = now;
        this.lastLoginAt = now;
    }

    /** Email can change on the Google side; keep the latest one. */
    public void recordLogin(String email, Instant now) {
        this.email = email;
        this.lastLoginAt = now;
    }

    public boolean isSignedUp() { return nickname != null; }

    /** First signup: nickname and the 14+ confirmation at once. */
    public void signUp(String nickname, Instant now) {
        this.nickname = nickname;
        this.ageConfirmedAt = now;
    }

    public void rename(String nickname) {
        this.nickname = nickname;
    }

    public Long getId() { return id; }
    public String getGoogleSub() { return googleSub; }
    public String getEmail() { return email; }
    public String getNickname() { return nickname; }
    public Instant getAgeConfirmedAt() { return ageConfirmedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
}
