package com.miniroom.metrics;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Events the server records itself (docs/api.md "지표"): signup at the first PATCH /api/me, session_start at a
 * user's first GET /api/me of the KST day. share_open and the frontend's POST /api/events come with week 4.
 */
@Component
public class EventLog {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final JdbcClient jdbc;
    private final Clock clock;

    public EventLog(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Joins the signup transaction, so a failed signup leaves no event. */
    @Transactional
    public void signup(Long userId, Long roomId, String userAgent) {
        insert("signup", userId, roomId, userAgent);
    }

    /**
     * Once per user per KST day. Two requests racing at the very first call can both insert; retention and
     * daily-active counts use distinct users, so a rare duplicate doesn't change them.
     */
    @Transactional
    public void sessionStartOncePerDay(Long userId, String userAgent) {
        Instant dayStart = LocalDate.now(clock.withZone(KST)).atStartOfDay(KST).toInstant();
        boolean already = jdbc.sql("""
                        select exists (select 1 from events
                                       where user_id = :userId and type = 'session_start' and created_at >= :dayStart)
                        """)
                .param("userId", userId).param("dayStart", Timestamp.from(dayStart))
                .query(Boolean.class).single();
        if (!already) insert("session_start", userId, null, userAgent);
    }

    private void insert(String type, Long userId, Long roomId, String userAgent) {
        jdbc.sql("""
                        insert into events (type, user_id, room_id, device, created_at)
                        values (:type, :userId, :roomId, :device, :now)
                        """)
                .param("type", type).param("userId", userId).param("roomId", roomId)
                .param("device", Devices.of(userAgent)).param("now", Timestamp.from(clock.instant()))
                .update();
    }
}
