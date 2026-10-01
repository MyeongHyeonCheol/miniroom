package com.miniroom.user;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.miniroom.auth.GoogleLoginSuccess;
import com.miniroom.auth.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
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

    @Test
    void meWithoutLoginIs401NotARedirect() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Location"));
    }

    @Test
    void meWithLoginReturnsEmail() throws Exception {
        mvc.perform(get("/api/me").with(oauth2Login().attributes(a -> a.put("email", "me@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@example.com"));
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
