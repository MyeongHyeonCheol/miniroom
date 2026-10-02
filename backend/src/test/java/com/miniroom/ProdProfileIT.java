package com.miniroom;

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

/** The prod profile on top of the it database: Secure session cookie, API docs closed. Real HTTP like SessionCookieIT. */
@Tag("integration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"it", "prod"})
class ProdProfileIT {

    @LocalServerPort
    int port;

    private final HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();

    private HttpResponse<Void> get(String path) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build();
        return client.send(request, HttpResponse.BodyHandlers.discarding());
    }

    @Test
    void sessionCookieIsSecure() throws Exception {
        String cookie = get("/oauth2/authorization/google").headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("SESSION=")).findFirst().orElse("(no SESSION cookie)");

        assertThat(cookie).contains("Secure").contains("HttpOnly").contains("SameSite=Lax");
    }

    @Test
    void apiDocsAndSwaggerAreClosed() throws Exception {
        assertThat(get("/v3/api-docs").statusCode()).isEqualTo(404);
        assertThat(get("/swagger-ui/index.html").statusCode()).isEqualTo(404);
    }
}
