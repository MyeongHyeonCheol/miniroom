package com.miniroom.room;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByOwnerId(Long ownerId);

    Optional<Room> findBySlug(String slug);

    /**
     * 1 if the room was made, 0 if it wasn't: the owner already has one (also a concurrent first login) or the
     * slug is taken. No exception either way, so the surrounding login transaction stays usable for a retry.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(nativeQuery = true, value = """
            insert into rooms (slug, owner_id, layout, created_at, updated_at)
            values (:slug, :ownerId, cast(:layout as jsonb), :now, :now)
            on conflict do nothing
            """)
    int insertIfAbsent(@Param("slug") String slug, @Param("ownerId") Long ownerId, @Param("layout") String layout,
            @Param("now") Instant now);
}
