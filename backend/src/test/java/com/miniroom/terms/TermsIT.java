package com.miniroom.terms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

@IntegrationTest
class TermsIT {

    @Autowired
    JdbcClient jdbcClient;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    TransactionTemplate tx;

    @Autowired
    MockMvc mvc;

    @AfterEach
    void removeTestVersion() {
        jdbc.update("delete from users");
        jdbc.update("delete from terms where version = 90");
    }

    private void seed(String dir) {
        new TermsSeeder(jdbcClient, tx, dir).afterPropertiesSet();
    }

    private String body() {
        return jdbc.queryForObject("select body from terms where kind = 'terms' and version = 90", String.class);
    }

    @Test
    void theRealTextsAreSeededAtStartup() throws Exception {
        mvc.perform(get("/api/terms")) // no login
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[*].kind", Matchers.containsInAnyOrder("terms", "privacy")))
                .andExpect(jsonPath("$[?(@.kind == 'terms')].title").value("이용약관"))
                .andExpect(jsonPath("$[?(@.kind == 'privacy')].body").value(Matchers.hasItem(Matchers.containsString("만 14세"))))
                .andExpect(jsonPath("$[0].effectiveAt").value(Matchers.endsWith("+09:00")));
    }

    @Test
    void aDraftNobodyAgreedToFollowsItsFile() {
        seed("test-terms-a");
        assertThat(body()).isEqualTo("시험 본문 A");

        seed("test-terms-b");
        assertThat(body()).isEqualTo("시험 본문 B");
    }

    @Test
    void anAgreedVersionCannotBeEditedAndStopsStartup() {
        seed("test-terms-a");
        long userId = jdbc.queryForObject("insert into users (google_sub, email) values ('t', 't@example.com') returning id",
                Long.class);
        jdbc.update("insert into terms_agreements (user_id, terms_id, agreed_at) "
                + "select ?, id, now() from terms where version = 90", userId);

        assertThatThrownBy(() -> seed("test-terms-b"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("new version");
        assertThat(body()).isEqualTo("시험 본문 A");
    }

    @Test
    void seedingTwiceChangesNothing() {
        seed("test-terms-a");
        seed("test-terms-a");

        assertThat(jdbc.queryForObject("select count(*) from terms where version = 90", Integer.class)).isEqualTo(1);
    }
}
