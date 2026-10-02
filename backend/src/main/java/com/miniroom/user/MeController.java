package com.miniroom.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    public MeController(UserService users) {
        this.users = users;
    }

    /** The OAuth2 principal's name is the Google "sub". */
    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal OAuth2User principal) {
        return MeResponse.of(users.me(principal.getName()));
    }

    /** First signup (nickname + 14+ + terms + privacy), or a nickname change afterwards. */
    @PatchMapping("/api/me")
    public MeResponse update(@AuthenticationPrincipal OAuth2User principal, @RequestBody UserService.Update update) {
        return MeResponse.of(users.update(principal.getName(), update));
    }
}
