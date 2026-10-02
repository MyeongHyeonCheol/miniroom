package com.miniroom.terms;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Puts the texts in resources/terms into the terms table at startup, after Flyway. A version nobody has agreed to
 * yet (a draft) follows its file; a version someone agreed to must never change, so an edited file stops startup.
 */
@Component
@DependsOnDatabaseInitialization
public class TermsSeeder implements InitializingBean {

    record Entry(String kind, int version, String title, OffsetDateTime effectiveAt, String file) {}

    private record Stored(long id, String title, String body) {}

    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final String dir;

    @Autowired
    public TermsSeeder(JdbcClient jdbc, TransactionTemplate tx) {
        this(jdbc, tx, "terms");
    }

    TermsSeeder(JdbcClient jdbc, TransactionTemplate tx, String dir) {
        this.jdbc = jdbc;
        this.tx = tx;
        this.dir = dir;
    }

    @Override
    public void afterPropertiesSet() {
        List<Entry> entries = JsonMapper.builder().build()
                .readValue(read(dir + "/index.json"), new TypeReference<List<Entry>>() {});
        tx.executeWithoutResult(s -> entries.forEach(this::seed));
    }

    private void seed(Entry e) {
        String body = read(dir + "/" + e.file()).strip();
        var stored = jdbc.sql("select id, title, body from terms where kind = :kind and version = :version")
                .param("kind", e.kind()).param("version", e.version())
                .query(Stored.class).optional();
        if (stored.isEmpty()) {
            jdbc.sql("""
                            insert into terms (kind, version, title, body, effective_at)
                            values (:kind, :version, :title, :body, :effectiveAt)
                            """)
                    .param("kind", e.kind()).param("version", e.version()).param("title", e.title())
                    .param("body", body).param("effectiveAt", Timestamp.from(e.effectiveAt().toInstant()))
                    .update();
            return;
        }
        Stored s = stored.get();
        if (s.title().equals(e.title()) && s.body().equals(body)) return;
        // V6 leaves empty placeholder rows for accounts that signed up before versions existed: fill those in
        boolean agreed = !s.body().isEmpty() && jdbc.sql("select exists (select 1 from terms_agreements where terms_id = :id)")
                .param("id", s.id()).query(Boolean.class).single();
        if (agreed) {
            throw new IllegalStateException(e.kind() + " v" + e.version() + " (" + e.file() + ") changed after users "
                    + "agreed to it. Restore the published text and add the change as a new version in terms/index.json.");
        }
        jdbc.sql("update terms set title = :title, body = :body, effective_at = :effectiveAt where id = :id")
                .param("title", e.title()).param("body", body)
                .param("effectiveAt", Timestamp.from(e.effectiveAt().toInstant())).param("id", s.id())
                .update();
    }

    private static String read(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("cannot read " + path, e);
        }
    }
}
