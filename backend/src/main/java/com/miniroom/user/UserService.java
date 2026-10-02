package com.miniroom.user;

import com.miniroom.common.ApiException;
import com.miniroom.room.Room;
import com.miniroom.room.RoomService;
import java.time.Clock;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    /** What GET /api/me is built from. */
    public record Me(User user, Room room) {}

    /** PATCH /api/me. Consents only count at first signup; afterwards only the nickname changes. */
    public record Update(String nickname, Boolean ageConfirmed, Boolean termsAgreed, Boolean privacyAgreed) {}

    private final UserRepository users;
    private final RoomService rooms;
    private final Clock clock;

    public UserService(UserRepository users, RoomService rooms, Clock clock) {
        this.users = users;
        this.rooms = rooms;
        this.clock = clock;
    }

    /**
     * Called after every successful Google login. One row per Google account, safe under concurrent logins.
     * The room is made here, at first login, so the user lands in it right away and signs up over it.
     */
    @Transactional
    public User recordLogin(String googleSub, String email) {
        users.upsertLogin(googleSub, email, clock.instant());
        User user = users.findByGoogleSub(googleSub).orElseThrow();
        rooms.ensureFor(user.getId());
        return user;
    }

    @Transactional(readOnly = true)
    public Me me(String googleSub) {
        User user = find(googleSub);
        return new Me(user, rooms.ofOwner(user.getId()));
    }

    @Transactional
    public Me update(String googleSub, Update update) {
        User user = find(googleSub);
        String nickname = Nicknames.normalize(update.nickname());
        if (user.isSignedUp()) {
            user.rename(nickname);
        } else {
            if (!isTrue(update.ageConfirmed()) || !isTrue(update.termsAgreed()) || !isTrue(update.privacyAgreed())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "CONSENT_REQUIRED",
                        "ageConfirmed, termsAgreed and privacyAgreed must all be true");
            }
            user.signUp(nickname, clock.instant());
        }
        return new Me(user, rooms.ofOwner(user.getId()));
    }

    /** A live session whose account row is gone (deleted account): treat as logged out. */
    private User find(String googleSub) {
        return users.findByGoogleSub(googleSub).orElseThrow(
                () -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "account not found"));
    }

    private static boolean isTrue(Boolean b) {
        return Boolean.TRUE.equals(b);
    }
}
