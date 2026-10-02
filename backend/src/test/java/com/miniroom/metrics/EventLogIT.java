package com.miniroom.metrics;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
import com.miniroom.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class EventLogIT {

    private static final String IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148";

    @Autowired
    UserService users;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    JdbcClient jdbcClient;

    @Autowired
    MockMvc mvc;

    long userId;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from events");
        jdbc.update("delete from users");
        userId = users.recordLogin("sub-1", "a@example.com").getId();
    }

    private int count(String type) {
        return jdbc.queryForObject("select count(*) from events where type = ?", Integer.class, type);
    }

    private EventLog at(String instant) {
        return new EventLog(jdbcClient, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
    }

    @Test
    void sessionStartIsOncePerKstDay() {
        at("2026-10-02T00:30:00Z").sessionStartOncePerDay(userId, null);  // 09:30 KST
        at("2026-10-02T14:59:59Z").sessionStartOncePerDay(userId, null);  // 23:59:59 KST, same day
        assertThat(count("session_start")).isEqualTo(1);

        at("2026-10-02T15:00:00Z").sessionStartOncePerDay(userId, null);  // 00:00 KST the next day (UTC still the 2nd)
        assertThat(count("session_start")).isEqualTo(2);
    }

    @Test
    void getMeRecordsSessionStartOnceAcrossManyCalls() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/me").with(oauth2Login().attributes(a -> a.put("sub", "sub-1"))))
                    .andExpect(status().isOk());
        }

        assertThat(count("session_start")).isEqualTo(1);
    }

    @Test
    void firstSignupRecordsOneSignupWithRoomAndDevice() {
        users.update("sub-1", new UserService.Update("명현", true, true, true), IPHONE);
        users.update("sub-1", new UserService.Update("새이름", null, null, null), IPHONE);  // rename: no event

        Map<String, Object> row = jdbc.queryForMap("select user_id, room_id, device from events where type = 'signup'");
        assertThat(count("signup")).isEqualTo(1);
        assertThat(row.get("user_id")).isEqualTo(userId);
        assertThat(row.get("room_id")).isEqualTo(users.me("sub-1").room().getId());
        assertThat(row.get("device")).isEqualTo("mobile");
    }

    @Test
    void aRejectedSignupRecordsNothing() {
        assertThatThrownBy(() -> users.update("sub-1", new UserService.Update("명현", true, false, true), null));

        assertThat(count("signup")).isZero();
    }

    @Test
    void deletingTheAccountKeepsTheEventWithoutTheUser() {
        users.update("sub-1", new UserService.Update("명현", true, true, true), null);

        jdbc.update("delete from users where id = ?", userId);

        assertThat(count("signup")).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from events where user_id is not null or room_id is not null",
                Integer.class)).isZero();
    }
}
