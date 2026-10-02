package com.miniroom.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.miniroom.catalog.Catalog;
import com.miniroom.catalog.TestCatalogs;
import com.miniroom.common.ApiException;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class LayoutValidatorTest {

    private final LayoutValidator validator = new LayoutValidator(TestCatalogs.withRugAndWallDecor());

    private static String layout(String... items) {
        return "{\"v\":1,\"floor\":\"wood\",\"wall\":\"ivory\",\"backdrop\":\"island\",\"items\":["
                + String.join(",", items) + "]}";
    }

    private static String piece(String id, int x, int y, int r) {
        return "{\"id\":\"" + id + "\",\"x\":" + x + ",\"y\":" + y + ",\"r\":" + r + "}";
    }

    private static String wallDecor(int slot) {
        return "{\"id\":\"poster_cat\",\"slot\":" + slot + "}";
    }

    private ApiException rejected(String body, int size) {
        try {
            validator.validate(body, size);
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("expected the layout to be rejected: " + body);
    }

    private List<Integer> failingIndexes(ApiException e) {
        return e.errors().stream().map(o -> ((LayoutValidator.ItemError) o).index()).toList();
    }

    @Test
    void theDefaultFirstRoomIsValidAgainstTheRealCatalog() {
        var real = new LayoutValidator(new Catalog());

        assertThat(real.validate(RoomService.DEFAULT_LAYOUT, 12)).isEqualTo(RoomService.DEFAULT_LAYOUT);
    }

    @Test
    void storesARebuiltCopyWithoutUnknownFieldsAndWithTheDefaultBackdrop() {
        String body = "{\"v\":1,\"floor\":\"check\",\"wall\":\"strawberry\",\"extra\":\"x\",\"items\":["
                + "{\"id\":\"bed\",\"x\":0,\"y\":0,\"r\":0,\"color\":\"red\"},{\"id\":\"poster_cat\",\"slot\":2,\"x\":5}]}";

        assertThat(validator.validate(body, 12)).isEqualTo("{\"v\":1,\"floor\":\"check\",\"wall\":\"strawberry\","
                + "\"backdrop\":\"island\",\"items\":[{\"id\":\"bed\",\"x\":0,\"y\":0,\"r\":0},"
                + "{\"id\":\"poster_cat\",\"slot\":2}]}");
    }

    @Test
    void rotationSwapsWidthAndDepthLikeTheFrontend() {
        // computer_desk is 3 wide, 2 deep: at 90 it takes 2 columns and 3 rows
        validator.validate(layout(piece("computer_desk", 10, 9, 90)), 12);
        assertThat(rejected(layout(piece("computer_desk", 10, 0, 0)), 12).code()).isEqualTo("LAYOUT_OUT_OF_ROOM");
        assertThat(rejected(layout(piece("computer_desk", 10, 10, 270)), 12).code()).isEqualTo("LAYOUT_OUT_OF_ROOM");
    }

    @Test
    void theRoomSizeComesFromTheRoom() {
        String farCorner = layout(piece("plant_pot", 15, 15, 0));

        assertThat(rejected(farCorner, 12).code()).isEqualTo("LAYOUT_OUT_OF_ROOM");
        validator.validate(farCorner, 16);
    }

    @Test
    void negativeCellsAreOutside() {
        assertThat(rejected(layout(piece("plant_pot", -1, 0, 0)), 12).code()).isEqualTo("LAYOUT_OUT_OF_ROOM");
    }

    @Test
    void furnitureCannotShareACell() {
        ApiException e = rejected(layout(piece("bed", 0, 0, 0), piece("plant_pot", 1, 3, 0)), 12);

        assertThat(e.status()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(e.code()).isEqualTo("LAYOUT_OVERLAP");
        assertThat(e.getMessage()).isEqualTo("items[1] overlaps items[0]");
        assertThat(failingIndexes(e)).containsExactly(1);
    }

    @Test
    void aRugMayLieUnderFurnitureButNotOnAnotherRug() {
        validator.validate(layout(piece("rug_round", 0, 0, 0), piece("bed", 0, 0, 0), piece("plant_pot", 2, 2, 0)), 12);

        ApiException e = rejected(layout(piece("rug_round", 0, 0, 0), piece("rug_round", 2, 2, 0)), 12);
        assertThat(e.code()).isEqualTo("LAYOUT_OVERLAP");
        assertThat(failingIndexes(e)).containsExactly(1);
    }

    @Test
    void reportsEveryFailingItemAndTheFirstCodeOnTop() {
        ApiException e = rejected(layout(
                piece("plant_pot", 0, 0, 0),
                piece("sofa", 1, 1, 0),
                piece("plant_pot", 0, 0, 0),
                piece("plant_pot", 3, 3, 45)), 12);

        assertThat(e.code()).isEqualTo("LAYOUT_UNKNOWN_ID");
        assertThat(failingIndexes(e)).containsExactly(1, 2, 3);
        assertThat(e.errors()).extracting(o -> ((LayoutValidator.ItemError) o).code())
                .containsExactly("LAYOUT_UNKNOWN_ID", "LAYOUT_OVERLAP", "LAYOUT_BAD_VALUE");
    }

    @Test
    void cellsMustBeWholeNumbers() {
        assertThat(rejected(layout("{\"id\":\"plant_pot\",\"x\":1.5,\"y\":0,\"r\":0}"), 12).code())
                .isEqualTo("LAYOUT_BAD_VALUE");
        assertThat(rejected(layout("{\"id\":\"plant_pot\",\"x\":\"1\",\"y\":0,\"r\":0}"), 12).code())
                .isEqualTo("LAYOUT_BAD_VALUE");
        assertThat(rejected(layout("{\"id\":\"plant_pot\",\"y\":0,\"r\":0}"), 12).code()).isEqualTo("LAYOUT_BAD_VALUE");
        assertThat(rejected(layout("\"plant_pot\""), 12).code()).isEqualTo("LAYOUT_BAD_VALUE");
    }

    @Test
    void pieceLimitDependsOnRoomSizeAndCountsWallDecor() {
        String full12 = layout(IntStream.range(0, 45).mapToObj(i -> piece("plant_pot", i % 12, i / 12, 0))
                .toArray(String[]::new));
        validator.validate(full12, 12);

        String over12 = full12.replace("]}", "," + wallDecor(0) + "]}");
        ApiException e = rejected(over12, 12);
        assertThat(e.code()).isEqualTo("LAYOUT_TOO_MANY");
        validator.validate(over12, 16);
    }

    @Test
    void wallSlotsFollowTheRoomSize() {
        validator.validate(layout(wallDecor(0), wallDecor(5)), 12);
        assertThat(rejected(layout(wallDecor(6)), 12).code()).isEqualTo("LAYOUT_BAD_SLOT");
        validator.validate(layout(wallDecor(7)), 16);
        validator.validate(layout(wallDecor(11)), 24);
        assertThat(rejected(layout(wallDecor(-1)), 24).code()).isEqualTo("LAYOUT_BAD_SLOT");
    }

    @Test
    void twoDecorsCannotShareASlot() {
        ApiException e = rejected(layout(wallDecor(2), wallDecor(2)), 12);

        assertThat(e.code()).isEqualTo("LAYOUT_BAD_SLOT");
        assertThat(failingIndexes(e)).containsExactly(1);
    }

    @Test
    void wholeLayoutChecks() {
        assertThat(rejected("{\"v\":2,\"floor\":\"wood\",\"wall\":\"ivory\",\"items\":[]}", 12).code())
                .isEqualTo("LAYOUT_VERSION");
        assertThat(rejected("{\"floor\":\"wood\",\"wall\":\"ivory\",\"items\":[]}", 12).code())
                .isEqualTo("LAYOUT_VERSION");
        assertThat(rejected("{\"v\":1,\"floor\":\"marble\",\"wall\":\"ivory\",\"items\":[]}", 12).code())
                .isEqualTo("LAYOUT_UNKNOWN_ID");
        assertThat(rejected("{\"v\":1,\"floor\":\"wood\",\"items\":[]}", 12).code()).isEqualTo("LAYOUT_UNKNOWN_ID");
        assertThat(rejected("{\"v\":1,\"floor\":\"wood\",\"wall\":\"ivory\",\"backdrop\":\"moon\",\"items\":[]}", 12)
                .code()).isEqualTo("LAYOUT_UNKNOWN_ID");
        assertThat(rejected("{\"v\":1,\"floor\":\"wood\",\"wall\":\"ivory\"}", 12).code()).isEqualTo("LAYOUT_BAD_VALUE");
        assertThat(rejected("[]", 12).code()).isEqualTo("LAYOUT_BAD_VALUE");
    }

    @Test
    void tooLargeIsCheckedOnTheRawBytes() {
        String padded = layout().replace("\"items\"", "\"pad\":\"" + "가".repeat(3_500) + "\",\"items\"");

        assertThat(rejected(padded, 12).code()).isEqualTo("LAYOUT_TOO_LARGE"); // 3 bytes per Hangul syllable
    }

    @Test
    void notJsonIs400() {
        assertThatThrownBy(() -> validator.validate("{nope", 12))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(e.code()).isEqualTo("BAD_REQUEST");
                });
    }
}
