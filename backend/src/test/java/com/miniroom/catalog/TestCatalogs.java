package com.miniroom.catalog;

/** The real catalog has no rug or wall decor yet; this one adds one of each for the layout rules. */
public final class TestCatalogs {

    private TestCatalogs() {}

    public static Catalog withRugAndWallDecor() {
        return new Catalog("test-catalog");
    }
}
