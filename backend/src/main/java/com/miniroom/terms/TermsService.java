package com.miniroom.terms;

import com.miniroom.common.ApiException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The terms in force, and the record of who agreed to which version. */
@Service
public class TermsService {

    /** kind: terms (이용약관) or privacy (개인정보처리방침). Shown inside signup, as plain text. */
    public record Terms(long id, String kind, int version, String title, String body, Instant effectiveAt) {}

    private final JdbcClient jdbc;
    private final Clock clock;

    public TermsService(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Newest version of each kind that is already in effect. */
    @Transactional(readOnly = true)
    public List<Terms> current() {
        return jdbc.sql("""
                        select distinct on (kind) id, kind, version, title, body, effective_at
                        from terms where effective_at <= :now
                        order by kind, version desc
                        """)
                .param("now", Timestamp.from(clock.instant()))
                .query((rs, i) -> new Terms(rs.getLong("id"), rs.getString("kind"), rs.getInt("version"),
                        rs.getString("title"), rs.getString("body"), rs.getTimestamp("effective_at").toInstant()))
                .list();
    }

    /**
     * Records agreement to exactly the versions in force, or 422 CONSENT_REQUIRED (one missing, or an old version:
     * the page was open while a new version took effect). Runs inside the signup transaction.
     */
    @Transactional
    public void agree(long userId, List<Long> termsIds) {
        var wanted = current().stream().map(Terms::id).collect(Collectors.toSet());
        if (termsIds == null || !new HashSet<>(termsIds).equals(wanted)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "CONSENT_REQUIRED",
                    "agree to every current terms version: " + wanted);
        }
        Timestamp now = Timestamp.from(clock.instant());
        for (long id : wanted) {
            jdbc.sql("""
                            insert into terms_agreements (user_id, terms_id, agreed_at) values (:userId, :termsId, :now)
                            on conflict (user_id, terms_id) do nothing
                            """)
                    .param("userId", userId).param("termsId", id).param("now", now)
                    .update();
        }
    }
}
