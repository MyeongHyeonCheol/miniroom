package com.miniroom.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

/**
 * Real HTTP server, not MockMvc: MockMvc drops the attributes Spring Session writes on its cookie
 * (Max-Age, HttpOnly, SameSite), so it can't check them.
 */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("it")
class SessionCookieIT {

    @LocalServerPort
    int port;

    @Test
    void sessionCookieLastsThirtyDaysAndIsHttpOnlyLax() throws Exception {
        var client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/oauth2/authorization/google")).build();

        var response = client.send(request, HttpResponse.BodyHandlers.discarding());
        String cookie = response.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("SESSION=")).findFirst().orElse("(no SESSION cookie)");

        assertThat(cookie).contains("Max-Age=2592000").contains("HttpOnly").contains("SameSite=Lax");
    }
}
