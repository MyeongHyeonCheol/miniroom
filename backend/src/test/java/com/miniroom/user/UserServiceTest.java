package com.miniroom.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class UserServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-01T00:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-02T00:00:00Z");

    private final UserRepository repo = mock(UserRepository.class);

    private UserService serviceAt(Instant now) {
        return new UserService(repo, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void firstLoginCreatesUser() {
        when(repo.findByGoogleSub("sub-1")).thenReturn(Optional.empty());
        when(repo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User user = serviceAt(T0).recordLogin("sub-1", "a@example.com");

        verify(repo).save(any(User.class));
        assertThat(user.getGoogleSub()).isEqualTo("sub-1");
        assertThat(user.getEmail()).isEqualTo("a@example.com");
        assertThat(user.getCreatedAt()).isEqualTo(T0);
        assertThat(user.getLastLoginAt()).isEqualTo(T0);
    }

    @Test
    void repeatLoginUpdatesSameUserInsteadOfCreatingAnother() {
        User existing = new User("sub-1", "old@example.com", T0);
        when(repo.findByGoogleSub("sub-1")).thenReturn(Optional.of(existing));

        User user = serviceAt(T1).recordLogin("sub-1", "new@example.com");

        verify(repo, never()).save(any(User.class));
        assertThat(user).isSameAs(existing);
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getCreatedAt()).isEqualTo(T0);
        assertThat(user.getLastLoginAt()).isEqualTo(T1);
    }
}
