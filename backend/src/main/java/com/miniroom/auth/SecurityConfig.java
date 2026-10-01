package com.miniroom.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;

@Configuration
public class SecurityConfig {

    private static final RequestMatcher API = request -> request.getRequestURI().startsWith("/api/");

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, GoogleLoginSuccess loginSuccess,
            @Value("${app.frontend-url}") String frontendUrl) throws Exception {
        http
                // Don't save the request on 401: otherwise every anonymous /api/me call creates a session row
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(API).authenticated()
                        .anyRequest().permitAll())
                // The SPA calls /api with fetch: answer 401 instead of redirecting to a login page
                .exceptionHandling(e -> e.defaultAuthenticationEntryPointFor(
                        new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), API))
                // No Spring login page: the frontend is the login page. A cancelled or failed Google login
                // goes back to the room with ?login=failed instead of Spring's English /login?error page.
                .oauth2Login(oauth -> oauth
                        .loginPage(frontendUrl)
                        .successHandler(loginSuccess)
                        .failureHandler((request, response, e) -> response.sendRedirect(frontendUrl + "/?login=failed")))
                .logout(logout -> logout.logoutSuccessHandler(
                        new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                // XSRF-TOKEN cookie readable by JS, sent back as X-XSRF-TOKEN header
                .csrf(csrf -> csrf.spa())
                .addFilterBefore(new ReplacedSessionFilter(), SecurityContextHolderFilter.class);
        return http.build();
    }
}
