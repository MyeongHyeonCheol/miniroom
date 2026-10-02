package com.miniroom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
import com.miniroom.user.UserService;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class SingleLoginIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    FindByIndexNameSessionRepository<? extends Session> sessions;

    @Autowired
    SessionLimiter limiter;

    @Autowired
    UserService users;

    @BeforeEach
    void clean() {
        jdbc.update("delete from spring_session");
        jdbc.update("delete from users");
        // /api/me reads the account row and its room, which the real login makes
        users.recordLogin("s1", "s1@example.com");
        users.recordLogin("s2", "s2@example.com");
    }

    /** A stored session logged in as the given Google account, as the real login flow leaves it. */
    private String loggedInSession(String sub) {
        return save(sessions, sub);
    }

    private <S extends Session> String save(FindByIndexNameSessionRepository<S> repo, String sub) {
        var authorities = List.of(new SimpleGrantedAuthority("OAUTH2_USER"));
        var user = new DefaultOAuth2User(authorities, Map.of("sub", sub, "email", sub + "@example.com"), "sub");
        S session = repo.createSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT",
                new SecurityContextImpl(new OAuth2AuthenticationToken(user, authorities, "google")));
        session.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, sub);
        repo.save(session);
        return session.getId();
    }

    private static Cookie cookie(String sessionId) {
        return new Cookie("SESSION", Base64.getEncoder().encodeToString(sessionId.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void keepOnlyLeavesCurrentSessionAlone() throws Exception {
        loggedInSession("s1");
        String current = loggedInSession("s1");

        limiter.keepOnly("s1", current);

        mvc.perform(get("/api/me").cookie(cookie(current)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mySlug").isNotEmpty());
    }

    /**
     * Logging in again in a browser that is already logged in as the same account: Spring rotates the session id
     * in memory, but the row still has the old id when the success handler runs, so it shows up as "another" session.
     */
    @Test
    void reLoginInTheSameBrowserKeepsThatBrowserLoggedIn() throws Exception {
        String oldId = loggedInSession("s1");
        String newId = reLogin(sessions, oldId);

        mvc.perform(get("/api/me").cookie(cookie(newId))).andExpect(status().isOk());
    }

    private <S extends Session> String reLogin(FindByIndexNameSessionRepository<S> repo, String oldId) {
        S session = repo.findById(oldId);
        String newId = session.changeSessionId();      // what Spring does at login, not saved yet
        limiter.keepOnly("s1", newId);                // success handler runs before the request ends
        repo.save(session);                           // end of request: row gets the new id
        return newId;
    }

    @Test
    void olderSessionGets401Replaced() throws Exception {
        String old = loggedInSession("s1");
        String current = loggedInSession("s1");

        limiter.keepOnly("s1", current);

        mvc.perform(get("/api/me").cookie(cookie(old)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REPLACED"));
        assertThat(sessions.findById(old)).isNull();
    }

    @Test
    void otherAccountsAreUntouched() throws Exception {
        String other = loggedInSession("s2");
        String current = loggedInSession("s1");

        limiter.keepOnly("s1", current);

        mvc.perform(get("/api/me").cookie(cookie(other))).andExpect(status().isOk());
    }

    @Test
    void replacedSessionIsInvalidatedOnAnyPath() throws Exception {
        String old = loggedInSession("s1");
        limiter.keepOnly("s1", loggedInSession("s1"));

        mvc.perform(get("/oauth2/authorization/google").cookie(cookie(old)))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", containsString("accounts.google.com")));
        assertThat(sessions.findById(old)).isNull();
    }
}
