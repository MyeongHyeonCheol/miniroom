package com.miniroom.terms;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TermsController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    public record TermsResponse(long id, String kind, int version, String title, String body, OffsetDateTime effectiveAt) {}

    private final TermsService terms;

    public TermsController(TermsService terms) {
        this.terms = terms;
    }

    /** Public: the signup form shows these texts, and anyone may read them before logging in. */
    @GetMapping("/api/terms")
    public List<TermsResponse> current() {
        return terms.current().stream()
                .map(t -> new TermsResponse(t.id(), t.kind(), t.version(), t.title(), t.body(),
                        t.effectiveAt().atZone(KST).toOffsetDateTime()))
                .toList();
    }
}
