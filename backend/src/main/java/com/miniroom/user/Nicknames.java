package com.miniroom.user;

import com.miniroom.common.ApiException;
import org.springframework.http.HttpStatus;

/** Nickname rules (docs/api.md PATCH /api/me): trimmed, 2 to 12 characters, nothing invisible. Duplicates allowed. */
final class Nicknames {

    static final int MIN = 2;
    static final int MAX = 12;

    private Nicknames() {}

    /** The nickname to store, or 422 NICKNAME_INVALID. Length counts code points, like PostgreSQL varchar(12). */
    static String normalize(String raw) {
        if (raw == null) throw invalid("nickname is required");
        String nickname = raw.strip();
        int length = nickname.codePointCount(0, nickname.length());
        if (length < MIN || length > MAX) throw invalid("nickname must be " + MIN + " to " + MAX + " characters");
        if (nickname.codePoints().anyMatch(Nicknames::invisible)) throw invalid("nickname has an invisible character");
        return nickname;
    }

    /** Line breaks, control and format characters, and the Hangul fillers people use for "blank" names. */
    private static boolean invisible(int c) {
        int type = Character.getType(c);
        return type == Character.CONTROL || type == Character.FORMAT
                || type == Character.LINE_SEPARATOR || type == Character.PARAGRAPH_SEPARATOR
                || c == 0x115F || c == 0x1160 || c == 0x3164 || c == 0xFFA0;
    }

    private static ApiException invalid(String detail) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "NICKNAME_INVALID", detail);
    }
}
