package com.miniroom.room;

import com.miniroom.common.ApiException;
import java.time.Clock;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    private final LayoutValidator validator;
    private final Clock clock;
    private final Supplier<String> slugs;

    @Autowired
    public RoomService(RoomRepository rooms, LayoutValidator validator, Clock clock) {
        this(rooms, validator, clock, Slugs::next);
    }

    RoomService(RoomRepository rooms, LayoutValidator validator, Clock clock, Supplier<String> slugs) {
        this.rooms = rooms;
        this.validator = validator;
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

    /** Slugs are the only public room id. A malformed one is just not found. */
    @Transactional(readOnly = true)
    public Room bySlug(String slug) {
        return rooms.findBySlug(slug).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND", "no room " + slug));
    }

    /** Checks the whole layout against the room's own size, then replaces it. Nothing is saved on any error. */
    @Transactional
    public Room saveLayout(Long ownerId, String body) {
        Room room = ofOwner(ownerId);
        room.replaceLayout(validator.validate(body, room.getSize()), clock.instant());
        return room;
    }
}
