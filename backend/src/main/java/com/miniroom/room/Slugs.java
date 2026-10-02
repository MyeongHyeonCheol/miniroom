package com.miniroom.room;

import java.security.SecureRandom;

/** Public room id: 8 random chars of [a-z0-9] (about 2.8 trillion), never the sequential database id. */
final class Slugs {

    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
    private static final int LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private Slugs() {}

    static String next() {
        var slug = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) slug.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return slug.toString();
    }
}
