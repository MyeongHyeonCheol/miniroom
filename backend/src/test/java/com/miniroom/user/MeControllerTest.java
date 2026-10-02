package com.miniroom.user;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.auth.GoogleLoginSuccess;
import com.miniroom.auth.SecurityConfig;
import com.miniroom.common.ApiException;
import com.miniroom.room.Room;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MeController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "spring.security.oauth2.client.registration.google.client-id=test-id",
        "spring.security.oauth2.client.registration.google.client-secret=test-secret",
})
class MeControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    GoogleLoginSuccess loginSuccess;

    @MockitoBean
    UserService users;

    private static UserService.Me meOf(String nickname, String slug) {
        User user = new User("s1", "me@example.com", Instant.EPOCH);
        if (nickname != null) user.signUp(nickname, Instant.EPOCH);
        Room room = mock(Room.class);
        when(room.getSlug()).thenReturn(slug);
        return new UserService.Me(user, room);
    }

    @Test
    void meWithoutLoginIs401ProblemNotARedirect() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void meBeforeSignupHasRoomButNoNicknameAndNoEmail() throws Exception {
        var me = meOf(null, "k3x9m2qa"); // built first: Mockito can't stub the room inside another when()
        when(users.me("s1")).thenReturn(me);

        mvc.perform(get("/api/me").with(oauth2Login().attributes(a -> a.put("sub", "s1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").isEmpty())
                .andExpect(jsonPath("$.needsSignup").value(true))
                .andExpect(jsonPath("$.mySlug").value("k3x9m2qa"))
                .andExpect(jsonPath("$.newGuestbookCount").value(0))
                .andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test
    void signupReturnsTheNewMe() throws Exception {
        var me = meOf("명현", "k3x9m2qa");
        when(users.update(eq("s1"), any())).thenReturn(me);

        mvc.perform(patch("/api/me").with(oauth2Login().attributes(a -> a.put("sub", "s1")))
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"명현\",\"ageConfirmed\":true,\"termsAgreed\":true,\"privacyAgreed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("명현"))
                .andExpect(jsonPath("$.needsSignup").value(false));
    }

    @Test
    void validationErrorIsProblemWithCode() throws Exception {
        when(users.update(eq("s1"), any()))
                .thenThrow(new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "NICKNAME_INVALID", "too short"));

        mvc.perform(patch("/api/me").with(oauth2Login().attributes(a -> a.put("sub", "s1")))
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"a\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("NICKNAME_INVALID"))
                .andExpect(jsonPath("$.detail").value("too short"));
    }

    @Test
    void notJsonIs400() throws Exception {
        mvc.perform(patch("/api/me").with(oauth2Login()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void apiWriteWithoutCsrfIs403Csrf() throws Exception {
        mvc.perform(patch("/api/me").with(oauth2Login()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF"));
    }

    @Test
    void googleLoginStartRedirectsToGoogle() throws Exception {
        mvc.perform(get("/oauth2/authorization/google"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", containsString("accounts.google.com")));
    }

    @Test
    void cancelledGoogleLoginGoesBackToFrontendNotSpringLoginPage() throws Exception {
        mvc.perform(get("/login/oauth2/code/google").param("error", "access_denied").param("state", "x"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", "http://localhost:5173/?login=failed"));
    }

    @Test
    void springDefaultLoginPageIsNotServed() throws Exception {
        mvc.perform(get("/login")).andExpect(status().isNotFound());
    }

    @Test
    void logoutWithCsrfIs204() throws Exception {
        mvc.perform(post("/logout").with(oauth2Login()).with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void logoutWithoutCsrfIs403() throws Exception {
        mvc.perform(post("/logout").with(oauth2Login()))
                .andExpect(status().isForbidden());
    }
}
