package com.miniroom.room;

import com.miniroom.catalog.Catalog;
import com.miniroom.common.ApiException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Checks a whole layout before it is saved (docs/api.md PUT /api/rooms/me/layout). Same cell rules as the
 * frontend's placement.ts: anchor = top-left cell of the rotated footprint, 90/270 swap width and depth, a rug may
 * overlap furniture but not another rug. Any error rejects the whole layout; nothing is dropped silently.
 */
@Component
public class LayoutValidator {

    /** Same budget as the database check on rooms.layout (AGENTS.md: layout JSON 10 KB). */
    public static final int MAX_BYTES = 10_240;
    static final int VERSION = 1;
    static final String DEFAULT_BACKDROP = "island";
    private static final Set<Integer> ROTATIONS = Set.of(0, 90, 180, 270);

    /** One failing item, so the editor can mark it. */
    public record ItemError(int index, String code, String detail) {}

    private final Catalog catalog;
    private final JsonMapper json = JsonMapper.builder().build();

    public LayoutValidator(Catalog catalog) {
        this.catalog = catalog;
    }

    /**
     * The layout to store, rebuilt from the checked values only (unknown fields dropped, backdrop defaulted),
     * or a 400/422 ApiException.
     */
    public String validate(String body, int roomSize) {
        if (body.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw layoutError("LAYOUT_TOO_LARGE", "layout is over " + MAX_BYTES + " bytes");
        }
        JsonNode root;
        try {
            root = json.readTree(body);
        } catch (JacksonException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_REQUEST", "layout is not valid JSON");
        }
        if (root == null || !root.isObject()) throw layoutError("LAYOUT_BAD_VALUE", "layout must be an object");
        if (!root.path("v").isInt() || root.path("v").intValue() != VERSION) {
            throw layoutError("LAYOUT_VERSION", "v must be " + VERSION);
        }

        String floor = text(root.path("floor"));
        String wall = text(root.path("wall"));
        JsonNode backdropNode = root.path("backdrop");
        String backdrop = backdropNode.isMissingNode() || backdropNode.isNull() ? DEFAULT_BACKDROP : text(backdropNode);
        if (floor == null || !catalog.isFloor(floor)) throw layoutError("LAYOUT_UNKNOWN_ID", "unknown floor");
        if (wall == null || !catalog.isWall(wall)) throw layoutError("LAYOUT_UNKNOWN_ID", "unknown wall");
        if (backdrop == null || !catalog.isBackdrop(backdrop)) throw layoutError("LAYOUT_UNKNOWN_ID", "unknown backdrop");

        JsonNode items = root.path("items");
        if (!items.isArray()) throw layoutError("LAYOUT_BAD_VALUE", "items must be an array");
        int limit = Room.pieceLimitFor(roomSize);
        if (items.size() > limit) {
            throw layoutError("LAYOUT_TOO_MANY", items.size() + " pieces, the room allows " + limit);
        }

        ObjectNode out = json.createObjectNode();
        out.put("v", VERSION).put("floor", floor).put("wall", wall).put("backdrop", backdrop);
        ArrayNode outItems = out.putArray("items");
        List<ItemError> errors = new ArrayList<>();
        Map<String, Integer> furnitureCells = new HashMap<>(); // "x,y" -> item index
        Map<String, Integer> rugCells = new HashMap<>();
        Map<Integer, Integer> slots = new HashMap<>(); // wall slot -> item index

        for (int i = 0; i < items.size(); i++) {
            ItemError error = checkItem(i, items.get(i), roomSize, furnitureCells, rugCells, slots, outItems);
            if (error != null) errors.add(error);
        }
        if (!errors.isEmpty()) {
            ItemError first = errors.getFirst();
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, first.code(), first.detail(), errors);
        }
        return json.writeValueAsString(out);
    }

    private ItemError checkItem(int i, JsonNode item, int roomSize, Map<String, Integer> furnitureCells,
            Map<String, Integer> rugCells, Map<Integer, Integer> slots, ArrayNode out) {
        String id = item.isObject() ? text(item.path("id")) : null;
        if (id == null) return new ItemError(i, "LAYOUT_BAD_VALUE", "items[" + i + "] needs a string id");
        var found = catalog.furniture(id);
        if (found.isEmpty()) return new ItemError(i, "LAYOUT_UNKNOWN_ID", "items[" + i + "] unknown furniture " + id);
        Catalog.Furniture piece = found.get();

        if (piece.isWallDecor()) {
            // Slot numbers never move when the room widens: size/4 per wall, 2 walls (docs/api.md GET /api/rooms)
            JsonNode slotNode = item.path("slot");
            int slotCount = roomSize / 2;
            if (!slotNode.isInt() || slotNode.intValue() < 0 || slotNode.intValue() >= slotCount) {
                return new ItemError(i, "LAYOUT_BAD_SLOT", "items[" + i + "] slot must be 0 to " + (slotCount - 1));
            }
            int slot = slotNode.intValue();
            Integer taken = slots.putIfAbsent(slot, i);
            if (taken != null) {
                return new ItemError(i, "LAYOUT_BAD_SLOT", "items[" + i + "] slot " + slot + " is used by items[" + taken + "]");
            }
            out.addObject().put("id", id).put("slot", slot);
            return null;
        }

        JsonNode xNode = item.path("x");
        JsonNode yNode = item.path("y");
        JsonNode rNode = item.path("r");
        if (!xNode.isInt() || !yNode.isInt() || !rNode.isInt() || !ROTATIONS.contains(rNode.intValue())) {
            return new ItemError(i, "LAYOUT_BAD_VALUE", "items[" + i + "] needs integer x, y and r of 0/90/180/270");
        }
        int x = xNode.intValue();
        int y = yNode.intValue();
        int r = rNode.intValue();
        boolean turned = r == 90 || r == 270;
        int w = turned ? piece.size()[1] : piece.size()[0];
        int d = turned ? piece.size()[0] : piece.size()[1];
        if (x < 0 || y < 0 || x + w > roomSize || y + d > roomSize) {
            return new ItemError(i, "LAYOUT_OUT_OF_ROOM", "items[" + i + "] is outside the " + roomSize + "x" + roomSize + " room");
        }

        Map<String, Integer> layer = piece.isRug() ? rugCells : furnitureCells;
        List<String> cells = new ArrayList<>(w * d);
        for (int dx = 0; dx < w; dx++) {
            for (int dy = 0; dy < d; dy++) {
                String cell = (x + dx) + "," + (y + dy);
                Integer other = layer.get(cell);
                if (other != null) {
                    return new ItemError(i, "LAYOUT_OVERLAP", "items[" + i + "] overlaps items[" + other + "]");
                }
                cells.add(cell);
            }
        }
        cells.forEach(c -> layer.put(c, i));
        out.addObject().put("id", id).put("x", x).put("y", y).put("r", r);
        return null;
    }

    private static String text(JsonNode node) {
        return node.isString() ? node.stringValue() : null;
    }

    private static ApiException layoutError(String code, String detail) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, code, detail);
    }
}
