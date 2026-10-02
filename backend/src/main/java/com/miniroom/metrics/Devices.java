package com.miniroom.metrics;

/** events.device from the User-Agent: the service is PC only, so mobile is worth telling apart (PRD 지표). */
final class Devices {

    private Devices() {}

    /** "mobile" for phones and tablets (iPadOS reports a Mac, which counts as pc), "pc" otherwise or unknown. */
    static String of(String userAgent) {
        if (userAgent == null) return "pc";
        return userAgent.contains("Mobi") || userAgent.contains("Android") || userAgent.contains("iPhone")
                || userAgent.contains("iPad") ? "mobile" : "pc";
    }
}
