package com.miniroom.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ProblemDetail api(ApiException e) {
        return Problems.of(e.status(), e.code(), e.getMessage());
    }

    /** Not JSON, or a field of the wrong type */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ProblemDetail unreadable(HttpMessageNotReadableException e) {
        return Problems.of(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "request body is not valid JSON for this API");
    }
}
