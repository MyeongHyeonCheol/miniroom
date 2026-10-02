package com.miniroom.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.miniroom.common.ApiException;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class NicknamesTest {

    private static final String ZERO_WIDTH_SPACE = Character.toString(0x200B);
    private static final String HANGUL_FILLER = Character.toString(0x3164);

    @Test
    void trimsAndKeeps() {
        assertThat(Nicknames.normalize("  명현  ")).isEqualTo("명현");
        assertThat(Nicknames.normalize("방 꾸미는 사람")).isEqualTo("방 꾸미는 사람");
    }

    @Test
    void countsCharactersNotBytes() {
        assertThat(Nicknames.normalize("가나다라마바사아자차카타")).hasSize(12);
        String twoEmoji = Character.toString(0x1F431) + Character.toString(0x1F436); // 2 code points, 4 Java chars
        assertThat(Nicknames.normalize(twoEmoji)).isEqualTo(twoEmoji);
    }

    static Stream<String> invalid() {
        return Stream.of("", " ", "가", "   가   ", "가나다라마바사아자차카타파", "줄\n바꿈", "탭\t문자",
                "숨은" + ZERO_WIDTH_SPACE + "글자", HANGUL_FILLER + HANGUL_FILLER, HANGUL_FILLER + "명");
    }

    @ParameterizedTest
    @MethodSource("invalid")
    void rejects(String raw) {
        assertThatThrownBy(() -> Nicknames.normalize(raw))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code()).isEqualTo("NICKNAME_INVALID"));
    }

    @Test
    void rejectsMissing() {
        assertThatThrownBy(() -> Nicknames.normalize(null)).isInstanceOf(ApiException.class);
    }
}
