package com.miniroom.user;

import com.miniroom.common.ApiException;
import com.miniroom.metrics.EventLog;
import com.miniroom.room.Room;
import com.miniroom.room.RoomService;
import com.miniroom.terms.TermsService;
import java.time.Clock;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    /** What GET /api/me is built from. */
    public record Me(User user, Room room) {}

    /**
     * PATCH /api/me. ageConfirmed and agreedTermsIds (the ids from GET /api/terms) only count at first signup;
     * afterwards only the nickname changes.
     */
    public record Update(String nickname, Boolean ageConfirmed, List<Long> agreedTermsIds) {}

    private final UserRepository users;
    private final RoomService rooms;
    private final TermsService terms;
    private final EventLog events;
    private final Clock clock;

    public UserService(UserRepository users, RoomService rooms, TermsService terms, EventLog events, Clock clock) {
        this.users = users;
        this.rooms = rooms;
        this.terms = terms;
        this.events = events;
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

    /** userAgent: for the signup event's device (pc or mobile). */
    @Transactional
    public Me update(String googleSub, Update update, String userAgent) {
        User user = find(googleSub);
        String nickname = Nicknames.normalize(update.nickname());
        if (user.isSignedUp()) {
            user.rename(nickname);
        } else {
            if (!isTrue(update.ageConfirmed())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "CONSENT_REQUIRED", "ageConfirmed must be true");
            }
            terms.agree(user.getId(), update.agreedTermsIds());
            user.signUp(nickname, clock.instant());
            Room room = rooms.ofOwner(user.getId());
            events.signup(user.getId(), room.getId(), userAgent);
            return new Me(user, room);
        }
        return new Me(user, rooms.ofOwner(user.getId()));
    }

    /**
     * Deletes the account: its room, the guestbook entries it wrote and its terms agreements go with it
     * (on delete cascade); metrics events keep their counts with the user and room set to null.
     */
    @Transactional
    public void delete(String googleSub) {
        users.delete(find(googleSub));
    }

    /** The logged-in account, signed up or not. */
    @Transactional(readOnly = true)
    public User account(String googleSub) {
        return find(googleSub);
    }

    /** For writes that need a finished signup (docs/api.md "예(가입)"). */
    @Transactional(readOnly = true)
    public User requireSignedUp(String googleSub) {
        User user = find(googleSub);
        if (!user.isSignedUp()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SIGNUP_REQUIRED", "finish signup first");
        }
        return user;
    }

    /** The public name of a room owner; null until they sign up. */
    @Transactional(readOnly = true)
    public String nicknameOf(Long userId) {
        return users.findById(userId).map(User::getNickname).orElse(null);
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
