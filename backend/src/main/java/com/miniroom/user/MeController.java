package com.miniroom.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    public record MeResponse(String email) {}

    /** Stage 1: email only, to prove login works. Stage 3 replaces this with nickname and room slug. */
    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal OAuth2User user) {
        return new MeResponse(user.getAttribute("email"));
    }
}
