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

    /** Called after every successful Google login. One row per Google account, safe under concurrent logins. */
    @Transactional
    public User recordLogin(String googleSub, String email) {
        users.upsertLogin(googleSub, email, clock.instant());
        return users.findByGoogleSub(googleSub).orElseThrow();
    }
}
