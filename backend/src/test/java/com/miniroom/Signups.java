package com.miniroom;

import com.miniroom.terms.TermsService;
import com.miniroom.user.UserService;

/** A complete first signup: 14+ confirmed and every terms version in force agreed to. */
public final class Signups {

    private Signups() {}

    public static UserService.Update signup(TermsService terms, String nickname) {
        return new UserService.Update(nickname, true, terms.current().stream().map(TermsService.Terms::id).toList());
    }
}
