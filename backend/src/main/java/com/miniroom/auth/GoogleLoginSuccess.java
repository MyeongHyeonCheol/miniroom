package com.miniroom.auth;

import com.miniroom.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/** After Google login: upsert the user, end the account's other sessions, then back to the frontend. */
@Component
public class GoogleLoginSuccess implements AuthenticationSuccessHandler {

    private final UserService users;
    private final SessionLimiter sessionLimiter;
    private final String frontendUrl;

    public GoogleLoginSuccess(UserService users, SessionLimiter sessionLimiter,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.users = users;
        this.sessionLimiter = sessionLimiter;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        var principal = (OAuth2User) authentication.getPrincipal();
        users.recordLogin(principal.getAttribute("sub"), principal.getAttribute("email"));
        // One login per account: the session id here is the new one (Spring rotates it at login)
        sessionLimiter.keepOnly(authentication.getName(), request.getSession().getId());
        response.sendRedirect(frontendUrl);
    }
}
