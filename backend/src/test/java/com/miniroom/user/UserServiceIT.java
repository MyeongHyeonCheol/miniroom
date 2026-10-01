package com.miniroom.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.miniroom.IntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

@IntegrationTest
class UserServiceIT {

    @Autowired
    UserService users;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void clean() {
        jdbc.update("delete from users");
    }

    private int rows(String sub) {
        return jdbc.queryForObject("select count(*) from users where google_sub = ?", Integer.class, sub);
    }

    @Test
    void firstLoginCreatesUser() {
        User user = users.recordLogin("sub-1", "a@example.com");

        assertThat(user.getId()).isNotNull();
        assertThat(user.getEmail()).isEqualTo("a@example.com");
        assertThat(rows("sub-1")).isEqualTo(1);
    }

    @Test
    void repeatLoginUpdatesEmailAndKeepsOneRow() {
        User first = users.recordLogin("sub-1", "old@example.com");
        User again = users.recordLogin("sub-1", "new@example.com");

        assertThat(again.getId()).isEqualTo(first.getId());
        assertThat(again.getEmail()).isEqualTo("new@example.com");
        assertThat(again.getCreatedAt()).isEqualTo(first.getCreatedAt());
        assertThat(again.getLastLoginAt()).isAfterOrEqualTo(first.getLastLoginAt());
        assertThat(rows("sub-1")).isEqualTo(1);
    }

    @Test
    void concurrentFirstLoginsMakeOneRow() throws Exception {
        int n = 10;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<User>> results = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            results.add(pool.submit(() -> {
                start.await();
                return users.recordLogin("sub-race", "race@example.com");
            }));
        }
        start.countDown();
        for (Future<User> r : results) {
            assertThat(r.get().getGoogleSub()).isEqualTo("sub-race"); // throws if any login failed
        }
        pool.shutdown();
        assertThat(rows("sub-race")).isEqualTo(1);
    }
}
