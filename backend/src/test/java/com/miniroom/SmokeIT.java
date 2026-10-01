package com.miniroom;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@IntegrationTest
class SmokeIT {

    @Autowired
    JdbcTemplate jdbc;

    @Test
    void runsInTheIsolatedItSchemaWithMigrationsApplied() {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).isEqualTo("it");
        assertThat(jdbc.queryForObject("select count(*) from it.users", Integer.class)).isNotNull();
    }
}
