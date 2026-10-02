package com.miniroom.metrics;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DevicesTest {

    @Test
    void phonesAndTabletsAreMobile() {
        assertThat(Devices.of("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148")).isEqualTo("mobile");
        assertThat(Devices.of("Mozilla/5.0 (Linux; Android 15; SM-S928N) Chrome/129.0 Mobile Safari/537.36")).isEqualTo("mobile");
        assertThat(Devices.of("Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/129.0 Safari/537.36")).isEqualTo("mobile");
    }

    @Test
    void desktopsAndUnknownArePc() {
        assertThat(Devices.of("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36")).isEqualTo("pc");
        assertThat(Devices.of("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605.1.15")).isEqualTo("pc");
        assertThat(Devices.of(null)).isEqualTo("pc");
    }
}
