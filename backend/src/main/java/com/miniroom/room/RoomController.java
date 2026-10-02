package com.miniroom.room;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.miniroom.user.User;
import com.miniroom.user.UserService;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RoomController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    /** docs/api.md GET /api/rooms/{slug}. Owner shows the nickname only (null until the owner signs up). */
    public record RoomResponse(String slug, Owner owner, boolean isMine, int size, Limits limits,
            @JsonRawValue String layout, Visits visits, OffsetDateTime updatedAt) {

        public record Owner(String nickname) {}
        public record Limits(int pieces, int wallSlotsPerWall) {}
        public record Visits(int today, int total) {}
    }

    private final RoomService rooms;
    private final UserService users;

    public RoomController(RoomService rooms, UserService users) {
        this.rooms = rooms;
        this.users = users;
    }

    /** Public, for the invite screen before login ("○○님의 미니룸에 초대받았어요"): the owner's nickname only. */
    public record InviteResponse(String nickname) {}

    @GetMapping("/api/rooms/{slug}/invite")
    public InviteResponse invite(@PathVariable String slug) {
        return new InviteResponse(users.nicknameOf(rooms.bySlug(slug).getOwnerId()));
    }

    /** Login is enough to look (the signup form sits over the room); writes need a finished signup. */
    @GetMapping("/api/rooms/{slug}")
    public RoomResponse room(@AuthenticationPrincipal OAuth2User principal, @PathVariable String slug) {
        User me = users.account(principal.getName());
        return response(rooms.bySlug(slug), me);
    }

    /** Body: the layout itself. The server checks all of it and stores a rebuilt copy, or rejects all of it. */
    @PutMapping(path = "/api/rooms/me/layout", consumes = MediaType.APPLICATION_JSON_VALUE)
    public RoomResponse saveLayout(@AuthenticationPrincipal OAuth2User principal, @RequestBody String body) {
        User me = users.requireSignedUp(principal.getName());
        return response(rooms.saveLayout(me.getId(), body), me);
    }

    private RoomResponse response(Room room, User me) {
        boolean mine = room.getOwnerId().equals(me.getId());
        String owner = mine ? me.getNickname() : users.nicknameOf(room.getOwnerId());
        return new RoomResponse(room.getSlug(), new RoomResponse.Owner(owner), mine, room.getSize(),
                new RoomResponse.Limits(room.pieceLimit(), room.wallSlotsPerWall()), room.getLayout(),
                // Visits are recorded from week 4 (docs/erd.md room_daily_visits)
                new RoomResponse.Visits(0, 0), room.getUpdatedAt().atZone(KST).toOffsetDateTime());
    }
}
