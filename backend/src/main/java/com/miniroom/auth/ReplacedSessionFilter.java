package com.miniroom.auth;

import com.miniroom.common.Problems;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Ends a session that a newer login replaced (see {@link SessionLimiter}). API calls get
 * 401 with code REPLACED so the frontend can say why; other paths continue logged out.
 * Runs before the security context is loaded, so the replaced login is never used.
 */
public class ReplacedSessionFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var session = request.getSession(false);
        var replacedBy = session == null ? null : session.getAttribute(SessionLimiter.REPLACED_BY);
        if (replacedBy != null && replacedBy.equals(session.getId())) {
            session.removeAttribute(SessionLimiter.REPLACED_BY); // this browser logged in again: not replaced
        } else if (replacedBy != null) {
            session.invalidate();
            if (request.getRequestURI().startsWith("/api/")) {
                Problems.write(response, HttpStatus.UNAUTHORIZED, "REPLACED", "logged in somewhere else");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
