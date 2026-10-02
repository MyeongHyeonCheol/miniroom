package com.miniroom.user;

import com.miniroom.auth.SessionLimiter;
import com.miniroom.metrics.EventLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    /**
     * No email or Google name: public screens show the nickname only. mySlug exists from the first login (the room
     * is made then); needsSignup means the signup form over the room hasn't been finished.
     */
    public record MeResponse(String nickname, boolean needsSignup, String mySlug, int newGuestbookCount) {

        static MeResponse of(UserService.Me me) {
            // Guestbook arrives in week 4; until then there is nothing new to count
            return new MeResponse(me.user().getNickname(), !me.user().isSignedUp(), me.room().getSlug(), 0);
        }
    }

    private final UserService users;
    private final EventLog events;
    private final SessionLimiter sessions;

    public MeController(UserService users, EventLog events, SessionLimiter sessions) {
        this.users = users;
        this.events = events;
        this.sessions = sessions;
    }

    /** The OAuth2 principal's name is the Google "sub". The day's first call counts as session_start. */
    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal OAuth2User principal,
            @RequestHeader(name = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        UserService.Me me = users.me(principal.getName());
        events.sessionStartOncePerDay(me.user().getId(), userAgent);
        return MeResponse.of(me);
    }

    /** First signup (nickname + 14+ + terms + privacy), or a nickname change afterwards. */
    @PatchMapping("/api/me")
    public MeResponse update(@AuthenticationPrincipal OAuth2User principal, @RequestBody UserService.Update update,
            @RequestHeader(name = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return MeResponse.of(users.update(principal.getName(), update, userAgent));
    }

    /** Withdraw (also what an under-14 answer at signup does). Every session of the account ends. */
    @DeleteMapping("/api/me")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal OAuth2User principal, HttpServletRequest request) {
        users.delete(principal.getName());
        sessions.endAll(principal.getName());
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
}
