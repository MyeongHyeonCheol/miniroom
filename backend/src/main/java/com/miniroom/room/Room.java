package com.miniroom.room;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A user's room. Rows are created by {@link RoomRepository#insertIfAbsent}, never through this entity. */
@Entity
@Table(name = "rooms")
public class Room {

    @Id
    private Long id;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, unique = true, length = 8)
    private String slug;

    @Column(name = "owner_id", nullable = false, unique = true)
    private Long ownerId;

    @Column(nullable = false)
    private short size;

    /** Layout JSON as stored ({ v, floor, wall, backdrop, items }). Parsed and validated when saving lands. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String layout;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Room() {}

    /** Piece limit (wall decor included) for each room side. AGENTS.md "3D 방과 가구 규칙". */
    private static final Map<Integer, Integer> PIECE_LIMITS = Map.of(12, 45, 16, 60, 20, 90, 24, 120);

    static int pieceLimitFor(int size) {
        Integer limit = PIECE_LIMITS.get(size);
        if (limit == null) throw new IllegalArgumentException("no room size " + size);
        return limit;
    }

    public int pieceLimit() { return pieceLimitFor(size); }

    /** Wall decor slots on each of the two walls. */
    public int wallSlotsPerWall() { return size / 4; }

    /** layout: already checked and rebuilt by {@link LayoutValidator}. */
    void replaceLayout(String layout, Instant now) {
        this.layout = layout;
        this.updatedAt = now;
    }

    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public Long getOwnerId() { return ownerId; }
    public int getSize() { return size; }
    public String getLayout() { return layout; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
