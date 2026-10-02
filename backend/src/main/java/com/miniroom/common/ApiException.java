package com.miniroom.common;

import java.util.List;
import org.springframework.http.HttpStatus;

/** An API error with the machine-readable `code` the frontend switches on (docs/api.md "오류 형식"). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<?> errors;

    public ApiException(HttpStatus status, String code, String detail) {
        this(status, code, detail, List.of());
    }

    /** errors: one entry per failing part, e.g. which layout items (sent as `errors` in the body). */
    public ApiException(HttpStatus status, String code, String detail, List<?> errors) {
        super(detail);
        this.status = status;
        this.code = code;
        this.errors = List.copyOf(errors);
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public List<?> errors() { return errors; }
}
