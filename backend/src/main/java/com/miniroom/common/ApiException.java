package com.miniroom.common;

import org.springframework.http.HttpStatus;

/** An API error with the machine-readable `code` the frontend switches on (docs/api.md "오류 형식"). */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String detail) {
        super(detail);
        this.status = status;
        this.code = code;
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
}
