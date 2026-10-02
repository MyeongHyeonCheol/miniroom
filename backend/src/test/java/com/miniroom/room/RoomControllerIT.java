package com.miniroom.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.endsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.IntegrationTest;
import com.miniroom.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.OAuth2LoginRequestPostProcessor;
import org.springframework.test.web.servlet.MockMvc;

@IntegrationTest
class RoomControllerIT {

    private static final String BED_AND_PLANT = """
            {"v":1,"floor":"carpet","wall":"skycheck","items":[\
            {"id":"bed","x":4,"y":4,"r":90},{"id":"plant_pot","x":0,"y":0,"r":0}]}""";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserService users;

    @Autowired
    JdbcTemplate jdbc;

    String mySlug;
    String friendSlug;

    @BeforeEach
    void setUp() {
        jdbc.update("delete from users");
        users.recordLogin("me", "me@example.com");
        users.recordLogin("friend", "friend@example.com");
        users.update("friend", new UserService.Update("친구", true, true, true), null);
        mySlug = users.me("me").room().getSlug();
        friendSlug = users.me("friend").room().getSlug();
    }

    private static OAuth2LoginRequestPostProcessor as(String sub) {
        return oauth2Login().attributes(a -> a.put("sub", sub));
    }

    private void signUpMe() {
        users.update("me", new UserService.Update("명현", true, true, true), null);
    }

    @Test
    void myRoomBeforeSignupIsVisibleWithTheDefaultLayout() throws Exception {
        mvc.perform(get("/api/rooms/" + mySlug).with(as("me")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(mySlug))
                .andExpect(jsonPath("$.isMine").value(true))
                .andExpect(jsonPath("$.owner.nickname").isEmpty())
                .andExpect(jsonPath("$.size").value(12))
                .andExpect(jsonPath("$.limits.pieces").value(45))
                .andExpect(jsonPath("$.limits.wallSlotsPerWall").value(3))
                .andExpect(jsonPath("$.layout.v").value(1))
                .andExpect(jsonPath("$.layout.items.length()").value(3))
                .andExpect(jsonPath("$.visits.today").value(0))
                .andExpect(jsonPath("$.updatedAt").value(endsWith("+09:00")));
    }

    @Test
    void aFriendsRoomShowsTheirNicknameOnly() throws Exception {
        mvc.perform(get("/api/rooms/" + friendSlug).with(as("me")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isMine").value(false))
                .andExpect(jsonPath("$.owner.nickname").value("친구"))
                .andExpect(jsonPath("$.owner.email").doesNotExist());
    }

    @Test
    void unknownSlugIs404() throws Exception {
        mvc.perform(get("/api/rooms/zzzzzzzz").with(as("me")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void lookingNeedsLogin() throws Exception {
        mvc.perform(get("/api/rooms/" + friendSlug))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void savingNeedsAFinishedSignup() throws Exception {
        mvc.perform(put("/api/rooms/me/layout").with(as("me")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(BED_AND_PLANT))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("SIGNUP_REQUIRED"));
    }

    @Test
    void savingNeedsCsrf() throws Exception {
        signUpMe();

        mvc.perform(put("/api/rooms/me/layout").with(as("me")).contentType(MediaType.APPLICATION_JSON).content(BED_AND_PLANT))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF"));
    }

    @Test
    void savedLayoutComesBackOnTheNextLook() throws Exception {
        signUpMe();

        mvc.perform(put("/api/rooms/me/layout").with(as("me")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(BED_AND_PLANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.layout.floor").value("carpet"))
                .andExpect(jsonPath("$.layout.backdrop").value("island"));

        mvc.perform(get("/api/rooms/" + mySlug).with(as("friend")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.nickname").value("명현"))
                .andExpect(jsonPath("$.layout.wall").value("skycheck"))
                .andExpect(jsonPath("$.layout.items[0].id").value("bed"))
                .andExpect(jsonPath("$.layout.items[0].r").value(90));
    }

    @Test
    void aRejectedLayoutNamesTheItemAndChangesNothing() throws Exception {
        signUpMe();
        String before = jdbc.queryForObject("select layout::text from rooms where slug = ?", String.class, mySlug);
        String overlapping = """
                {"v":1,"floor":"wood","wall":"ivory","items":[\
                {"id":"bed","x":0,"y":0,"r":0},{"id":"plant_pot","x":1,"y":1,"r":0}]}""";

        mvc.perform(put("/api/rooms/me/layout").with(as("me")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(overlapping))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("LAYOUT_OVERLAP"))
                .andExpect(jsonPath("$.errors[0].index").value(1))
                .andExpect(jsonPath("$.errors[0].code").value("LAYOUT_OVERLAP"));

        assertThat(jdbc.queryForObject("select layout::text from rooms where slug = ?", String.class, mySlug))
                .isEqualTo(before);
    }

    @Test
    void savingOnlyEverTouchesMyOwnRoom() throws Exception {
        signUpMe();
        String friendBefore = jdbc.queryForObject("select layout::text from rooms where slug = ?", String.class, friendSlug);

        mvc.perform(put("/api/rooms/me/layout").with(as("me")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(BED_AND_PLANT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value(mySlug));

        assertThat(jdbc.queryForObject("select layout::text from rooms where slug = ?", String.class, friendSlug))
                .isEqualTo(friendBefore);
    }
}
