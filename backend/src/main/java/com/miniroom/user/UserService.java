package com.miniroom.user;

import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final Clock clock;

    public UserService(UserRepository users, Clock clock) {
        this.users = users;
        this.clock = clock;
    }

    /** Called after every successful Google login. One row per Google account (google_sub is unique). */
    @Transactional
    public User recordLogin(String googleSub, String email) {
        var now = clock.instant();
        return users.findByGoogleSub(googleSub)
                .map(user -> {
                    user.recordLogin(email, now);
                    return user;
                })
                .orElseGet(() -> users.save(new User(googleSub, email, now)));
    }
}
