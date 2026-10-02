package com.miniroom.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.miniroom.IntegrationTest;
import java.time.Clock;
import java.util.ArrayDeque;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

@IntegrationTest
class RoomServiceIT {

    @Autowired
    RoomRepository repo;

    @Autowired
    LayoutValidator validator;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    TransactionTemplate tx;

    @BeforeEach
    void clean() {
        jdbc.update("delete from users");
    }

    private long user(String sub) {
        return jdbc.queryForObject("insert into users (google_sub, email) values (?, ?) returning id", Long.class,
                sub, sub + "@example.com");
    }

    /** RoomService with the given slugs in order instead of random ones. Not a Spring bean, so callers open the transaction. */
    private RoomService withSlugs(String... slugs) {
        var queue = new ArrayDeque<>(List.of(slugs));
        return new RoomService(repo, validator, Clock.systemUTC(), queue::remove);
    }

    @Test
    void takenSlugIsRetriedWithANewOneInTheSameTransaction() {
        long first = user("first");
        tx.execute(s -> withSlugs("aaaaaaaa").ensureFor(first));
        long second = user("second");

        Room room = tx.execute(s -> withSlugs("aaaaaaaa", "bbbbbbbb").ensureFor(second));

        assertThat(room.getSlug()).isEqualTo("bbbbbbbb");
        assertThat(room.getOwnerId()).isEqualTo(second);
    }

    @Test
    void givesUpAfterFiveTakenSlugs() {
        long first = user("first");
        tx.execute(s -> withSlugs("aaaaaaaa").ensureFor(first));
        long second = user("second");
        var always = withSlugs("aaaaaaaa", "aaaaaaaa", "aaaaaaaa", "aaaaaaaa", "aaaaaaaa", "unused00");

        assertThatThrownBy(() -> tx.execute(s -> always.ensureFor(second))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void databaseRejectsAnOversizedLayout() {
        long owner = user("big");
        String huge = "{\"v\":1,\"pad\":\"" + "x".repeat(10_300) + "\"}";

        assertThatThrownBy(() -> jdbc.update(
                "insert into rooms (slug, owner_id, layout) values ('cccccccc', ?, cast(? as jsonb))", owner, huge))
                .hasMessageContaining("rooms_layout_check");
    }
}
