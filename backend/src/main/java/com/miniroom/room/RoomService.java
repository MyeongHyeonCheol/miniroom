package com.miniroom.room;

import java.time.Clock;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomService {

    /**
     * First room: the three pieces that exist so far, against the back wall (frontend DEFAULT_LAYOUT).
     * V4 backfills older accounts with the same JSON. A rug joins when one is modelled.
     */
    static final String DEFAULT_LAYOUT = """
            {"v":1,"floor":"wood","wall":"ivory","backdrop":"island","items":[\
            {"id":"bed","x":0,"y":0,"r":0},\
            {"id":"computer_desk","x":3,"y":0,"r":0},\
            {"id":"plant_pot","x":6,"y":0,"r":0}]}""";

    private static final int SLUG_ATTEMPTS = 5;

    private final RoomRepository rooms;
    private final Clock clock;
    private final Supplier<String> slugs;

    @Autowired
    public RoomService(RoomRepository rooms, Clock clock) {
        this(rooms, clock, Slugs::next);
    }

    RoomService(RoomRepository rooms, Clock clock, Supplier<String> slugs) {
        this.rooms = rooms;
        this.clock = clock;
        this.slugs = slugs;
    }

    /** The owner's room, made with the default layout if they don't have one yet. Safe under concurrent logins. */
    @Transactional
    public Room ensureFor(Long ownerId) {
        var existing = rooms.findByOwnerId(ownerId);
        if (existing.isPresent()) return existing.get();
        for (int i = 0; i < SLUG_ATTEMPTS; i++) {
            rooms.insertIfAbsent(slugs.get(), ownerId, DEFAULT_LAYOUT, clock.instant());
            // Made by us, or by a concurrent login of the same account. Empty means the slug was taken: retry.
            var room = rooms.findByOwnerId(ownerId);
            if (room.isPresent()) return room.get();
        }
        throw new IllegalStateException("no free room slug after " + SLUG_ATTEMPTS + " attempts");
    }

    @Transactional(readOnly = true)
    public Room ofOwner(Long ownerId) {
        return rooms.findByOwnerId(ownerId).orElseThrow();
    }
}
