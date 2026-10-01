package com.miniroom.user;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByGoogleSub(String googleSub);

    /** Insert or refresh in one statement, so two simultaneous first logins can't both insert. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(nativeQuery = true, value = """
            insert into users (google_sub, email, created_at, last_login_at)
            values (:sub, :email, :now, :now)
            on conflict (google_sub) do update
              set email = excluded.email, last_login_at = excluded.last_login_at
            """)
    void upsertLogin(@Param("sub") String googleSub, @Param("email") String email, @Param("now") Instant now);
}
