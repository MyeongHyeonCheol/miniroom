package com.miniroom.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class SessionIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void clean() {
        jdbc.update("delete from spring_session");
    }

    private int sessions() {
        return jdbc.queryForObject("select count(*) from spring_session", Integer.class);
    }

    @Test
    void sessionsLiveInPostgresWithSevenDayIdleTimeout() throws Exception {
        // Starting a Google login stores the authorization request in the session
        mvc.perform(get("/oauth2/authorization/google")).andExpect(status().is3xxRedirection());

        assertThat(sessions()).isEqualTo(1);
        assertThat(jdbc.queryForObject("select max_inactive_interval from spring_session", Integer.class))
                .isEqualTo(7 * 24 * 60 * 60);
    }

    @Test
    void anonymousApiCallCreatesNoSession() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());

        assertThat(sessions()).isZero();
    }
}
