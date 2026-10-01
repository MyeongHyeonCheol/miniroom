package com.miniroom.auth;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * One login per account: when someone logs in, their other sessions are marked replaced.
 * {@link ReplacedSessionFilter} ends a marked session on its next request.
 *
 * <p>The mark holds the id of the session that replaced it. At login Spring has already rotated the current
 * session id in memory, but its row still has the old id, so a browser logging in again finds its own row here
 * and marks it too. Storing the new id lets the filter tell "replaced by me" (ignore) from "replaced by another".
 */
@Component
public class SessionLimiter {

    static final String REPLACED_BY = "miniroom.replacedBy";

    private final FindByIndexNameSessionRepository<? extends Session> sessions;

    public SessionLimiter(FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.sessions = sessions;
    }

    /** principalName is the Google "sub" (Spring's name for an OAuth2 login). */
    public void keepOnly(String principalName, String currentSessionId) {
        markOthers(sessions, principalName, currentSessionId);
    }

    private <S extends Session> void markOthers(FindByIndexNameSessionRepository<S> repo, String principalName,
            String currentSessionId) {
        repo.findByPrincipalName(principalName).forEach((id, session) -> {
            if (id.equals(currentSessionId)) return;
            session.setAttribute(REPLACED_BY, currentSessionId);
            repo.save(session);
        });
    }
}
