package com.miniroom.room;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class SlugsTest {

    @Test
    void eightLowercaseLettersOrDigits() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            String slug = Slugs.next();
            assertThat(slug).matches("[a-z0-9]{8}");
            seen.add(slug);
        }
        assertThat(seen).hasSize(1000);
    }
}
