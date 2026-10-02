package com.miniroom.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
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

/** DELETE /api/me with real stored sessions, the way a logged-in browser sends it. */
@IntegrationTest
class AccountDeletionIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    UserService users;

    @Autowired
    FindByIndexNameSessionRepository<? extends Session> sessions;

    @BeforeEach
    void clean() {
        jdbc.update("delete from spring_session");
        jdbc.update("delete from users");
        users.recordLogin("me", "me@example.com");
        users.recordLogin("other", "other@example.com");
    }

    private String loggedInSession(String sub) {
        return save(sessions, sub);
    }

    private <S extends Session> String save(FindByIndexNameSessionRepository<S> repo, String sub) {
        var authorities = List.of(new SimpleGrantedAuthority("OAUTH2_USER"));
        var user = new DefaultOAuth2User(authorities, Map.of("sub", sub), "sub");
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
    void deletesTheAccountAndEndsEverySessionOfIt() throws Exception {
        String here = loggedInSession("me");
        String elsewhere = loggedInSession("me");
        String otherAccount = loggedInSession("other");

        mvc.perform(delete("/api/me").cookie(cookie(here)).with(csrf())).andExpect(status().isNoContent());

        assertThat(jdbc.queryForObject("select count(*) from users where google_sub = 'me'", Integer.class)).isZero();
        assertThat(sessions.findById(here)).isNull();
        assertThat(sessions.findById(elsewhere)).isNull();
        mvc.perform(get("/api/me").cookie(cookie(elsewhere)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/me").cookie(cookie(otherAccount))).andExpect(status().isOk());
    }

    @Test
    void needsCsrf() throws Exception {
        String here = loggedInSession("me");

        mvc.perform(delete("/api/me").cookie(cookie(here)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF"));
        assertThat(jdbc.queryForObject("select count(*) from users where google_sub = 'me'", Integer.class)).isEqualTo(1);
    }
}
