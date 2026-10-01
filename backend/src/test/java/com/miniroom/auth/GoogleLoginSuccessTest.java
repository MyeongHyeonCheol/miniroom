package com.miniroom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.miniroom.user.UserService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

class GoogleLoginSuccessTest {

    private final UserService users = mock(UserService.class);
    private final SessionLimiter limiter = mock(SessionLimiter.class);
    private final GoogleLoginSuccess handler = new GoogleLoginSuccess(users, limiter, "http://localhost:5173");

    @Test
    void recordsTheUserEndsOtherSessionsAndReturnsToFrontend() throws Exception {
        var authorities = List.of(new SimpleGrantedAuthority("OAUTH2_USER"));
        var user = new DefaultOAuth2User(authorities, Map.of("sub", "s1", "email", "me@example.com"), "sub");
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        String sessionId = request.getSession(true).getId();

        handler.onAuthenticationSuccess(request, response, new OAuth2AuthenticationToken(user, authorities, "google"));

        verify(users).recordLogin("s1", "me@example.com");
        verify(limiter).keepOnly("s1", sessionId);
        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173");
    }
}
