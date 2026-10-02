package com.miniroom.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.miniroom.IntegrationTest;
import com.miniroom.common.ApiException;
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
        jdbc.update("delete from users"); // rooms go with them (on delete cascade)
    }

    private int rows(String sub) {
        return jdbc.queryForObject("select count(*) from users where google_sub = ?", Integer.class, sub);
    }

    private int rooms(String sub) {
        return jdbc.queryForObject(
                "select count(*) from rooms r join users u on u.id = r.owner_id where u.google_sub = ?", Integer.class, sub);
    }

    private static UserService.Update signup(String nickname) {
        return new UserService.Update(nickname, true, true, true);
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
    void concurrentFirstLoginsMakeOneRowAndOneRoom() throws Exception {
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
        assertThat(rooms("sub-race")).isEqualTo(1);
    }

    @Test
    void firstLoginMakesTheRoomWithDefaultLayoutBeforeSignup() {
        users.recordLogin("sub-1", "a@example.com");

        UserService.Me me = users.me("sub-1");

        assertThat(me.user().isSignedUp()).isFalse();
        assertThat(me.room().getSlug()).matches("[a-z0-9]{8}");
        assertThat(me.room().getSize()).isEqualTo(12);
        assertThat(me.room().getLayout()).contains("\"bed\"").contains("\"computer_desk\"").contains("\"plant_pot\"");
    }

    @Test
    void repeatLoginKeepsTheSameRoom() {
        users.recordLogin("sub-1", "a@example.com");
        String slug = users.me("sub-1").room().getSlug();

        users.recordLogin("sub-1", "a@example.com");

        assertThat(users.me("sub-1").room().getSlug()).isEqualTo(slug);
        assertThat(rooms("sub-1")).isEqualTo(1);
    }

    @Test
    void signupStoresTrimmedNicknameAndAllConsentTimes() {
        users.recordLogin("sub-1", "a@example.com");

        users.update("sub-1", signup("  명현 "), null);

        User user = users.me("sub-1").user();
        assertThat(user.getNickname()).isEqualTo("명현");
        assertThat(user.getAgeConfirmedAt()).isNotNull();
        assertThat(user.getTermsAgreedAt()).isNotNull();
        assertThat(user.getPrivacyAgreedAt()).isNotNull();
    }

    @Test
    void signupWithoutEveryConsentIsRejectedAndSavesNothing() {
        users.recordLogin("sub-1", "a@example.com");

        assertThatThrownBy(() -> users.update("sub-1", new UserService.Update("명현", true, true, false), null))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("CONSENT_REQUIRED"));
        assertThatThrownBy(() -> users.update("sub-1", new UserService.Update("명현", null, true, true), null))
                .isInstanceOf(ApiException.class);
        assertThat(users.me("sub-1").user().isSignedUp()).isFalse();
    }

    @Test
    void afterSignupOnlyTheNicknameChangesAndConsentsAreIgnored() {
        users.recordLogin("sub-1", "a@example.com");
        users.update("sub-1", signup("명현"), null);
        var agreedAt = users.me("sub-1").user().getTermsAgreedAt();

        users.update("sub-1", new UserService.Update("새닉네임", false, false, false), null);

        User user = users.me("sub-1").user();
        assertThat(user.getNickname()).isEqualTo("새닉네임");
        assertThat(user.getTermsAgreedAt()).isEqualTo(agreedAt);
    }

    @Test
    void databaseRefusesANicknameWithoutConsent() {
        users.recordLogin("sub-1", "a@example.com");

        assertThatThrownBy(() -> jdbc.update("update users set nickname = '몰래' where google_sub = 'sub-1'"))
                .hasMessageContaining("users_signup_complete");
    }

    @Test
    void unknownAccountIs401() {
        assertThatThrownBy(() -> users.me("nobody"))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("UNAUTHORIZED"));
    }
}
